"use client";

import { useState } from "react";
import Link from "next/link";
import { GitBranch, Trash2, Plus, Loader2 } from "lucide-react";
import type { Variant } from "@/lib/types";
import type { ValidationIssue } from "@/lib/validate";

interface VariantsPanelProps {
  projectId: string;
  variants: Variant[];
  validationMap: Record<string, ValidationIssue[]>;
  onAdd: (name: string) => Promise<void>;
  onDelete: (id: string) => void;
}

export function VariantsPanel({
  projectId,
  variants,
  validationMap,
  onAdd,
  onDelete,
}: VariantsPanelProps) {
  const [showInput, setShowInput] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await onAdd(name.trim());
      setName("");
      setShowInput(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-fg">Variants</h2>
        <button
          onClick={() => setShowInput(true)}
          className="btn flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-xs text-muted transition-colors hover:bg-white/[0.06] hover:text-fg"
        >
          <Plus className="h-3 w-3" />
          Create
        </button>
      </div>

      <div className="space-y-2">
        {variants.map((v) => {
          const issues = validationMap[v.id] ?? [];
          const errors = issues.filter((i) => i.severity === "error").length;
          const warnings = issues.filter((i) => i.severity === "warning").length;

          return (
            <Link
              key={v.id}
              href={`/dashboard/${projectId}/${v.id}`}
              className="glass-card group flex items-center justify-between p-3 transition-all"
            >
              <div className="flex items-center gap-3">
                <GitBranch className="h-4 w-4 shrink-0 text-accent" />
                <div>
                  <p className="text-xs font-medium text-fg">{v.name}</p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {v.override_count ?? 0} overrides
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Validation badge */}
                {errors > 0 ? (
                  <span className="status-badge status-error">{errors} errors</span>
                ) : warnings > 0 ? (
                  <span className="status-badge status-warning">
                    {warnings} warnings
                  </span>
                ) : issues.length === 0 && (v.override_count ?? 0) > 0 ? (
                  <span className="status-badge status-valid">Valid</span>
                ) : null}

                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete(v.id);
                  }}
                  className="rounded-lg p-1.5 text-muted opacity-0 transition-all hover:bg-white/[0.06] hover:text-danger group-hover:opacity-100"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </Link>
          );
        })}

        {variants.length === 0 && !showInput && (
          <p className="py-4 text-center text-xs text-muted">
            No variants created yet
          </p>
        )}

        {showInput && (
          <form onSubmit={handleCreate} className="glass-card flex items-center gap-2 p-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="acme"
              className="input-field flex-1"
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="btn-primary flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium"
            >
              {loading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                "Create"
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowInput(false);
                setName("");
              }}
              className="rounded-lg p-1.5 text-muted hover:text-fg"
            >
              &times;
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
