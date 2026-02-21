"use client";
import { motion, useInView, AnimatePresence } from "motion/react";
import { useRef, useState } from "react";

const commands = [
  {
    name: "init",
    description: "Bootstrap variantform in any project.",
    usage: "npx variantform init",
    output: `\u2713 Created .variantform.yaml
\u2713 Created variants/ directory

Ready! Edit .variantform.yaml to declare
your config surfaces.`,
  },
  {
    name: "create",
    description: "Scaffold a new client variant.",
    usage: "npx variantform create <name>",
    output: `$ npx variantform create acme
\u2713 Created variant: acme

Add override files to variants/acme/
matching your declared surfaces.`,
  },
  {
    name: "resolve",
    description: "Merge base configs with variant overrides. Deterministic output.",
    usage: "npx variantform resolve <variant>",
    output: `$ npx variantform resolve acme
\u2713 Resolved 3 files for variant acme
  \u2192 config/features.json
  \u2192 config/theme.json
  \u2192 config/branding.yaml`,
  },
  {
    name: "status",
    description: "See all variants at a glance.",
    usage: "npx variantform status",
    output: `Variant     Overrides  Undeclared
\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500   \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
acme        3          0
globex      2          1 \u26a0
initech     4          0`,
  },
  {
    name: "diff",
    description: "See exactly which keys a variant overrides.",
    usage: "npx variantform diff <variant>",
    output: `$ npx variantform diff acme

config/features.json:
  + dark_mode: false \u2192 true
  + max_users: 100 \u2192 500
  + custom_branding: false \u2192 true`,
  },
  {
    name: "validate",
    description: "Catch stale keys and schema mismatches.",
    usage: "npx variantform validate",
    output: `$ npx variantform validate
Validating 3 variants...

\u26a0 globex: stale key "old_feature" in
  config/features.json (not in base)
\u2713 acme: all overrides valid
\u2713 initech: all overrides valid

1 warning, 0 errors`,
  },
];

export function Commands() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [expanded, setExpanded] = useState<string | null>("init");

  return (
    <section id="commands" className="relative py-32 overflow-hidden" ref={ref}>
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute inset-0 bg-radial-fade" />

      <div className="relative z-10 max-w-3xl mx-auto px-4">
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
            Everything you need &mdash; nothing you don&apos;t.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="space-y-2"
        >
          {commands.map((cmd) => {
            const isOpen = expanded === cmd.name;
            return (
              <div
                key={cmd.name}
                className="rounded-[3px] border border-white/[0.06] bg-white/[0.02] overflow-hidden transition-colors hover:border-white/[0.1]"
              >
                <button
                  onClick={() => setExpanded(isOpen ? null : cmd.name)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[3px] bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/20">
                    <span className="font-code text-xs font-bold text-cyan-400">$</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-display text-sm font-bold text-zinc-100">
                      {cmd.name}
                    </span>
                    <span className="ml-3 text-sm text-zinc-600">
                      {cmd.description}
                    </span>
                  </div>
                  <motion.svg
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="h-4 w-4 shrink-0 text-zinc-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </motion.svg>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5">
                        <div className="rounded-[3px] border border-white/[0.06] bg-[#0a0a0a] overflow-hidden">
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
                              <span className="text-zinc-300">{cmd.usage}</span>
                            </div>
                            <pre className="text-zinc-500 whitespace-pre-wrap">{cmd.output}</pre>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
