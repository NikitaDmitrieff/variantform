# Dashboard V2 — Full-Repo Customization Platform

**Date:** 2026-02-21
**Status:** Approved

## Overview

Evolve the variantform dashboard from a config-file editor into a full customization platform. The goal: help a SaaS developer take their single-tenant codebase and make it multi-client customizable — not just config files, but themes, components, assets, content, and code.

The dashboard serves as a **control plane** for managing customization, not a code editor. Developers edit code in their IDE; the dashboard provides visibility, health monitoring, variant management, and AI-assisted onboarding.

## Audience

SaaS developers who sell customized versions of their product to multiple clients. They maintain one codebase on `main` and use variantform to manage per-client overrides across the full repo.

## Core Concepts

### Extended Surface Types

Expand `.variantform.yaml` beyond JSON/YAML to cover any file type:

| Format | File types | Strategy | Purpose |
|--------|-----------|----------|---------|
| `json` | `.json` | merge or replace | Config files, feature flags |
| `yaml` | `.yaml`, `.yml` | merge or replace | Config files, workflows |
| `css` | `.css` | replace | Themes, brand styles |
| `code` | `.ts`, `.tsx`, `.js`, `.jsx`, `.py`, etc. | replace | Components, logic, integrations |
| `markdown` | `.md`, `.mdx` | replace | Content, docs, landing pages |
| `asset` | `.svg`, `.png`, `.jpg`, `.ico` | replace | Logos, icons, brand images |
| `template` | `.html`, `.hbs`, `.njk` | replace | Email templates, page templates |
| `text` | `.env.example`, `.txt`, any text | replace | Env templates, plain text config |

**Key rule:** only `json` and `yaml` support `merge` strategy (delta overlays). All other formats use `replace` (swap the whole file). This keeps the engine simple and predictable.

Example `.variantform.yaml` for a full-featured SaaS:

```yaml
surfaces:
  - path: "config/features.json"
    format: json
    strategy: merge
  - path: "config/theme.json"
    format: json
    strategy: merge
  - path: "styles/brand.css"
    format: css
    strategy: replace
  - path: "public/logo.svg"
    format: asset
    strategy: replace
  - path: "public/favicon.ico"
    format: asset
    strategy: replace
  - path: "src/components/HeroSection.tsx"
    format: code
    strategy: replace
  - path: "src/components/PricingTable.tsx"
    format: code
    strategy: replace
  - path: "content/landing.md"
    format: markdown
    strategy: replace
  - path: "templates/welcome-email.html"
    format: template
    strategy: replace
```

### Two User Personas (Phased)

**Phase 1 (MVP):** The SaaS developer is the only user. They use the dashboard to onboard their repo, manage variants for their clients, and monitor health.

**Phase 2 (future):** End customers of the SaaS developer can self-serve through a client-facing customization UI with guardrails set by the developer.

## Architecture

```
┌─────────────────────────────────────┐
│           Dashboard (Next.js)       │
│                                     │
│  ┌──────────┐  ┌─────────────────┐  │
│  │ Control  │  │ AI Chat         │  │
│  │ Plane UI │  │ (onboarding +   │  │
│  │          │  │  variant assist) │  │
│  └────┬─────┘  └───────┬─────────┘  │
│       │                │            │
│  ┌────┴────────────────┴─────────┐  │
│  │     Next.js API Routes        │  │
│  │  /api/github/* (exists)       │  │
│  │  /api/projects/* (exists)     │  │
│  │  /api/ai/chat (new)           │  │
│  │  /api/ai/execute (new)        │  │
│  └────┬───────────────┬──────────┘  │
└───────┼───────────────┼─────────────┘
        │               │
   ┌────┴────┐    ┌─────┴──────────┐
   │ GitHub  │    │ Worker Service │
   │ API     │    │ (Claude Code   │
   │ (exists)│    │  CLI subprocess│
   └─────────┘    │  in container) │
                  └────────────────┘
```

### Data Layer

**Supabase (thin mapping layer):**
- `vf_projects` — user → repo → GitHub installation (exists, unchanged)
- `vf_jobs` (new) — tracks worker execution: status (pending/running/completed/failed), plan JSON, PR URL, timestamps
- `vf_chat_sessions` (new) — stores AI conversation history per project

**GitHub (source of truth):**
- All config data, surfaces, variants, and overrides live in the repo (unchanged)
- Worker creates branches and PRs for heavy changes

### Worker Service

A container-based service (fly.io or Railway) that runs Claude Code CLI for heavy repo modifications.

**Job flow:**
1. Dashboard sends a customization plan (from AI chat) to `/api/ai/execute`
2. API route creates a `vf_jobs` record (status: pending), enqueues the job
3. Worker picks up the job:
   - Clones the repo
   - Creates a branch (`variantform/setup-<timestamp>` or `variantform/<variant-name>`)
   - Runs Claude Code CLI with the plan as instructions
   - Claude Code makes modifications: install variantform, create/update `.variantform.yaml`, refactor code (extract hardcoded values), create variant files
   - Pushes branch, creates PR via GitHub API
4. Worker updates `vf_jobs` with PR URL and status: completed
5. Dashboard polls job status and shows progress to the developer

## Features

### 1. AI-Conversational Onboarding

When a developer connects their repo for the first time:

**Stage 1: Conversation (dashboard chat, lightweight)**
- AI fetches repo file tree + key files (package.json, framework configs) via GitHub API
- AI analyzes the codebase: detects framework, identifies config files, themes, assets, components
- Conversational refinement: AI asks what the developer wants to customize, suggests surfaces, developer approves/adjusts
- Output: a structured customization plan (what surfaces to declare, what code to refactor, what to install)

