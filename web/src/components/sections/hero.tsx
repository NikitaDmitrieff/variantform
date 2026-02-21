"use client";
import { motion } from "motion/react";
import { HeroHighlight, Highlight } from "@/components/ui/hero-highlight";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import { Terminal } from "@/components/terminal";

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
  return (
    <HeroHighlight
      containerClassName="min-h-screen relative overflow-hidden"
      className="max-w-6xl mx-auto px-4 pt-32 pb-20"
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
          className="mb-8"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-sm text-zinc-400 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-glow" />
            Open source &middot; MIT License
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-center font-display text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl"
        >
          Stop managing{" "}
          <Highlight className="text-white dark:from-cyan-400 dark:to-violet-500">
            configs
          </Highlight>
          <br />
          <span className="text-zinc-500">Start declaring&nbsp;</span>
          <span className="text-gradient">variants</span>
        </motion.h1>

        {/* Subtitle */}
        <div className="mt-8 max-w-2xl text-center">
          <TextGenerateEffect
            words="Git-native configuration overlays for SaaS teams. Define your config surfaces once, customize per-client with surgical overrides, resolve deterministically on demand."
            className="text-lg text-zinc-400"
            duration={0.3}
          />
        </div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.2 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <a
            href="#get-started"
            className="group relative inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-violet-500 px-6 py-3 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-cyan-500/25"
          >
            Get Started
            <svg
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
          <a
            href="https://github.com/NikitaDmitrieff/variantform"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-6 py-3 text-sm font-medium text-zinc-300 transition-all hover:border-white/20 hover:bg-white/[0.06]"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            View on GitHub
          </a>
        </motion.div>

        {/* Terminal Demo */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mt-16 w-full max-w-2xl"
        >
          <Terminal
            lines={heroTerminalLines}
            title="variantform \u2014 quick start"
            typingSpeed={25}
            startDelay={2000}
          />
        </motion.div>
      </div>
    </HeroHighlight>
  );
}
