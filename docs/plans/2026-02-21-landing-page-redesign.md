# Landing Page Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the variantform landing page to be less wordy, possibility-first, with VARIANTFORM TextHoverEffect bookending the page, npm install at the forefront, expandable accordion for commands, container-cover for comparison, and a new "Possibilities" section replacing the problem cards.

**Architecture:** Modify existing section components in `web/src/components/sections/`. Replace Problem section with Possibilities (animated variant fan-out). Replace Commands tabs with custom accordion. Install Aceternity container-cover for Comparison section. Restructure Hero to lead with npm install. Add top VARIANTFORM TextHoverEffect. Speed up terminal typing.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, Framer Motion (motion/react), Aceternity UI components, TypeScript

---

### Task 1: Add VARIANTFORM TextHoverEffect at the top of the page

**Files:**
- Create: `web/src/components/sections/top-brand.tsx`
- Modify: `web/src/app/page.tsx`

**Step 1: Create the top brand section**

Create `web/src/components/sections/top-brand.tsx`:

```tsx
"use client";
import { TextHoverEffect } from "@/components/ui/text-hover-effect";

export function TopBrand() {
  return (
    <section className="relative h-[16rem] flex items-center justify-center overflow-hidden">
      <TextHoverEffect text="VARIANTFORM" duration={0.3} />
    </section>
  );
}
```

Note: Slightly shorter than the footer version (16rem vs 20rem) since it sits above the hero and shouldn't dominate scroll depth.

**Step 2: Add TopBrand to page layout**

In `web/src/app/page.tsx`, add the import and place `<TopBrand />` right after `<Navigation />`, before `<Hero />`.

New order:
```
Navigation → TopBrand → Hero → Possibilities → HowItWorks → Commands → Comparison → GetStarted → FooterSection
```

**Step 3: Verify build**

Run: `cd /Users/nikitadmitrieff/Projects/variantform/web && npm run build`
Expected: Build succeeds with no errors.

**Step 4: Commit**

```bash
git add web/src/components/sections/top-brand.tsx web/src/app/page.tsx
git commit -m "feat: add VARIANTFORM TextHoverEffect at top of landing page"
```

---

### Task 2: Redesign Hero — npm install at forefront, faster terminal, less wordy

**Files:**
- Modify: `web/src/components/sections/hero.tsx`

**Step 1: Rewrite the Hero section**

Replace the entire content of `hero.tsx`. Key changes:
- **Kill** the `TextGenerateEffect` subtitle (too slow, too wordy)
- **Replace** with one crisp line: "Git-native config overlays for SaaS teams."
- **Move** `npm install -g variantform` with copy button **right below** the headline as the primary CTA
- **Kill** the two CTA buttons (Get Started + GitHub) — redundant with npm install
- **Keep** the terminal demo but move it below the install, with faster typing: `typingSpeed={15}`, `startDelay={800}`
- **Keep** gradient orbs and HeroHighlight background
- **Keep** the badge (Open source · MIT License)

The new Hero structure:
```
Badge
Headline ("Stop managing configs / Start declaring variants")
One-liner subtitle (plain text, not TextGenerateEffect)
npm install command (copy button) ← PRIMARY CTA
Terminal demo (faster typing)
```

Code for the rewritten Hero:

```tsx
"use client";
import { motion } from "motion/react";
import { HeroHighlight, Highlight } from "@/components/ui/hero-highlight";
import { Terminal } from "@/components/terminal";
import { useState } from "react";

const heroTerminalLines = [
  { text: "npx variantform init", type: "command" as const },
  { text: "✓ Created .variantform.yaml", type: "output" as const, color: "#28c840" },
  { text: "✓ Created variants/ directory", type: "output" as const, color: "#28c840" },
  { text: "", type: "empty" as const },
  { text: "npx variantform create acme", type: "command" as const },
  { text: "✓ Created variant: acme", type: "output" as const, color: "#28c840" },
  { text: "", type: "empty" as const },
  { text: "npx variantform resolve acme", type: "command" as const },
  { text: "✓ Resolved 3 files for variant acme", type: "output" as const, color: "#28c840" },
  { text: "  → config/features.json", type: "output" as const, color: "#06b6d4" },
  { text: "  → config/theme.json", type: "output" as const, color: "#06b6d4" },
  { text: "  → config/branding.yaml", type: "output" as const, color: "#06b6d4" },
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
      containerClassName="min-h-[85vh] relative overflow-hidden"
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
          className="mb-8"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-sm text-zinc-400 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-glow" />
            Open source · MIT License
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

        {/* One-liner subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-6 text-lg text-zinc-500"
        >
          Git-native config overlays for SaaS teams.
        </motion.p>

        {/* npm install — PRIMARY CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-8"
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

        {/* Terminal Demo — faster */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
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
```

