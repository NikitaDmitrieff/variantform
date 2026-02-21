"use client";
import { motion, useInView, AnimatePresence } from "motion/react";
import { useRef, useState } from "react";
import { CornerFrame } from "@/components/ui/corner-frame";
import { CanvasRevealEffect } from "@/components/ui/canvas-reveal-effect";

const variants = [
  { name: "acme", color: "#06b6d4", rgb: [[6, 182, 212]] as number[][], features: "dark mode · 500 users · custom brand" },
  { name: "globex", color: "#8b5cf6", rgb: [[139, 92, 246]] as number[][], features: "light mode · unlimited · white-label" },
  { name: "initech", color: "#10b981", rgb: [[16, 185, 129]] as number[][], features: "SSO · audit logs · on-prem deploy" },
  { name: "hooli", color: "#f59e0b", rgb: [[245, 158, 11]] as number[][], features: "freemium · analytics · custom domain" },
];

function VariantCard({ v, isInView, delay }: { v: typeof variants[number]; isInView: boolean; delay: number }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group relative overflow-hidden rounded-[3px] border border-white/[0.06] bg-white/[0.02] p-5 transition-all duration-300 hover:border-white/[0.12]"
    >
      {/* Canvas reveal on hover */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
          >
            <CanvasRevealEffect
              animationSpeed={3}
              containerClassName="bg-transparent"
              colors={v.rgb}
              dotSize={4}
              showGradient={false}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card content — above the canvas */}
      <div className="relative z-10">
        {/* Color accent line */}
        <div
          className="absolute -top-5 -left-1 -right-1 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${v.color}40, transparent)` }}
        />
        <div
          className="mb-3 flex h-7 w-7 items-center justify-center rounded-md border border-white/[0.08]"
          style={{ background: `${v.color}15` }}
        >
          <span className="font-code text-[10px] font-bold" style={{ color: v.color }}>
            {v.name[0].toUpperCase()}
          </span>
        </div>
        <div className="font-display text-sm font-bold text-zinc-100">{v.name}</div>
        <div className="mt-1 font-code text-[11px] text-zinc-600 leading-relaxed">
          {v.features}
        </div>
      </div>
    </motion.div>
  );
}

export function Possibilities() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="relative py-28 overflow-hidden" ref={ref}>
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute inset-0 bg-radial-fade" />

      <div className="relative z-10 max-w-5xl mx-auto px-4">
        {/* Variant fan-out animation */}
        <div className="relative flex flex-col items-center">
          {/* Source node */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <CornerFrame lines className="relative z-10 flex items-center gap-3 rounded-[3px] border border-white/[0.1] bg-white/[0.04] px-6 py-3 backdrop-blur-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-[3px] bg-[#1a1ab0]/15 border border-white/[0.1]">
                <span className="font-code text-xs font-bold text-white">B</span>
              </div>
              <div>
                <div className="font-display text-sm font-bold text-zinc-100">base config</div>
                <div className="font-code text-[11px] text-zinc-600">config/features.json</div>
              </div>
            </CornerFrame>
          </motion.div>

          {/* Connecting lines */}
          <motion.div
            initial={{ scaleY: 0 }}
            animate={isInView ? { scaleY: 1 } : {}}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="w-px h-12 bg-gradient-to-b from-white/[0.15] to-white/[0.05] origin-top"
          />

          {/* Variant cards grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
            {variants.map((v, i) => (
              <VariantCard
                key={v.name}
                v={v}
                isInView={isInView}
                delay={0.6 + i * 0.1}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
