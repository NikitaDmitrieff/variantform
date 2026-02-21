"use client";
import { motion, useInView } from "motion/react";
import { useRef } from "react";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";

const branchesHeader = (
  <div className="flex h-full min-h-[8rem] flex-col items-center justify-center rounded-xl border border-red-500/10 bg-gradient-to-br from-red-950/30 to-black p-4">
    <div className="font-code text-xs text-red-400/60 space-y-1 text-center">
      <div>main</div>
      <div className="text-[10px] text-zinc-700">├── client-acme</div>
      <div className="text-[10px] text-zinc-700">├── client-globex</div>
      <div className="text-[10px] text-zinc-700">├── client-initech</div>
      <div className="text-[10px] text-zinc-700">├── client-hooli</div>
      <div className="text-[10px] text-red-500/40">└── 47 more...</div>
    </div>
  </div>
);

const conflictsHeader = (
  <div className="flex h-full min-h-[8rem] flex-col items-center justify-center rounded-xl border border-amber-500/10 bg-gradient-to-br from-amber-950/20 to-black p-4">
    <div className="font-code text-xs space-y-1">
      <div className="text-amber-400/60">CONFLICT (content):</div>
      <div className="text-zinc-600 text-[10px]">config/features.json</div>
      <div className="text-amber-400/40 text-[10px]">Auto-merge failed;</div>
      <div className="text-amber-400/40 text-[10px]">fix conflicts and commit</div>
    </div>
  </div>
);

const overlaysHeader = (
  <div className="flex h-full min-h-[8rem] flex-col items-center justify-center rounded-xl border border-emerald-500/10 bg-gradient-to-br from-emerald-950/20 to-black p-4">
    <div className="font-code text-xs text-emerald-400/60 space-y-1 text-center">
      <div>main</div>
      <div className="text-[10px] text-zinc-600">├── config/</div>
      <div className="text-[10px] text-zinc-600">│   └── features.json</div>
      <div className="text-[10px] text-emerald-400/40">└── variants/</div>
      <div className="text-[10px] text-emerald-400/40">&nbsp;&nbsp;&nbsp;&nbsp;├── acme/ <span className="text-zinc-700">(3 overrides)</span></div>
      <div className="text-[10px] text-emerald-400/40">&nbsp;&nbsp;&nbsp;&nbsp;└── globex/ <span className="text-zinc-700">(2 overrides)</span></div>
    </div>
  </div>
);

const mergeHeader = (
  <div className="flex h-full min-h-[8rem] flex-col items-center justify-center rounded-xl border border-cyan-500/10 bg-gradient-to-br from-cyan-950/20 to-black p-4">
    <div className="font-code text-[11px] space-y-0.5">
      <div className="text-zinc-600">base &nbsp;&nbsp;&nbsp;+ overlay &nbsp;= resolved</div>
      <div className="text-zinc-700">────────────────────────────</div>
      <div>
        <span className="text-zinc-500">false</span>
        <span className="text-zinc-700"> &nbsp;+ </span>
        <span className="text-cyan-400/60">true</span>
        <span className="text-zinc-700"> &nbsp;&nbsp;&nbsp;= </span>
        <span className="text-emerald-400/60">true</span>
      </div>
      <div>
        <span className="text-zinc-500">100</span>
        <span className="text-zinc-700"> &nbsp;&nbsp;&nbsp;+ </span>
        <span className="text-cyan-400/60">500</span>
        <span className="text-zinc-700"> &nbsp;&nbsp;&nbsp;&nbsp;= </span>
        <span className="text-emerald-400/60">500</span>
      </div>
      <div>
        <span className="text-zinc-500">&quot;en&quot;</span>
        <span className="text-zinc-700"> &nbsp;&nbsp;+ </span>
        <span className="text-zinc-700">—</span>
        <span className="text-zinc-700"> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;= </span>
        <span className="text-emerald-400/60">&quot;en&quot;</span>
      </div>
    </div>
  </div>
);

const items = [
  {
    title: "50 branches, 50 problems",
    description:
      "Each client fork diverges further from main. Cherry-picking upstream changes becomes a full-time job.",
    header: branchesHeader,
    icon: <span className="text-red-400 text-lg">✕</span>,
    className: "md:col-span-2",
  },
  {
    title: "Merge conflict roulette",
    description:
      "Every upstream update risks breaking client branches. Conflict resolution is manual and error-prone.",
    header: conflictsHeader,
    icon: <span className="text-amber-400 text-lg">⚠</span>,
    className: "md:col-span-1",
  },
  {
    title: "Deterministic merges",
    description:
      "RFC 7396 JSON Merge Patch. Deep merge for objects, null to delete, arrays replaced. No ambiguity.",
    header: mergeHeader,
    icon: <span className="text-cyan-400 text-lg">◆</span>,
    className: "md:col-span-1",
  },
  {
    title: "Everything in main",
    description:
      "One branch holds all configs. Variants are directories, not forks. Git log tells the full story.",
    header: overlaysHeader,
    icon: <span className="text-emerald-400 text-lg">✓</span>,
    className: "md:col-span-2",
  },
];

export function Comparison() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="compare" className="relative py-32 overflow-hidden" ref={ref}>
      <div className="relative z-10 max-w-6xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="font-code text-sm font-medium text-violet-400/80 tracking-wider uppercase">
            Why not branches?
          </span>
          <h2 className="mt-4 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            Branches were never{" "}
            <span className="text-zinc-500">designed for this</span>
          </h2>
          <p className="mt-4 text-lg text-zinc-500 max-w-xl mx-auto">
            Git branches model divergent code paths — not per-client configuration.
            Variantform uses overlays: the right abstraction for the job.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          <BentoGrid className="md:auto-rows-[20rem]">
            {items.map((item) => (
              <BentoGridItem
                key={item.title}
                title={item.title}
                description={item.description}
                header={item.header}
                icon={item.icon}
                className={item.className}
              />
            ))}
          </BentoGrid>
        </motion.div>
      </div>
    </section>
  );
}