**Step 2: Remove TextGenerateEffect import**

The `text-generate-effect` import is no longer used in hero.tsx. The component file (`web/src/components/ui/text-generate-effect.tsx`) can stay in case it's used elsewhere — just remove the import from hero.tsx.

**Step 3: Verify build**

Run: `cd /Users/nikitadmitrieff/Projects/variantform/web && npm run build`
Expected: Build succeeds.

**Step 4: Commit**

```bash
git add web/src/components/sections/hero.tsx
git commit -m "feat: redesign hero — npm install at forefront, faster terminal, less wordy"
```

---

### Task 3: Replace Problem section with Possibilities section

**Files:**
- Create: `web/src/components/sections/possibilities.tsx`
- Modify: `web/src/app/page.tsx` (swap Problem → Possibilities)

**Step 1: Create the Possibilities section**

This replaces the 4 problem cards with a possibility-first narrative. The visual concept: an animated "variant fan-out" — one source config fanning out into multiple personalized versions, each with its own color accent.

Create `web/src/components/sections/possibilities.tsx`:

```tsx
"use client";
import { motion, useInView } from "motion/react";
import { useRef } from "react";

const variants = [
  { name: "acme", color: "#06b6d4", features: "dark mode · 500 users · custom brand" },
  { name: "globex", color: "#8b5cf6", features: "light mode · unlimited · white-label" },
  { name: "initech", color: "#10b981", features: "SSO · audit logs · on-prem deploy" },
  { name: "hooli", color: "#f59e0b", features: "freemium · analytics · custom domain" },
];

export function Possibilities() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="relative py-32 overflow-hidden" ref={ref}>
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute inset-0 bg-radial-fade" />

      <div className="relative z-10 max-w-5xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <span className="font-code text-sm font-medium text-cyan-400/80 tracking-wider uppercase">
            What you can build
          </span>
          <h2 className="mt-4 font-display text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
            One codebase.{" "}
            <span className="text-gradient">Infinite versions.</span>
          </h2>
          <p className="mt-4 text-lg text-zinc-500 max-w-lg mx-auto">
            Every client gets their own experience. Same product, surgical differences.
          </p>
        </motion.div>

        {/* Variant fan-out animation */}
        <div className="relative flex flex-col items-center">
          {/* Source node */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative z-10 flex items-center gap-3 rounded-xl border border-white/[0.1] bg-white/[0.04] px-6 py-3 backdrop-blur-sm"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-white/[0.1]">
              <span className="font-code text-xs font-bold text-white">B</span>
            </div>
            <div>
              <div className="font-display text-sm font-bold text-zinc-100">base config</div>
              <div className="font-code text-[11px] text-zinc-600">config/features.json</div>
            </div>
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
              <motion.div
                key={v.name}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.6 + i * 0.1 }}
                className="group relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all duration-300 hover:bg-white/[0.04] hover:border-white/[0.12]"
              >
                {/* Color accent line */}
                <div
                  className="absolute top-0 left-4 right-4 h-px"
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
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
```

**Step 2: Update page.tsx**

In `web/src/app/page.tsx`:
- Replace `import { Problem }` with `import { Possibilities }` from the new file
- Replace `<Problem />` with `<Possibilities />`

**Step 3: Verify build**

Run: `cd /Users/nikitadmitrieff/Projects/variantform/web && npm run build`
Expected: Build succeeds.

**Step 4: Commit**

```bash
git add web/src/components/sections/possibilities.tsx web/src/app/page.tsx
git commit -m "feat: replace Problem section with possibility-first Possibilities section"
```

---

### Task 4: Replace Commands tabs with expandable accordion

**Files:**
- Modify: `web/src/components/sections/commands.tsx`

**Step 1: Rewrite Commands section with accordion**

Replace the Tabs-based implementation with a clean expandable accordion. Each command is a collapsible row — click to expand and see usage + output. Only one expanded at a time.

```tsx
"use client";
import { motion, useInView, AnimatePresence } from "motion/react";
import { useRef, useState } from "react";

const commands = [
  {
    name: "init",
    description: "Bootstrap variantform in any project.",
    usage: "npx variantform init",
    output: `✓ Created .variantform.yaml
✓ Created variants/ directory

