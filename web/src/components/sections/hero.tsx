"use client";
import { motion } from "motion/react";
import { TextHoverEffect } from "@/components/ui/text-hover-effect";
import { Terminal } from "@/components/terminal";
import { CornerFrame } from "@/components/ui/corner-frame";
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
  { text: "  \u2192 config/features.json", type: "output" as const, color: "#1a1ab0" },
  { text: "  \u2192 config/theme.json", type: "output" as const, color: "#1a1ab0" },
  { text: "  \u2192 config/branding.yaml", type: "output" as const, color: "#1a1ab0" },
];

export function Hero() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText("npm install -g variantform");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="relative bg-black">
      {/* Above the fold — VARIANTFORM + npm install only */}
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        {/* VARIANTFORM — the centerpiece */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="w-full max-w-7xl h-[16rem] sm:h-[20rem] md:h-[24rem]"
        >
          <TextHoverEffect text="VARIANTFORM" duration={0.3} textSize="text-7xl" />
        </motion.div>

        {/* npm install — pushed down for breathing room */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-16"
        >
          <CornerFrame lines className="mt-4">
            <button
              onClick={handleCopy}
              className="group relative mx-auto flex items-center gap-3 rounded-[3px] border border-[#1a1ab0]/20 bg-black/80 px-8 py-5 font-code text-base backdrop-blur-sm transition-all hover:border-[#1a1ab0]/40 hover:bg-white/[0.03]"
            >
              <span className="text-[#1a1ab0] select-none">$</span>
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
          </CornerFrame>
          <p className="mt-2 text-center text-xs text-zinc-600">
            {copied ? "Copied!" : "Click to copy"}
          </p>
        </motion.div>
      </div>

      {/* Below the fold — tagline + terminal */}
      <div className="flex flex-col items-center px-4 pb-24">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center font-display text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl"
        >
          Stop managing{" "}
          <span className="text-gradient">configs</span>
          <br />
          <span className="text-zinc-500">Start declaring&nbsp;</span>
          <span className="text-gradient">variants</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-4 text-lg text-zinc-500"
        >
          Git-native config overlays for SaaS teams.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, delay: 0.2 }}
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
    </section>
  );
}
