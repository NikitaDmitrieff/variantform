"use client";

import { useState } from "react";
import Link from "next/link";
import { GitBranch, Plus, Loader2 } from "lucide-react";
import type { Variant } from "@/lib/types";

interface VariantsPanelProps {
  projectId: string;
  variants: Variant[];
  onAdd: (name: string) => Promise<void>;
}

export function VariantsPanel({
  projectId,
  variants,
  onAdd,
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
        {variants.map((v) => (
          <Link
            key={v.name}
            href={`/dashboard/${projectId}/${encodeURIComponent(v.name)}`}
            className="glass-card group flex items-center justify-between p-3 transition-all"
          >
            <div className="flex items-center gap-3">
              <GitBranch className="h-4 w-4 shrink-0 text-accent" />
              <div>
                <p className="text-xs font-medium text-fg">{v.name}</p>
                <p className="mt-0.5 text-[11px] text-muted">
                  {v.override_count} overrides
                </p>
              </div>
            </div>
          </Link>
        ))}

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
