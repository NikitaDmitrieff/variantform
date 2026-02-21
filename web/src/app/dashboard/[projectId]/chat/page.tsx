"use client";

import { useParams } from "next/navigation";
import { AiChat } from "@/components/dashboard/ai-chat";

export default function ChatPage() {
  const { projectId } = useParams<{ projectId: string }>();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-lg font-medium text-fg">AI Setup Assistant</h1>
      <p className="mb-6 text-xs text-muted">
        Describe what you want to customize per client. The AI will analyze your
        repo and produce a configuration plan you can execute with one click.
      </p>
      <AiChat projectId={projectId} />
    </div>
  );
}
