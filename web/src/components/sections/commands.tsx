"use client";
import { motion, useInView } from "motion/react";
import { useRef } from "react";
import { Tabs } from "@/components/ui/tabs";

const commandTabs = [
  {
    title: "init",
    value: "init",
    content: (
      <CommandCard
        name="init"
        description="Bootstrap variantform in any project. Creates the config file and variants directory."
        usage="npx variantform init"
        output={`✓ Created .variantform.yaml
✓ Created variants/ directory

Ready! Edit .variantform.yaml to declare
your config surfaces.`}
      />
    ),
  },
  {
    title: "create",
    value: "create",
    content: (
      <CommandCard
        name="create"
        description="Scaffold a new client variant. Creates the directory structure for per-client overrides."
        usage="npx variantform create <name>"
        output={`$ npx variantform create acme
✓ Created variant: acme

Add override files to variants/acme/
matching your declared surfaces.`}
      />
    ),
  },
  {
    title: "resolve",
    value: "resolve",
    content: (
      <CommandCard
        name="resolve"
        description="Merge base configs with variant overrides using RFC 7396 JSON Merge Patch. Deterministic output."
        usage="npx variantform resolve <variant>"
        output={`$ npx variantform resolve acme
✓ Resolved 3 files for variant acme
  → config/features.json
  → config/theme.json
  → config/branding.yaml`}
      />
    ),
  },
  {
    title: "status",
    value: "status",
    content: (
      <CommandCard
        name="status"
        description="See all variants at a glance — how many overrides each has, and whether any have undeclared files."
        usage="npx variantform status"
        output={`Variant     Overrides  Undeclared
─────────   ─────────  ──────────
acme        3          0
globex      2          1 ⚠
initech     4          0`}
      />
    ),
  },
  {
    title: "diff",
    value: "diff",
    content: (
      <CommandCard
        name="diff"
        description="See exactly which keys a variant overrides from each base config. Surgical visibility into differences."
        usage="npx variantform diff <variant>"
        output={`$ npx variantform diff acme

config/features.json:
  + dark_mode: false → true
  + max_users: 100 → 500
  + custom_branding: false → true`}
      />
    ),
  },
  {
    title: "validate",
    value: "validate",
    content: (
      <CommandCard
        name="validate"
        description="Catch stale keys, invalid overrides, and schema mismatches before they reach production."
        usage="npx variantform validate"
        output={`$ npx variantform validate
Validating 3 variants...

⚠ globex: stale key "old_feature" in
  config/features.json (not in base)
✓ acme: all overrides valid
✓ initech: all overrides valid

1 warning, 0 errors`}
      />
    ),
  },
];

function CommandCard({
  name,
  description,
  usage,
  output,
}: {
  name: string;
  description: string;
  usage: string;
  output: string;
}) {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-white/[0.06] bg-zinc-950 p-1">
      <div className="rounded-xl bg-gradient-to-br from-zinc-900 to-black p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/20">
            <span className="font-code text-sm font-bold text-cyan-400">$</span>
          </div>
          <h3 className="font-display text-xl font-bold text-white">
            {name}
          </h3>
        </div>
        <p className="text-sm text-zinc-400 leading-relaxed mb-6 max-w-lg">
          {description}
        </p>
        <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-[#0a0a0a]">
          <div className="flex items-center gap-2 border-b border-white/[0.04] px-4 py-2.5">
            <div className="flex gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]/60" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#febc2e]/60" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#28c840]/60" />
            </div>
          </div>
          <div className="p-4 font-code text-[13px] leading-relaxed">
            <div className="text-zinc-500 mb-2 select-none">
              <span className="text-cyan-400/60">$</span>{" "}
              <span className="text-zinc-300">{usage}</span>
            </div>
            <pre className="text-zinc-500 whitespace-pre-wrap">{output}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Commands() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="commands" className="relative py-32 overflow-hidden" ref={ref}>
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute inset-0 bg-radial-fade" />

      <div className="relative z-10 max-w-5xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="font-code text-sm font-medium text-cyan-400/80 tracking-wider uppercase">
            CLI Reference
          </span>
          <h2 className="mt-4 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            Six commands.{" "}
            <span className="text-zinc-500">Zero config.</span>
          </h2>
          <p className="mt-4 text-lg text-zinc-500 max-w-lg mx-auto">
            Everything you need to manage per-client configuration — nothing you don&apos;t.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="[perspective:1000px] relative flex flex-col mx-auto w-full items-start justify-start"
        >
          <Tabs
            tabs={commandTabs}
            tabClassName="text-sm font-code"
            activeTabClassName="bg-zinc-800/80"
            contentClassName="mt-8"
          />
        </motion.div>
      </div>
    </section>
  );
}