Ready! Edit .variantform.yaml to declare
your config surfaces.`,
  },
  {
    name: "create",
    description: "Scaffold a new client variant.",
    usage: "npx variantform create <name>",
    output: `$ npx variantform create acme
✓ Created variant: acme

Add override files to variants/acme/
matching your declared surfaces.`,
  },
  {
    name: "resolve",
    description: "Merge base configs with variant overrides. Deterministic output.",
    usage: "npx variantform resolve <variant>",
    output: `$ npx variantform resolve acme
✓ Resolved 3 files for variant acme
  → config/features.json
  → config/theme.json
  → config/branding.yaml`,
  },
  {
    name: "status",
    description: "See all variants at a glance.",
    usage: "npx variantform status",
    output: `Variant     Overrides  Undeclared
─────────   ─────────  ──────────
acme        3          0
globex      2          1 ⚠
initech     4          0`,
  },
  {
    name: "diff",
    description: "See exactly which keys a variant overrides.",
    usage: "npx variantform diff <variant>",
    output: `$ npx variantform diff acme

config/features.json:
  + dark_mode: false → true
  + max_users: 100 → 500
  + custom_branding: false → true`,
  },
  {
    name: "validate",
    description: "Catch stale keys and schema mismatches.",
    usage: "npx variantform validate",
    output: `$ npx variantform validate
Validating 3 variants...

⚠ globex: stale key "old_feature" in
  config/features.json (not in base)
