# Variantform Dashboard — Design Document

**Date:** 2026-02-20
**Status:** Approved

## Overview

A hosted SaaS dashboard for managing per-client configuration variants through a web UI. Covers the full CLI feature set: create projects, declare surfaces, manage variants, edit overrides visually, validate, and preview resolved output.

## Audience

End customers (hosted SaaS). Users sign in with GitHub OAuth and manage their own projects.

## Architecture

**Approach:** Next.js App Router + Supabase client SDK (in existing `/web` directory).

- Supabase is the primary data store (DB + Auth)
- Merge/validate logic runs client-side, reusing the existing TypeScript from `src/merge.ts`
- No separate API layer for V1 — Supabase RLS handles authorization
- Git sync is a future V2 feature

## Data Model

### Tables (Supabase)

```sql
projects
  id          uuid PK default gen_random_uuid()
  user_id     uuid FK → auth.users NOT NULL
  name        text NOT NULL
  created_at  timestamptz default now()
  UNIQUE(user_id, name)

surfaces
  id          uuid PK default gen_random_uuid()
  project_id  uuid FK → projects ON DELETE CASCADE
  path        text NOT NULL        -- e.g. "config/features.json"
  format      text NOT NULL        -- "json" | "yaml"
  strategy    text NOT NULL DEFAULT 'merge'  -- "merge" | "replace"
  base_content text NOT NULL       -- the base config file content
  UNIQUE(project_id, path)

variants
  id          uuid PK default gen_random_uuid()
  project_id  uuid FK → projects ON DELETE CASCADE
  name        text NOT NULL        -- e.g. "acme"
  created_at  timestamptz default now()
  UNIQUE(project_id, name)

overrides
  id          uuid PK default gen_random_uuid()
  variant_id  uuid FK → variants ON DELETE CASCADE
  surface_id  uuid FK → surfaces ON DELETE CASCADE
  content     text NOT NULL        -- the override JSON/YAML content
  updated_at  timestamptz default now()
  UNIQUE(variant_id, surface_id)
```

### RLS Policies

All tables filtered by `auth.uid() = projects.user_id` (via joins for child tables).

## Pages & UX

### `/dashboard` — Project List
- Cards for each project: name, surface count, variant count
- "New Project" button → modal
- GitHub avatar + sign out in header

### `/dashboard/[project]` — Project Overview
- Left panel: surfaces list (path, format, strategy) with inline "Add Surface" form
- Right panel: variants grid with name, override count, validation status badge
- "Create Variant" button
- Breadcrumb navigation

### `/dashboard/[project]/[variant]` — Variant Editor
- Tabs/accordion for each surface
- Split view: base config (read-only, left) | override editor (right)
- Live resolved preview below (computed using `applyMergePatch`)
- Inline validation warnings (stale keys, parse errors)
- Save/delete per override

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js App Router (existing `/web`) |
| Auth | `@supabase/ssr` + GitHub OAuth |
| DB | Supabase Postgres with RLS |
| Editor | `@monaco-editor/react` |
| Merge logic | Reuse `src/merge.ts` (imported into web) |
| UI | Tailwind + Aceternity UI + shadcn |
| Data fetching | React state + SWR |
| Deploy | Vercel (same project) |

## Key Design Decisions

1. **Supabase as source of truth** — No git dependency at runtime. Simplest V1 path.
2. **Client-side merge** — The merge logic is ~200 lines of pure TS. Runs instantly in-browser for live preview.
3. **Monaco editor** — VS Code-quality editing experience. JSON/YAML syntax highlighting + validation.
4. **Same Next.js app** — Dashboard lives alongside landing page. Single deploy.
5. **RLS for security** — No custom auth middleware needed. Supabase handles row-level access control.

## Future (not V1)

- Git sync (export/import to GitHub repo)
- Team collaboration (shared projects, role-based access)
- Webhook notifications on config changes
- Config version history / rollback
- CLI `push`/`pull` commands to sync with dashboard
