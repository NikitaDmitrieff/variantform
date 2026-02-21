"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, Play } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AiChatProps {
  projectId: string;
}

/** Extract the first ```json ... ``` block from text and parse it. */
function extractPlan(text: string): object | null {
  const match = text.match(/```json\s*\n([\s\S]*?)```/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

export function AiChat({ projectId }: AiChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [plan, setPlan] = useState<object | null>(null);
  const [executing, setExecuting] = useState(false);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const text = input.trim();
      if (!text || streaming) return;

      const userMessage: Message = { role: "user", content: text };
      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      setInput("");
      setStreaming(true);

      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: projectId,
            messages: newMessages,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || res.statusText);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let assistantContent = "";

        // Append an empty assistant message to fill in via streaming
        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (payload === "[DONE]") break;

            try {
              const parsed = JSON.parse(payload);
              if (parsed.text) {
                assistantContent += parsed.text;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: assistantContent,
                  };
                  return updated;
                });
              }
              if (parsed.error) {
                assistantContent += `\n\n[Error: ${parsed.error}]`;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: assistantContent,
                  };
                  return updated;
                });
              }
            } catch {
              // skip malformed SSE data
            }
          }
        }

        // Check for plan in final assistant message
        const detected = extractPlan(assistantContent);
        if (detected) setPlan(detected);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Error: ${err instanceof Error ? err.message : "Something went wrong"}`,
          },
        ]);
      } finally {
        setStreaming(false);
      }
    },
    [input, streaming, messages, projectId]
  );

  async function handleExecutePlan() {
    if (!plan) return;
    setExecuting(true);
    setJobStatus("running");

    try {
      const res = await fetch("/api/ai/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId, plan }),
      });

      const data = await res.json();
      setJobStatus(data.status);

      if (data.status === "completed") {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Plan executed successfully! Your .variantform.yaml and variant directories have been created. Refresh the project overview to see the changes.",
          },
        ]);
      } else if (data.status === "failed") {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Plan execution failed: ${data.error || "Unknown error"}`,
          },
        ]);
      }
    } catch (err) {
      setJobStatus("failed");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Execution error: ${err instanceof Error ? err.message : "Unknown error"}`,
        },
      ]);
    } finally {
      setExecuting(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col">
      {/* Messages area */}
      <div
        ref={scrollRef}
        className="glass-card flex-1 space-y-4 overflow-y-auto p-4"
      >
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted">
              Describe what you want to customize per client, and the AI will
              analyze your repo and suggest a plan.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-accent/20 text-fg"
                  : "bg-white/[0.04] text-fg"
              }`}
            >
              <MessageContent content={msg.content} />
            </div>
          </div>
        ))}

        {streaming && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl bg-white/[0.04] px-4 py-2.5 text-sm text-muted">
              <Loader2 className="h-3 w-3 animate-spin" />
              Thinking...
            </div>
          </div>
        )}
      </div>

      {/* Plan execution bar */}
      {plan && !executing && jobStatus !== "completed" && (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-accent/20 bg-accent/5 px-4 py-3">
          <span className="text-xs text-fg">
            Plan detected — ready to execute
          </span>
          <button
            onClick={handleExecutePlan}
            className="btn-primary flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium"
          >
            <Play className="h-3 w-3" />
            Execute Plan
          </button>
        </div>
      )}

      {executing && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-xs text-muted">
          <Loader2 className="h-3 w-3 animate-spin" />
          Executing plan...
        </div>
      )}

      {jobStatus === "completed" && (
        <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-xs text-emerald-400">
          Plan executed successfully
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe what you want to customize..."
          className="input-field flex-1"
          disabled={streaming}
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          className="btn-primary flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium disabled:opacity-40"
        >
          <Send className="h-3 w-3" />
          Send
        </button>
      </form>
    </div>
  );
}

/** Renders message content with JSON blocks highlighted. */
function MessageContent({ content }: { content: string }) {
  // Split content around ```json blocks
  const parts = content.split(/(```json\s*\n[\s\S]*?```)/);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("```json")) {
          const code = part.replace(/```json\s*\n/, "").replace(/```$/, "");
          return (
            <pre
              key={i}
              className="my-2 overflow-x-auto rounded-lg bg-black/30 p-3 font-[family-name:var(--font-code)] text-xs text-accent"
            >
              {code}
            </pre>
          );
        }
        // Render plain text with line breaks
        return (
          <span key={i} className="whitespace-pre-wrap">
            {part}
          </span>
        );
      })}
    </>
  );
}
