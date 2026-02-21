"use client";

interface SurfaceMapProps {
  surfaces: Array<{ path: string; format: string; strategy: string }>;
  variants: Array<{ name: string; overrides: string[] }>;
}

export function SurfaceMap({ surfaces, variants }: SurfaceMapProps) {
  if (surfaces.length === 0 || variants.length === 0) {
    return (
      <div className="glass-card p-6 text-center text-sm text-muted">
        Connect surfaces and create variants to see the customization map.
      </div>
    );
  }

  return (
    <div className="glass-card overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-white/5">
            <th className="sticky left-0 z-10 bg-[oklch(0.05_0_0)] px-3 py-2 text-left font-medium text-muted">
              Surface
            </th>
            {variants.map((v) => (
              <th key={v.name} className="px-3 py-2 text-center font-medium text-muted">
                {v.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {surfaces.map((surface) => (
            <tr key={surface.path} className="border-b border-white/5 last:border-0">
              <td className="sticky left-0 z-10 bg-[oklch(0.05_0_0)] px-3 py-2 font-mono text-fg">
                <span className="mr-2 inline-block rounded bg-white/5 px-1 py-0.5 text-[10px] text-muted">
                  {surface.format}
                </span>
                {surface.path}
              </td>
              {variants.map((v) => {
                const hasOverride = v.overrides.includes(surface.path);
                return (
                  <td key={v.name} className="px-3 py-2 text-center">
                    {hasOverride ? (
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500"
                        title="Overridden"
                      />
                    ) : (
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full bg-white/10"
                        title="Inherits base"
                      />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
