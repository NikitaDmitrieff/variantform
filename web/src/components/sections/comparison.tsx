"use client";
import { motion, useInView } from "motion/react";
import { useRef } from "react";
import { Cover } from "@/components/ui/cover";

export function Comparison() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="compare" className="relative py-20 overflow-hidden" ref={ref}>
      <div className="relative z-10 max-w-4xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="font-code text-sm font-medium text-[#1a1ab0] tracking-wider uppercase">
            Why not branches?
          </span>
          <h2 className="mt-4 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            Branches were never{" "}
            <Cover>designed for this</Cover>
          </h2>
        </motion.div>

        {/* Side-by-side comparison */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {/* Branches — the problem */}
          <div className="rounded-[3px] border border-red-500/10 bg-gradient-to-br from-red-950/10 to-black p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-red-400 text-lg">&#10005;</span>
              <span className="font-display text-sm font-bold text-zinc-300">Branches</span>
            </div>
            <div className="font-code text-xs text-zinc-600 space-y-1.5">
              <div className="text-red-400/60">main</div>
              <div>&#9500;&#9472;&#9472; client-acme</div>
              <div>&#9500;&#9472;&#9472; client-globex</div>
              <div>&#9500;&#9472;&#9472; client-initech</div>
              <div>&#9500;&#9472;&#9472; client-hooli</div>
              <div className="text-red-500/40">&#9492;&#9472;&#9472; 47 more...</div>
            </div>
            <div className="mt-4 space-y-2 text-sm text-zinc-600">
              <div>N branches = N merge conflicts</div>
              <div>Cherry-picking is a full-time job</div>
              <div>No single source of truth</div>
            </div>
          </div>

          {/* Overlays — the solution */}
          <div className="rounded-[3px] border border-emerald-500/10 bg-gradient-to-br from-emerald-950/10 to-black p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-emerald-400 text-lg">&#10003;</span>
              <span className="font-display text-sm font-bold text-zinc-300">Overlays</span>
            </div>
            <div className="font-code text-xs text-zinc-600 space-y-1.5">
              <div className="text-emerald-400/60">main</div>
              <div>&#9500;&#9472;&#9472; config/</div>
              <div>&#9474;&nbsp;&nbsp;&nbsp;&#9492;&#9472;&#9472; features.json</div>
              <div className="text-emerald-400/40">&#9492;&#9472;&#9472; variants/</div>
              <div className="text-emerald-400/40">&nbsp;&nbsp;&nbsp;&nbsp;&#9500;&#9472;&#9472; acme/ <span className="text-zinc-700">(3 overrides)</span></div>
              <div className="text-emerald-400/40">&nbsp;&nbsp;&nbsp;&nbsp;&#9492;&#9472;&#9472; globex/ <span className="text-zinc-700">(2 overrides)</span></div>
            </div>
            <div className="mt-4 space-y-2 text-sm text-zinc-600">
              <div>One branch, all configs</div>
              <div>Deterministic RFC 7396 merges</div>
              <div>Git log tells the full story</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