**Stage 2: Execution (worker, heavy)**
- Plan is sent to the worker service
- Claude Code CLI clones the repo, executes the plan:
  - `npm install variantform`
  - Creates `.variantform.yaml` with agreed surfaces
  - Extracts hardcoded values into config files where needed
  - Creates `variants/` directory structure
  - Sets up the first variant if requested
- Creates a PR with all changes
- Developer reviews and merges — they're onboarded

**Fallback:** If the repo already has `.variantform.yaml`, skip onboarding and import existing setup.

### 2. Control Plane Dashboard

The dashboard answers four questions:

**"What does my customization landscape look like?"**
- **Surface map:** matrix of variants (columns) vs surfaces (rows). Each cell: overridden (with status) or inherits base.
- **Stats:** total variants, total surfaces, total overrides, most-customized variant

**"Is everything healthy?"**
- **Validation status per variant:** pass / warnings / errors
- **Stale override detection:** variant overrides a file that changed in base since the override was last updated
- **Format errors:** override file can't be parsed
- **Missing surfaces:** a declared surface's base file doesn't exist

**"What changed and when?"**
- **Activity feed:** Git commits touching `variants/` — who changed what override, when
- **Per-variant history:** chronological changes for a single variant
- **Per-surface history:** changes to a surface across all variants

**"How do variants compare?"**
- **Variant vs base diff:** what does this variant override?
- **Variant vs variant diff:** how do two clients differ?

### 3. Variant Management

- **Create variant:** name it, optionally start from scratch or duplicate an existing variant
- **Delete variant:** remove the variant directory from the repo (via commit)
- **Duplicate variant:** copy all overrides from an existing variant as a starting point
- **AI-assisted variant creation:** conversational — "Create a variant for an enterprise client" → AI generates initial overrides based on patterns from other variants, dispatches to worker

### 4. Dashboard Pages

| Route | View | Status |
|-------|------|--------|
| `/dashboard` | Projects list | Exists — minimal changes |
| `/dashboard/[project]` | Project overview: surface map, health, activity | Redesign |
| `/dashboard/[project]/[variant]` | Variant detail: overrides, health, history, diff | Redesign |
| `/dashboard/[project]/surfaces/[path]` | Surface detail: cross-variant comparison | New |
| `/dashboard/[project]/chat` | AI chat for onboarding + ongoing assist | New |
| `/dashboard/[project]/jobs` | Worker job status and history | New |

## API Routes

### Existing (unchanged)
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/github/install` | POST | GitHub App installation callback |
| `/api/github/repos` | GET | List accessible repos |
| `/api/projects/[id]/surfaces` | GET | Read surfaces from `.variantform.yaml` |
| `/api/projects/[id]/variants` | GET, POST | List/create variants |
| `/api/projects/[id]/variants/[name]` | GET, PUT, DELETE | Variant overrides CRUD |

### New
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/ai/chat` | POST | Stream AI conversation for onboarding/variant assist |
| `/api/ai/execute` | POST | Dispatch customization plan to worker |
| `/api/ai/jobs/[id]` | GET | Poll worker job status |
| `/api/projects/[id]/health` | GET | Aggregate validation status across all variants |
| `/api/projects/[id]/activity` | GET | Git commit history for `variants/` directory |
| `/api/projects/[id]/diff` | GET | Diff between variant and base, or between two variants |

## CLI Changes

### Extended surface formats
- `config.ts`: accept new format values (`css`, `code`, `asset`, `markdown`, `template`, `text`)
- Non-json/yaml formats default to `replace` strategy (only option)
- `resolve` command: already handles replace — returns variant file as-is. No change.
- `validate` command: new checks per format (file exists, not empty, valid encoding for assets)

### Type updates
- `Surface.format` type expands from `"json" | "yaml"` to include all new formats
- Backward compatible — existing `.variantform.yaml` files work unchanged

## Phasing

### Phase 1: Foundation (MVP)
1. Extended surface type system (CLI)
2. AI conversational onboarding (dashboard chat + worker)
3. Control plane dashboard (surface map, health, activity)
4. Variant management (create, delete, duplicate)

### Phase 2: Intelligence
1. AI-assisted variant creation (conversational + worker)
2. Stale override detection with suggested fixes
3. Variant diff views (variant vs base, variant vs variant)
4. Schema/constraint layer for guided forms

### Phase 3: Scale
1. End customer self-service UI
2. Visual theme builder (color pickers, asset uploads)
3. Webhook notifications on config changes
4. Team collaboration (shared projects, role-based access)
5. PR-based review flow for variant changes

## Key Design Decisions

1. **Dashboard is a control plane, not an editor.** Developers edit code in their IDE. The dashboard provides visibility, health monitoring, and AI assistance.
2. **AI onboarding transforms the repo.** The AI doesn't just create a YAML file — it refactors the codebase to be customizable, installs variantform, and creates a PR.
3. **Worker for heavy execution.** Conversational AI is lightweight (streaming API calls). Code modifications are heavy (Claude Code CLI in a container). Separate concerns.
4. **Git remains source of truth.** All customization data lives in the repo. Supabase stores only user/project/job metadata.
5. **Replace strategy for non-config files.** Only JSON/YAML support merge (delta overlays). Everything else is full file replacement. Simple and predictable.
6. **Phase 1 is developer-only.** End customer self-service is Phase 3. Get the developer experience right first.
