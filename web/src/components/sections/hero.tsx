"use client";
import { motion } from "motion/react";
import { HeroHighlight, Highlight } from "@/components/ui/hero-highlight";
import { TextHoverEffect } from "@/components/ui/text-hover-effect";
import { Terminal } from "@/components/terminal";
import { useState } from "react";

const heroTerminalLines = [
  { text: "npx variantform init", type: "command" as const },
  { text: "\u2713 Created .variantform.yaml", type: "output" as const, color: "#28c840" },
  { text: "\u2713 Created variants/ directory", type: "output" as const, color: "#28c840" },
  { text: "", type: "empty" as const },
  { text: "npx variantform create acme", type: "command" as const },
  { text: "\u2713 Created variant: acme", type: "output" as const, color: "#28c840" },
  { text: "", type: "empty" as const },
  { text: "npx variantform resolve acme", type: "command" as const },
  { text: "\u2713 Resolved 3 files for variant acme", type: "output" as const, color: "#28c840" },
  { text: "  \u2192 config/features.json", type: "output" as const, color: "#06b6d4" },
  { text: "  \u2192 config/theme.json", type: "output" as const, color: "#06b6d4" },
  { text: "  \u2192 config/branding.yaml", type: "output" as const, color: "#06b6d4" },
];

export function Hero() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText("npm install -g variantform");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <HeroHighlight
      containerClassName="min-h-screen relative overflow-hidden"
      className="max-w-6xl mx-auto px-4 pt-24 pb-20"
    >
      {/* Gradient orbs */}
      <div className="pointer-events-none absolute top-1/4 left-1/4 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/[0.07] blur-[120px] animate-orb" />
      <div className="pointer-events-none absolute right-1/4 bottom-1/3 h-[400px] w-[400px] rounded-full bg-violet-500/[0.07] blur-[100px] animate-orb" style={{ animationDelay: "-7s" }} />

      <div className="relative z-10 flex flex-col items-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-4"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-sm text-zinc-400 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-glow" />
            Open source &middot; MIT License
          </span>
        </motion.div>

        {/* VARIANTFORM — the centerpiece */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="w-full h-[12rem] sm:h-[14rem] flex items-center justify-center"
        >
          <TextHoverEffect text="VARIANTFORM" duration={0.3} textSize="text-6xl" />
        </motion.div>

        {/* npm install — right beneath */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-2"
        >
          <button
            onClick={handleCopy}
            className="group relative mx-auto flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-6 py-4 font-code text-sm transition-all hover:border-white/[0.15] hover:bg-white/[0.05]"
          >
            <span className="text-cyan-400 select-none">$</span>
            <span className="text-zinc-300">npm install -g variantform</span>
            <span className="ml-4 text-zinc-600 transition-colors group-hover:text-zinc-400">
              {copied ? (
                <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </span>
          </button>
          <p className="mt-2 text-center text-xs text-zinc-600">
            {copied ? "Copied!" : "Click to copy"}
          </p>
        </motion.div>

        {/* Tagline */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-10 text-center font-display text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl"
        >
          Stop managing{" "}
          <Highlight className="text-white dark:from-cyan-400 dark:to-violet-500">
            configs
          </Highlight>
          <br />
          <span className="text-zinc-500">Start declaring&nbsp;</span>
          <span className="text-gradient">variants</span>
        </motion.h2>

        {/* One-liner subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="mt-4 text-lg text-zinc-500"
        >
          Git-native config overlays for SaaS teams.
        </motion.p>

        {/* Terminal Demo — faster */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="mt-12 w-full max-w-2xl"
        >
          <Terminal
            lines={heroTerminalLines}
            title="variantform — quick start"
            typingSpeed={15}
            startDelay={800}
          />
        </motion.div>
      </div>
    </HeroHighlight>
  );
}
