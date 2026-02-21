"use client";
import { Timeline } from "@/components/ui/timeline";

const codeBlock = (code: string) => (
  <pre className="mt-4 overflow-x-auto rounded-md border border-white/[0.06] bg-[#0a0a0a] p-4 font-code text-[13px] leading-relaxed">
    <code>{code}</code>
  </pre>
);

const timelineData = [
  {
    title: "Define",
    content: (
      <div>
        <h4 className="text-lg font-semibold text-zinc-100 font-display">
          Declare your config surfaces
        </h4>
        <p className="mt-2 text-sm text-zinc-500 leading-relaxed max-w-lg">
          A <code className="text-cyan-400 font-code text-xs">.variantform.yaml</code> file
          at your project root declares which config files can be customized
          and how they should be merged.
        </p>
        {codeBlock(
          `# .variantform.yaml
surfaces:
  - path: "config/features.json"
    format: json
    strategy: merge      # deep merge overrides

  - path: "config/theme.json"
    format: json
    strategy: merge

  - path: "config/branding.yaml"
    format: yaml
    strategy: replace     # full file replacement

  - path: "config/i18n/*.json"
    format: json
    strategy: merge       # glob patterns supported`
        )}
      </div>
    ),
  },
  {
    title: "Create",
    content: (
      <div>
        <h4 className="text-lg font-semibold text-zinc-100 font-display">
          Create a variant for each client
        </h4>
        <p className="mt-2 text-sm text-zinc-500 leading-relaxed max-w-lg">
          Each variant gets its own directory under{" "}
          <code className="text-cyan-400 font-code text-xs">variants/</code>.
          Only store the differences — not full copies. This is the overlay model.
        </p>
        {codeBlock(
          `$ npx variantform create acme
✓ Created variant: acme

# Only override what's different for Acme:
variants/acme/config/features.json
{
  "dark_mode": true,
  "max_users": 500,
  "custom_branding": true
}`
        )}
      </div>
    ),
  },
  {
    title: "Override",
    content: (
      <div>
        <h4 className="text-lg font-semibold text-zinc-100 font-display">
          Surgical per-client overrides
        </h4>
        <p className="mt-2 text-sm text-zinc-500 leading-relaxed max-w-lg">
          Overrides follow{" "}
          <span className="text-violet-400">RFC 7396 JSON Merge Patch</span>.
          Deep merge for objects, null to delete keys, arrays replaced entirely.
          Precise, deterministic, reviewable.
        </p>
        {codeBlock(
          `# Base: config/features.json
{
  "dark_mode": false,
  "max_users": 100,
  "custom_branding": false,
  "beta_features": ["analytics"]
}

# Override: variants/acme/config/features.json
{
  "dark_mode": true,        ← changed
  "max_users": 500,         ← changed
  "custom_branding": true   ← changed
}
# max_users, beta_features → inherited from base`
        )}
      </div>
    ),
  },
  {
    title: "Resolve",
    content: (
      <div>
        <h4 className="text-lg font-semibold text-zinc-100 font-display">
          Resolve on demand
        </h4>
        <p className="mt-2 text-sm text-zinc-500 leading-relaxed max-w-lg">
          One command produces the final merged config for any client. Deterministic,
          reproducible, and ready for your deploy pipeline. The resolved output
          contains base + all applicable overrides merged together.
        </p>
        {codeBlock(
          `$ npx variantform resolve acme
✓ Resolved 3 files for variant acme
  → config/features.json
  → config/theme.json
  → config/branding.yaml

# Output: complete, merged config
{
  "dark_mode": true,
  "max_users": 500,
  "custom_branding": true,
  "beta_features": ["analytics"]
}`
        )}
      </div>
    ),
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-zinc-950/50 to-black" />
      <div className="relative">
        <Timeline
          data={timelineData}
          title="How it works"
          description="Four steps from config chaos to overlay clarity."
        />
      </div>
    </section>
  );
}
