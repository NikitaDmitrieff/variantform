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

function FlowLines({ isInView }: { isInView: boolean }) {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="flow-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1a1ab0" stopOpacity="0" />
          <stop offset="50%" stopColor="#1a1ab0" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#1a1ab0" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="flow-grad-v" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1a1ab0" stopOpacity="0" />
          <stop offset="50%" stopColor="#1a1ab0" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#1a1ab0" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Top row: card 1 -> card 2 */}
      <motion.line
        x1="33.33%" y1="25%" x2="33.33%" y2="25%"
        stroke="url(#flow-grad)"
        strokeWidth="1"
        initial={{ x2: "33.33%" }}
        animate={isInView ? { x2: "36.66%" } : {}}
        transition={{ duration: 0.6, delay: 0.8 }}
      />
      {/* Top row: card 2 -> card 3 */}
      <motion.line
        x1="63.33%" y1="25%" x2="63.33%" y2="25%"
        stroke="url(#flow-grad)"
        strokeWidth="1"
        initial={{ x2: "63.33%" }}
        animate={isInView ? { x2: "66.66%" } : {}}
        transition={{ duration: 0.6, delay: 1.0 }}
      />
      {/* Vertical: card 3 down to card 6 */}
      <motion.line
        x1="83.33%" y1="50%" x2="83.33%" y2="50%"
        stroke="url(#flow-grad-v)"
        strokeWidth="1"
        initial={{ y2: "50%" }}
        animate={isInView ? { y2: "55%" } : {}}
        transition={{ duration: 0.5, delay: 1.2 }}
      />
      {/* Bottom row: card 6 -> card 5 (reversed) */}
      <motion.line
        x1="66.66%" y1="75%" x2="66.66%" y2="75%"
        stroke="url(#flow-grad)"
        strokeWidth="1"
        initial={{ x2: "66.66%" }}
        animate={isInView ? { x2: "63.33%" } : {}}
        transition={{ duration: 0.6, delay: 1.4 }}
      />
      {/* Bottom row: card 5 -> card 4 */}
      <motion.line
        x1="36.66%" y1="75%" x2="36.66%" y2="75%"
        stroke="url(#flow-grad)"
        strokeWidth="1"
        initial={{ x2: "36.66%" }}
        animate={isInView ? { x2: "33.33%" } : {}}
        transition={{ duration: 0.6, delay: 1.6 }}
      />
    </svg>
  );
}

export function Commands() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [selected, setSelected] = useState<string | null>(null);

  // Sequence: top row L→R, then bottom row R→L (snake pattern)
  const gridOrder = [0, 1, 2, 5, 4, 3];

  const selectedCmd = commands.find((c) => c.name === selected);

  return (
    <section id="commands" className="relative py-20 overflow-hidden" ref={ref}>
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute inset-0 bg-radial-fade" />

      <div className="relative z-10 max-w-5xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="font-code text-sm font-medium text-[#1a1ab0] tracking-wider uppercase">
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

        {/* 3x2 grid with flow connectors */}
        <div className="relative">
          <FlowLines isInView={isInView} />

          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {commands.map((cmd, i) => {
              const order = gridOrder.indexOf(i);
              const isActive = selected === cmd.name;

              return (
                <motion.button
                  key={cmd.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.3 + order * 0.12 }}
                  onClick={() => setSelected(isActive ? null : cmd.name)}
                  className={`group relative rounded-[3px] border p-5 text-left transition-all duration-200 ${
                    isActive
                      ? "border-[#1a1ab0]/40 bg-[#1a1ab0]/[0.06]"
                      : "border-white/[0.06] bg-white/[0.02] hover:border-[#1a1ab0]/20 hover:bg-white/[0.04]"
                  }`}
                >
                  {/* Step number */}
                  <div className="flex items-center justify-between mb-3">
                    <motion.div
                      className="flex h-7 w-7 items-center justify-center rounded-[3px] border"
                      animate={{
                        borderColor: isActive ? "rgba(26, 26, 176, 0.4)" : "rgba(255, 255, 255, 0.08)",
                        backgroundColor: isActive ? "rgba(26, 26, 176, 0.15)" : "rgba(26, 26, 176, 0.08)",
                      }}
                      transition={{ duration: 0.2 }}
                    >
                      <span className="font-code text-[10px] font-bold text-[#1a1ab0]">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </motion.div>
                    <span className="font-code text-xs text-zinc-600 group-hover:text-zinc-400 transition-colors">
                      $
                    </span>
                  </div>

                  <h3 className="font-[helvetica] text-base font-bold text-zinc-100">
                    {cmd.name}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-500 leading-relaxed">
                    {cmd.description}
                  </p>

                  {/* Active indicator line at bottom */}
                  <motion.div
                    className="absolute bottom-0 left-4 right-4 h-px"
                    animate={{
                      background: isActive
                        ? "linear-gradient(90deg, transparent, rgba(26, 26, 176, 0.5), transparent)"
                        : "linear-gradient(90deg, transparent, transparent, transparent)",
                    }}
                    transition={{ duration: 0.3 }}
                  />
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Expanded terminal output */}
        <AnimatePresence mode="wait">
          {selectedCmd && (
            <motion.div
              key={selectedCmd.name}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="mt-6 overflow-hidden"
            >
              <div className="rounded-[3px] border border-white/[0.06] bg-[#0a0a0a] overflow-hidden">
                <div className="flex items-center gap-2 border-b border-white/[0.04] px-4 py-2.5">
                  <div className="flex gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]/60" />
                    <div className="h-2.5 w-2.5 rounded-full bg-[#febc2e]/60" />
                    <div className="h-2.5 w-2.5 rounded-full bg-[#28c840]/60" />
                  </div>
                  <span className="ml-2 font-code text-xs text-zinc-600">
                    {selectedCmd.usage}
                  </span>
                </div>
                <div className="p-4 font-code text-[13px] leading-relaxed">
                  <div className="text-zinc-500 mb-2 select-none">
                    <span className="text-[#1a1ab0]/60">$</span>{" "}
                    <span className="text-zinc-300">{selectedCmd.usage}</span>
                  </div>
                  <pre className="text-zinc-500 whitespace-pre-wrap">{selectedCmd.output}</pre>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
