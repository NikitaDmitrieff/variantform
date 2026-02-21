# Variantform Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a hosted SaaS dashboard for managing per-client configuration variants, backed by Supabase (auth + DB) with Monaco editor for visual config editing and live merge preview.

**Architecture:** Next.js App Router in existing `/web` directory. Supabase is the data store (Postgres + RLS). GitHub OAuth for auth via `@supabase/ssr`. Merge logic (`applyMergePatch`) runs client-side for live preview. Monaco editor for JSON/YAML editing.

**Tech Stack:** Next.js 16, Supabase (project `lhidckbjztivaeceazyi`), `@supabase/ssr`, `@monaco-editor/react`, SWR, js-yaml, Tailwind, Aceternity UI

**Supabase URL:** `https://lhidckbjztivaeceazyi.supabase.co`

---

### Task 1: Supabase Schema Migration

**Files:**
- None (SQL migration applied via Supabase MCP)

**Step 1: Apply the migration**

Use the Supabase MCP `apply_migration` tool with this SQL:

```sql
-- Variantform dashboard tables (prefixed vf_ to avoid conflicts)

create table vf_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now(),
  unique(user_id, name)
);

create table vf_surfaces (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references vf_projects(id) on delete cascade not null,
  path text not null,
  format text not null check (format in ('json', 'yaml')),
  strategy text not null default 'merge' check (strategy in ('merge', 'replace')),
  base_content text not null default '{}',
  unique(project_id, path)
);

create table vf_variants (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references vf_projects(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now(),
  unique(project_id, name)
);

create table vf_overrides (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid references vf_variants(id) on delete cascade not null,
  surface_id uuid references vf_surfaces(id) on delete cascade not null,
  content text not null default '{}',
  updated_at timestamptz default now(),
  unique(variant_id, surface_id)
);

-- Enable RLS
alter table vf_projects enable row level security;
alter table vf_surfaces enable row level security;
alter table vf_variants enable row level security;
alter table vf_overrides enable row level security;

-- RLS Policies
create policy "Users manage own projects" on vf_projects
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage surfaces in own projects" on vf_surfaces
  for all using (project_id in (select id from vf_projects where user_id = auth.uid()))
  with check (project_id in (select id from vf_projects where user_id = auth.uid()));

create policy "Users manage variants in own projects" on vf_variants
  for all using (project_id in (select id from vf_projects where user_id = auth.uid()))
  with check (project_id in (select id from vf_projects where user_id = auth.uid()));

create policy "Users manage overrides in own variants" on vf_overrides
  for all using (
    variant_id in (
      select v.id from vf_variants v
      join vf_projects p on v.project_id = p.id
      where p.user_id = auth.uid()
    )
  )
  with check (
    variant_id in (
      select v.id from vf_variants v
      join vf_projects p on v.project_id = p.id
      where p.user_id = auth.uid()
    )
  );
```

**Step 2: Verify tables exist**

Use Supabase MCP `list_tables` to confirm `vf_projects`, `vf_surfaces`, `vf_variants`, `vf_overrides` appear with RLS enabled.

**Step 3: Commit** (no files changed — migration is server-side)

---

### Task 2: Install Dependencies & Environment

**Files:**
- Modify: `web/package.json`
- Create: `web/.env.local`

**Step 1: Install packages**

```bash
cd /Users/nikitadmitrieff/Projects/variantform/web
npm install @supabase/supabase-js @supabase/ssr @monaco-editor/react swr js-yaml
npm install -D @types/js-yaml
```

**Step 2: Create environment file**

Create `web/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://lhidckbjztivaeceazyi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoaWRja2JqenRpdmFlY2VhenlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNjEwNTgsImV4cCI6MjA3NzkzNzA1OH0.3GcqP9NJkDldFsY8SKEImFPQQoM56TKHvIVwhAzKpSY
```

**Step 3: Verify .gitignore includes .env.local** (Next.js default should cover this)

**Step 4: Commit**
```bash
git add web/package.json web/package-lock.json
git commit -m "chore: install Supabase, Monaco, SWR dependencies"
```

---

### Task 3: Supabase Client Utilities

**Files:**
- Create: `web/src/lib/supabase/client.ts`
- Create: `web/src/lib/supabase/server.ts`
- Create: `web/src/lib/supabase/middleware.ts`
- Create: `web/src/middleware.ts`

**Step 1: Create browser client**

