"use client";

import { useState, useCallback, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { Save, Trash2, Loader2, AlertTriangle, XCircle } from "lucide-react";
import { applyMergePatch, isObject } from "@/lib/merge";
import { validateOverride, type ValidationIssue } from "@/lib/validate";
import yaml from "js-yaml";
import type { Surface, Override } from "@/lib/types";

interface OverrideEditorProps {
  surface: Surface;
  override: Override | null;
  onSave: (surfacePath: string, content: string, sha?: string) => Promise<void>;
  onDelete: (surfacePath: string, sha: string) => Promise<void>;
}

export function OverrideEditor({
  surface,
  override,
  onSave,
  onDelete,
}: OverrideEditorProps) {
  const [content, setContent] = useState(override?.content ?? "{}");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resolved, setResolved] = useState<string>("");
  const [issues, setIssues] = useState<ValidationIssue[]>([]);

  const language = surface.format === "yaml" ? "yaml" : "json";

  // Compute resolved output and validation
  const computePreview = useCallback(
    (overrideContent: string) => {
      // Validate
      const newIssues = validateOverride(
        overrideContent,
        surface.base_content,
        surface.path,
        surface.format,
        surface.strategy
      );
      setIssues(newIssues);

      // Resolve
      try {
        const baseParsed =
          surface.format === "yaml"
            ? yaml.load(surface.base_content)
            : JSON.parse(surface.base_content);
        const overrideParsed =
          surface.format === "yaml"
            ? yaml.load(overrideContent)
            : JSON.parse(overrideContent);

        if (surface.strategy === "replace") {
          setResolved(
            surface.format === "yaml"
              ? yaml.dump(overrideParsed, { indent: 2, lineWidth: -1 })
              : JSON.stringify(overrideParsed, null, 2)
          );
        } else {
          const merged = applyMergePatch(baseParsed, overrideParsed);
          setResolved(
            surface.format === "yaml"
              ? yaml.dump(merged, { indent: 2, lineWidth: -1 })
              : JSON.stringify(merged, null, 2)
          );
        }
      } catch {
        setResolved("// Parse error — cannot compute preview");
      }
    },
    [surface]
  );

  useEffect(() => {
    computePreview(content);
  }, [content, computePreview]);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(surface.path, content, override?.sha);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!override?.sha) return;
    setDeleting(true);
    try {
      await onDelete(surface.path, override.sha);
      setContent("{}");
    } finally {
      setDeleting(false);
    }
  }

  const hasErrors = issues.some((i) => i.severity === "error");
  const hasWarnings = issues.some((i) => i.severity === "warning");

  return (
    <div className="glass-card overflow-hidden">
      {/* Surface header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-[family-name:var(--font-code)] text-xs font-medium text-fg">
            {surface.path}
          </span>
          <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-muted">
            {surface.format}
          </span>
          <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-muted">
            {surface.strategy}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {override && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="btn flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-xs text-muted transition-colors hover:border-red-500/30 hover:text-danger"
            >
              {deleting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
              Remove
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || hasErrors}
            className="btn-primary flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium"
          >
            {saving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Save className="h-3 w-3" />
            )}
            Save
          </button>
        </div>
      </div>

      {/* Editors */}
      <div className="grid lg:grid-cols-2">
        {/* Base (read-only) */}
        <div className="border-r border-white/[0.06]">
          <div className="border-b border-white/[0.06] px-4 py-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
              Base Config
            </span>
          </div>
          <Editor
            height="240px"
            language={language}
            value={surface.base_content}
            theme="vs-dark"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 12,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              padding: { top: 8 },
              renderLineHighlight: "none",
            }}
          />
        </div>

        {/* Override (editable) */}
        <div>
          <div className="border-b border-white/[0.06] px-4 py-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
              Override
            </span>
          </div>
          <Editor
            height="240px"
            language={language}
            value={content}
            theme="vs-dark"
            onChange={(v) => setContent(v ?? "{}")}
            options={{
              minimap: { enabled: false },
              fontSize: 12,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              padding: { top: 8 },
            }}
          />
        </div>
      </div>

      {/* Validation issues */}
      {issues.length > 0 && (
        <div className="border-t border-white/[0.06] px-4 py-2 space-y-1">
          {issues.map((issue, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-xs"
            >
              {issue.severity === "error" ? (
                <XCircle className="h-3 w-3 shrink-0 text-danger" />
              ) : (
                <AlertTriangle className="h-3 w-3 shrink-0 text-[#fbbf24]" />
              )}
              <span
                className={
                  issue.severity === "error" ? "text-danger" : "text-[#fbbf24]"
                }
              >
                {issue.message}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Resolved preview */}
      <div className="border-t border-white/[0.06]">
        <div className="border-b border-white/[0.06] px-4 py-2 flex items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
            Resolved Output
          </span>
          {!hasErrors && !hasWarnings && override && (
            <span className="status-badge status-valid">Valid</span>
          )}
          {hasWarnings && !hasErrors && (
            <span className="status-badge status-warning">Warnings</span>
          )}
          {hasErrors && (
            <span className="status-badge status-error">Errors</span>
          )}
        </div>
        <Editor
          height="180px"
          language={language}
          value={resolved}
          theme="vs-dark"
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 12,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 8 },
            renderLineHighlight: "none",
          }}
        />
      </div>
    </div>
  );
}
