"use client";

interface HealthBarProps {
  summary: {
    total_variants: number;
    healthy: number;
    warnings: number;
    errors: number;
  } | null;
  loading: boolean;
}

export function HealthBar({ summary, loading }: HealthBarProps) {
  if (loading) {
    return <div className="skeleton h-12 w-full rounded-lg" />;
  }

  if (!summary || summary.total_variants === 0) {
    return null;
  }

  const total = summary.total_variants;
  const healthyPct = (summary.healthy / total) * 100;
  const warningPct = (summary.warnings / total) * 100;
  const errorPct = (summary.errors / total) * 100;

  return (
    <div className="glass-card p-4">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-medium text-fg">Variant Health</span>
        <span className="text-muted">
          {summary.healthy}/{total} healthy
        </span>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-white/5">
        {healthyPct > 0 && (
          <div className="bg-emerald-500" style={{ width: `${healthyPct}%` }} />
        )}
        {warningPct > 0 && (
          <div className="bg-amber-500" style={{ width: `${warningPct}%` }} />
        )}
        {errorPct > 0 && (
          <div className="bg-red-500" style={{ width: `${errorPct}%` }} />
        )}
      </div>
      <div className="mt-2 flex gap-4 text-[10px] text-muted">
        <span className="flex items-center gap-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {summary.healthy} healthy
        </span>
        {summary.warnings > 0 && (
          <span className="flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
            {summary.warnings} warnings
          </span>
        )}
        {summary.errors > 0 && (
          <span className="flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
            {summary.errors} errors
          </span>
        )}
      </div>
    </div>
  );
}