✓ acme: all overrides valid
✓ initech: all overrides valid

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
            Everything you need — nothing you don&apos;t.
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
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden transition-colors hover:border-white/[0.1]"
              >
                <button
                  onClick={() => setExpanded(isOpen ? null : cmd.name)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/20">
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
                        <div className="rounded-xl border border-white/[0.06] bg-[#0a0a0a] overflow-hidden">
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
```

**Step 2: Verify build**

Run: `cd /Users/nikitadmitrieff/Projects/variantform/web && npm run build`
Expected: Build succeeds. Note: The `Tabs` UI component and `AnimatePresence` import from motion/react are used — verify AnimatePresence is available in the motion package (it is in motion v12).

**Step 3: Commit**

```bash
git add web/src/components/sections/commands.tsx
git commit -m "feat: replace bugged tabs with expandable accordion in Commands section"
```

---

### Task 5: Install Aceternity container-cover and redesign Comparison section

**Files:**
- Install: Aceternity `container-cover` component via shadcn CLI
- Modify: `web/src/components/sections/comparison.tsx`

**Step 1: Install container-cover dependencies**

```bash
cd /Users/nikitadmitrieff/Projects/variantform/web
npm install @tsparticles/react @tsparticles/engine @tsparticles/slim
```

**Step 2: Install the container-cover component**

```bash
cd /Users/nikitadmitrieff/Projects/variantform/web
npx shadcn@latest add https://ui.aceternity.com/registry/cover.json
```

This should create `web/src/components/ui/cover.tsx` (or similar). Check the output path.

**Step 3: Rewrite Comparison section with Cover component**

Replace the BentoGrid implementation with a Cover-based reveal. The default view shows the "branch chaos" problem; hovering/interacting reveals the "overlay solution."

```tsx
"use client";
import { motion, useInView } from "motion/react";
import { useRef } from "react";
import { Cover } from "@/components/ui/cover";

export function Comparison() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="compare" className="relative py-32 overflow-hidden" ref={ref}>
      <div className="relative z-10 max-w-4xl mx-auto px-4">
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
            <Cover>designed for this</Cover>
          </h2>
        </motion.div>

        {/* Side-by-side reveal */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {/* Branches — the problem */}
          <div className="rounded-xl border border-red-500/10 bg-gradient-to-br from-red-950/10 to-black p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-red-400 text-lg">✕</span>
              <span className="font-display text-sm font-bold text-zinc-300">Branches</span>
            </div>
            <div className="font-code text-xs text-zinc-600 space-y-1.5">
              <div className="text-red-400/60">main</div>
              <div>├── client-acme</div>
              <div>├── client-globex</div>
              <div>├── client-initech</div>
              <div>├── client-hooli</div>
              <div className="text-red-500/40">└── 47 more...</div>
            </div>
            <div className="mt-4 space-y-2 text-sm text-zinc-600">
              <div>N branches = N merge conflicts</div>
              <div>Cherry-picking is a full-time job</div>
              <div>No single source of truth</div>
            </div>
          </div>

          {/* Overlays — the solution */}
          <div className="rounded-xl border border-emerald-500/10 bg-gradient-to-br from-emerald-950/10 to-black p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-emerald-400 text-lg">✓</span>
              <span className="font-display text-sm font-bold text-zinc-300">Overlays</span>
            </div>
            <div className="font-code text-xs text-zinc-600 space-y-1.5">
              <div className="text-emerald-400/60">main</div>
              <div>├── config/</div>
              <div>│   └── features.json</div>
              <div className="text-emerald-400/40">└── variants/</div>
              <div className="text-emerald-400/40">&nbsp;&nbsp;&nbsp;&nbsp;├── acme/ <span className="text-zinc-700">(3 overrides)</span></div>
              <div className="text-emerald-400/40">&nbsp;&nbsp;&nbsp;&nbsp;└── globex/ <span className="text-zinc-700">(2 overrides)</span></div>
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
```

Note: The `Cover` component wraps the "designed for this" text in the heading — this provides the beam/space hover effect that Aceternity's container-cover delivers, making the heading itself interactive. The comparison content below uses a clean side-by-side layout (branches vs overlays) that's much clearer than the old BentoGrid.

**Step 4: Verify build**

Run: `cd /Users/nikitadmitrieff/Projects/variantform/web && npm run build`
Expected: Build succeeds. If the Cover component import path differs, adjust accordingly.

**Step 5: Commit**

```bash
git add web/src/components/sections/comparison.tsx web/src/components/ui/cover.tsx package.json package-lock.json
git commit -m "feat: redesign Comparison with Aceternity Cover component and clean side-by-side layout"
```

---

### Task 6: Simplify GetStarted section (npm install already in hero)

**Files:**
- Modify: `web/src/components/sections/get-started.tsx`

**Step 1: Simplify GetStarted**

Since the npm install command is now prominently in the Hero, the GetStarted section should be lighter. Keep the 3 quick-step cards and docs link, but drop the duplicate install command and heavy heading.

```tsx
"use client";
import { motion, useInView } from "motion/react";
import { useRef } from "react";
import { BackgroundBeams } from "@/components/ui/background-beams";

export function GetStarted() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      id="get-started"
      className="relative min-h-[50vh] flex items-center overflow-hidden py-24"
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
            Quick start
          </span>
          <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            Three steps to{" "}
            <span className="text-gradient">overlay clarity</span>
          </h2>
        </motion.div>

        {/* Quick steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6"
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
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-10"
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
```

**Step 2: Verify build**

Run: `cd /Users/nikitadmitrieff/Projects/variantform/web && npm run build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add web/src/components/sections/get-started.tsx
git commit -m "feat: simplify GetStarted section — remove duplicate npm install"
```

---

### Task 7: Final page.tsx assembly and cleanup

**Files:**
- Modify: `web/src/app/page.tsx`
- Possibly delete: `web/src/components/sections/problem.tsx` (replaced by possibilities.tsx)

**Step 1: Verify final page.tsx order**

Ensure `web/src/app/page.tsx` has the correct import order and section sequence:

```tsx
import { Navigation } from "@/components/navigation";
import { TopBrand } from "@/components/sections/top-brand";
import { Hero } from "@/components/sections/hero";
import { Possibilities } from "@/components/sections/possibilities";
import { HowItWorks } from "@/components/sections/how-it-works";
import { Commands } from "@/components/sections/commands";
import { Comparison } from "@/components/sections/comparison";
import { GetStarted } from "@/components/sections/get-started";
import { FooterSection } from "@/components/sections/footer-section";

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-black">
      <Navigation />
      <TopBrand />
      <Hero />
      <Possibilities />
      <HowItWorks />
      <Commands />
      <Comparison />
      <GetStarted />
      <FooterSection />
    </main>
  );
}
```

**Step 2: Delete old problem.tsx**

```bash
rm web/src/components/sections/problem.tsx
```

**Step 3: Full build verification**

Run: `cd /Users/nikitadmitrieff/Projects/variantform/web && npm run build`
Expected: Build succeeds with no errors, no unused import warnings.

**Step 4: Visual check**

Run: `cd /Users/nikitadmitrieff/Projects/variantform/web && npm run dev`
Open browser to localhost:3000 and verify:
- VARIANTFORM TextHoverEffect appears at top and bottom
- Hero shows npm install prominently, terminal is faster
- Possibilities section shows variant fan-out animation
- Commands accordion expands/collapses correctly
- Comparison shows Cover effect on heading + side-by-side layout
- GetStarted is lighter without duplicate install command
- Overall page feels less wordy and more visual

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: complete landing page redesign — possibility-first, less wordy, VARIANTFORM bookends"
```
