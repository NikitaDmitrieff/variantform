"use client";

import { FileJson, FileText } from "lucide-react";
import type { Surface } from "@/lib/types";

interface SurfacesPanelProps {
  surfaces: Surface[];
}

export function SurfacesPanel({ surfaces }: SurfacesPanelProps) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-fg">Surfaces</h2>
        <span className="text-[11px] text-muted">from .variantform.yaml</span>
      </div>

      <div className="space-y-2">
        {surfaces.map((s) => (
          <div
            key={s.path}
            className="glass-card flex items-center gap-3 p-3"
          >
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
        ))}

        {surfaces.length === 0 && (
          <p className="py-4 text-center text-xs text-muted">
            No surfaces in .variantform.yaml
          </p>
        )}
      </div>
    </div>
  );
}
