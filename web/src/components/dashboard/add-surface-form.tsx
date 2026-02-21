"use client";

import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";

interface AddSurfaceFormProps {
  onSubmit: (surface: {
    path: string;
    format: "json" | "yaml";
    strategy: "merge" | "replace";
    base_content: string;
  }) => Promise<void>;
  onCancel: () => void;
}

export function AddSurfaceForm({ onSubmit, onCancel }: AddSurfaceFormProps) {
  const [path, setPath] = useState("");
  const [format, setFormat] = useState<"json" | "yaml">("json");
  const [strategy, setStrategy] = useState<"merge" | "replace">("merge");
  const [baseContent, setBaseContent] = useState("{}");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!path.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await onSubmit({ path: path.trim(), format, strategy, base_content: baseContent });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add surface");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-fg">Add Surface</h3>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg p-1 text-muted hover:text-fg"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <input
        type="text"
        value={path}
        onChange={(e) => setPath(e.target.value)}
        placeholder="config/features.json"
        className="input-field"
        autoFocus
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[11px] text-muted">Format</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as "json" | "yaml")}
            className="input-field"
          >
            <option value="json">JSON</option>
            <option value="yaml">YAML</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-muted">Strategy</label>
          <select
            value={strategy}
            onChange={(e) => setStrategy(e.target.value as "merge" | "replace")}
            className="input-field"
          >
            <option value="merge">Merge</option>
            <option value="replace">Replace</option>
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[11px] text-muted">
          Base content
        </label>
        <textarea
          value={baseContent}
          onChange={(e) => setBaseContent(e.target.value)}
          rows={4}
          className="input-field h-auto py-2 font-[family-name:var(--font-code)] text-xs leading-relaxed"
        />
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      <button
        type="submit"
        disabled={loading || !path.trim()}
        className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Plus className="h-3.5 w-3.5" />
        )}
        Add Surface
      </button>
    </form>
  );
}
