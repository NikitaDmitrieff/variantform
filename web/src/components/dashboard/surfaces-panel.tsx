"use client";

import { useState } from "react";
import { FileJson, FileText, Trash2, Plus } from "lucide-react";
import { AddSurfaceForm } from "./add-surface-form";
import type { Surface } from "@/lib/types";

interface SurfacesPanelProps {
  surfaces: Surface[];
  onAdd: (surface: {
    path: string;
    format: "json" | "yaml";
    strategy: "merge" | "replace";
    base_content: string;
  }) => Promise<void>;
  onDelete: (id: string) => void;
}

export function SurfacesPanel({ surfaces, onAdd, onDelete }: SurfacesPanelProps) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-fg">Surfaces</h2>
        <button
          onClick={() => setShowForm(true)}
          className="btn flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-xs text-muted transition-colors hover:bg-white/[0.06] hover:text-fg"
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      </div>

      <div className="space-y-2">
        {surfaces.map((s) => (
          <div
            key={s.id}
            className="glass-card group flex items-center justify-between p-3"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              {s.format === "json" ? (
                <FileJson className="h-4 w-4 shrink-0 text-accent" />
              ) : (
                <FileText className="h-4 w-4 shrink-0 text-accent" />
              )}
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-fg font-[family-name:var(--font-code)]">
                  {s.path}
                </p>
                <p className="mt-0.5 text-[11px] text-muted">
                  {s.format} &middot; {s.strategy}
                </p>
              </div>
            </div>
            <button
              onClick={() => onDelete(s.id)}
              className="rounded-lg p-1.5 text-muted opacity-0 transition-all hover:bg-white/[0.06] hover:text-danger group-hover:opacity-100"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}

        {surfaces.length === 0 && !showForm && (
          <p className="py-4 text-center text-xs text-muted">
            No surfaces declared yet
          </p>
        )}

        {showForm && (
          <AddSurfaceForm
            onSubmit={async (s) => {
              await onAdd(s);
              setShowForm(false);
            }}
            onCancel={() => setShowForm(false)}
          />
        )}
      </div>
    </div>
  );
}
