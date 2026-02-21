"use client";
import { motion, useInView } from "motion/react";
import { useRef, useState } from "react";
import { BackgroundBeams } from "@/components/ui/background-beams";

export function GetStarted() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText("npm install -g variantform");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section
      id="get-started"
      className="relative min-h-[80vh] flex items-center overflow-hidden py-32"
      ref={ref}
    >
      <BackgroundBeams className="opacity-40" />

      <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="font-code text-sm font-medium text-emerald-400/80 tracking-wider uppercase">
            Get started
          </span>
          <h2 className="mt-4 font-display text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
            Ship per-client configs
            <br />
            <span className="text-gradient">in minutes</span>
          </h2>
        </motion.div>

        {/* Install command */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-10"
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
          <p className="mt-3 text-xs text-zinc-600">
            {copied ? "Copied!" : "Click to copy"}
          </p>
        </motion.div>

        {/* Quick steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6"
        >
          {[
            {
              step: "01",
              title: "Initialize",
              desc: "Run variantform init in your project root",
              cmd: "variantform init",
            },
            {
              step: "02",
              title: "Configure",
              desc: "Declare surfaces in .variantform.yaml",
              cmd: "edit .variantform.yaml",
            },
            {
              step: "03",
              title: "Create & Resolve",
              desc: "Create variants and resolve merged configs",
              cmd: "variantform resolve acme",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-left transition-all hover:border-white/[0.12] hover:bg-white/[0.04]"
            >
              <span className="font-code text-xs font-bold text-cyan-400/60">
                {item.step}
              </span>
              <h3 className="mt-2 font-display text-base font-bold text-zinc-100">
                {item.title}
              </h3>
              <p className="mt-1 text-sm text-zinc-500">{item.desc}</p>
              <div className="mt-3 rounded-lg bg-black/50 px-3 py-2 font-code text-[11px] text-zinc-600">
                <span className="text-cyan-400/40">$ </span>
                {item.cmd}
              </div>
            </div>
          ))}
        </motion.div>

        {/* Docs link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-12"
        >
          <a
            href="https://github.com/NikitaDmitrieff/variantform#readme"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-zinc-300"
          >
            Read the full documentation
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