`web/src/lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**Step 2: Create server client**

`web/src/lib/supabase/server.ts`:
```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from Server Component — ignore
          }
        },
      },
    }
  );
}
```

**Step 3: Create middleware helper**

`web/src/lib/supabase/middleware.ts`:
```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Redirect unauthenticated users from /dashboard to /login
  if (!user && request.nextUrl.pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users from /login to /dashboard
  if (user && request.nextUrl.pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
```

**Step 4: Create middleware**

`web/src/middleware.ts`:
```typescript
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
```

**Step 5: Commit**
```bash
git add web/src/lib/supabase/ web/src/middleware.ts
git commit -m "feat: Supabase client utilities and auth middleware"
```

---

### Task 4: Merge Logic Module

**Files:**
- Create: `web/src/lib/merge.ts`

**Step 1: Create merge module**

Copy the pure merge functions from `src/merge.ts` into `web/src/lib/merge.ts`. Only the browser-compatible functions — no node APIs.

```typescript
export function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function applyMergePatch(target: unknown, patch: unknown): unknown {
  if (!isObject(patch)) {
    return patch;
  }
  const result: Record<string, unknown> = isObject(target) ? { ...target } : {};
  for (const [key, patchValue] of Object.entries(patch)) {
    if (patchValue === null) {
      delete result[key];
    } else if (isObject(patchValue) && isObject(result[key])) {
      result[key] = applyMergePatch(result[key], patchValue);
    } else {
      result[key] = patchValue;
    }
  }
  return result;
}
```

**Step 2: Commit**
```bash
git add web/src/lib/merge.ts
git commit -m "feat: add client-side merge logic for live preview"
```

---

### Task 5: Auth Pages

**Files:**
- Create: `web/src/app/login/page.tsx`
- Create: `web/src/app/auth/callback/route.ts`

**Step 1: Create login page**

`web/src/app/login/page.tsx` — Full-page login with GitHub OAuth button. Dark theme matching landing page aesthetic.

**Step 2: Create OAuth callback route handler**

`web/src/app/auth/callback/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
```

**Step 3: Commit**
```bash
git add web/src/app/login/ web/src/app/auth/
git commit -m "feat: GitHub OAuth login and callback"
```

**Note:** GitHub OAuth must be enabled in Supabase dashboard (Authentication → Providers → GitHub). User needs to create a GitHub OAuth App with callback URL `https://lhidckbjztivaeceazyi.supabase.co/auth/v1/callback`.

---

### Task 6: Dashboard Layout

**Files:**
- Create: `web/src/app/dashboard/layout.tsx`
- Create: `web/src/components/dashboard/sidebar.tsx`
- Create: `web/src/components/dashboard/header.tsx`

**Step 1: Create dashboard layout**

`web/src/app/dashboard/layout.tsx` — Server component that fetches user session, renders sidebar + header + main content area. Redirects to /login if no session.

**Step 2: Create sidebar**

`web/src/components/dashboard/sidebar.tsx` — Navigation sidebar with project list, links to dashboard sections. Dark theme.

**Step 3: Create header**

`web/src/components/dashboard/header.tsx` — Top bar with breadcrumbs, user avatar (from GitHub), sign out button.

**Step 4: Commit**
```bash
git add web/src/app/dashboard/layout.tsx web/src/components/dashboard/
git commit -m "feat: dashboard layout with sidebar and header"
```

---

### Task 7: Project List Page

**Files:**
- Create: `web/src/app/dashboard/page.tsx`
- Create: `web/src/components/dashboard/project-card.tsx`
- Create: `web/src/components/dashboard/create-project-modal.tsx`

**Step 1: Create project list page**

`web/src/app/dashboard/page.tsx` — Server component. Fetches all `vf_projects` for current user with surface/variant counts via join. Renders grid of ProjectCard components + "New Project" button.

**Step 2: Create project card**

`web/src/components/dashboard/project-card.tsx` — Card showing project name, surface count, variant count, created date. Click navigates to `/dashboard/[projectId]`.

**Step 3: Create project modal**

`web/src/components/dashboard/create-project-modal.tsx` — Client component. Modal with project name input. On submit: inserts into `vf_projects` via Supabase client. Revalidates project list.

**Step 4: Verify CRUD**

Start dev server (`npm run dev` in web/). Sign in. Create a project. Verify it appears in the list. Delete it.

**Step 5: Commit**
```bash
git add web/src/app/dashboard/page.tsx web/src/components/dashboard/
git commit -m "feat: project list page with create/delete"
```

---

### Task 8: Project Overview Page

**Files:**
- Create: `web/src/app/dashboard/[projectId]/page.tsx`
- Create: `web/src/components/dashboard/surfaces-panel.tsx`
- Create: `web/src/components/dashboard/variants-panel.tsx`
- Create: `web/src/components/dashboard/add-surface-form.tsx`

**Step 1: Create project overview page**

`web/src/app/dashboard/[projectId]/page.tsx` — Server component. Fetches project + surfaces + variants. Two-column layout: surfaces left, variants right.

**Step 2: Create surfaces panel**

`web/src/components/dashboard/surfaces-panel.tsx` — Lists surfaces with path, format, strategy. Edit base_content button. Delete surface button. "Add Surface" button at bottom.

**Step 3: Create add surface form**

`web/src/components/dashboard/add-surface-form.tsx` — Client component. Form with path, format (json/yaml dropdown), strategy (merge/replace dropdown), base_content (Monaco editor). Inserts into `vf_surfaces`.

**Step 4: Create variants panel**

`web/src/components/dashboard/variants-panel.tsx` — Grid of variant cards. Each shows name, override count, validation status badge. Click navigates to variant editor. "Create Variant" button.

**Step 5: Verify**

Create a project, add 2 surfaces, create 2 variants. Verify everything renders.

**Step 6: Commit**
```bash
git add web/src/app/dashboard/\[projectId\]/ web/src/components/dashboard/
git commit -m "feat: project overview with surfaces and variants panels"
```

---

### Task 9: Variant Editor Page

**Files:**
- Create: `web/src/app/dashboard/[projectId]/[variantId]/page.tsx`
- Create: `web/src/components/dashboard/override-editor.tsx`
- Create: `web/src/components/dashboard/resolved-preview.tsx`

This is the most complex page — the core "wow" feature.

**Step 1: Create variant editor page**

`web/src/app/dashboard/[projectId]/[variantId]/page.tsx` — Server component. Fetches variant + all surfaces + existing overrides. Renders accordion/tabs for each surface.

**Step 2: Create override editor**

`web/src/components/dashboard/override-editor.tsx` — Client component. For each surface:
- Left panel: Monaco editor showing `base_content` (read-only, dimmed)
- Right panel: Monaco editor for override content (editable)
- Bottom panel: Resolved preview (live merge using `applyMergePatch`)

Monaco config:
```typescript
{
  language: surface.format === "yaml" ? "yaml" : "json",
  theme: "vs-dark",
  minimap: { enabled: false },
  fontSize: 13,
  lineNumbers: "on",
  scrollBeyondLastLine: false,
  automaticLayout: true,
}
```

On override change:
1. Parse override content
2. Parse base content
3. Call `applyMergePatch(base, override)`
4. Display resolved result in preview panel
5. Show validation errors inline (parse failures, stale keys)

**Step 3: Create resolved preview**

`web/src/components/dashboard/resolved-preview.tsx` — Client component. Takes base + override content + format + strategy. Computes merged result using `applyMergePatch`. Displays in read-only Monaco with syntax highlighting. Shows diff markers for overridden keys.

**Step 4: Add save/delete functionality**

- Save: Upsert into `vf_overrides` (variant_id + surface_id → content)
- Delete: Delete from `vf_overrides` to revert surface to base
- Both revalidate the page data

**Step 5: Verify full flow**

1. Create project with 2 surfaces
2. Add base content to each surface
3. Create a variant
4. Navigate to variant editor
5. Type override JSON in editor
6. Verify live preview shows merged result
7. Save and reload — override persists

**Step 6: Commit**
```bash
git add web/src/app/dashboard/\[projectId\]/\[variantId\]/ web/src/components/dashboard/
git commit -m "feat: variant editor with Monaco and live merge preview"
```

---

### Task 10: Validation UI

**Files:**
- Modify: `web/src/components/dashboard/variants-panel.tsx` (add badges)
- Create: `web/src/lib/validate.ts`

**Step 1: Create client-side validation**

`web/src/lib/validate.ts` — Port the validation logic from `src/commands/validate.ts` to work with Supabase data (surfaces + overrides objects instead of filesystem). Returns `ValidationIssue[]`.

Check for:
- Stale keys (override key not in base)
- Parse errors (invalid JSON/YAML)
- Invalid shape (non-object override for merge strategy)

**Step 2: Add validation badges to variant cards**

In `variants-panel.tsx`, run validation for each variant's overrides against surfaces. Show green/yellow/red badge based on issue count.

**Step 3: Add validation details in variant editor**

In the override editor, show inline validation warnings below the editor: stale keys highlighted in yellow, parse errors in red.

**Step 4: Commit**
```bash
git add web/src/lib/validate.ts web/src/components/dashboard/
git commit -m "feat: client-side validation with inline warnings"
```

---

### Task 11: Deploy & Smoke Test

**Files:**
- None (Vercel deploy + env vars)

**Step 1: Set Vercel environment variables**

```bash
cd web
npx vercel env add NEXT_PUBLIC_SUPABASE_URL
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
```

**Step 2: Deploy**

```bash
npx vercel --prod
```

**Step 3: Smoke test the full flow**

1. Visit deployed URL → landing page loads
2. Click "Get Started" → redirects to /login
3. Sign in with GitHub → redirected to /dashboard
4. Create a project "demo"
5. Add surface `config/features.json` (json, merge strategy)
6. Paste base content: `{"dark_mode": false, "max_users": 100}`
7. Create variant "acme"
8. Open variant editor
9. Type override: `{"dark_mode": true, "max_users": 500}`
10. Verify live preview shows: `{"dark_mode": true, "max_users": 500}`
11. Save override, reload page — persists
12. Check validation — no warnings

**Step 4: Final commit & push**
```bash
git add -A
git commit -m "chore: dashboard v1 complete"
git push origin main
```
