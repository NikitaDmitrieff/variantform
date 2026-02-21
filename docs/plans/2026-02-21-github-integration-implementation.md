# GitHub Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Connect the variantform dashboard to GitHub repos via a GitHub App so that Git is the source of truth — surfaces, variants, and overrides are read from and written to the repo, not Supabase.

**Architecture:** A GitHub App provides repo access. Next.js API routes serve as the backend, minting installation tokens and proxying GitHub API calls. Supabase stores only project metadata (which user owns which repo connection). The frontend is refactored to call these API routes instead of Supabase directly for config data.

**Tech Stack:** Next.js 16 API routes, Octokit (`@octokit/app` + `@octokit/rest`), Supabase (auth + project metadata only), existing merge/validate logic unchanged.

---

### Task 1: Install dependencies and add environment variables

**Files:**
- Modify: `web/package.json`
- Modify: `web/.env.local`
- Create: `web/.env.example`

**Step 1: Install Octokit packages**

Run: `cd /Users/nikitadmitrieff/Projects/variantform/web && npm install @octokit/app @octokit/rest`

**Step 2: Add environment variables to `.env.local`**

Add to `web/.env.local`:
```
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=
GITHUB_APP_WEBHOOK_SECRET=
SUPABASE_SERVICE_ROLE_KEY=
```

Leave values empty — they'll be filled after the GitHub App is registered in Task 2.

**Step 3: Create `.env.example`**

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=
GITHUB_APP_WEBHOOK_SECRET=
```

**Step 4: Commit**

```bash
git add web/package.json web/package-lock.json web/.env.example
git commit -m "chore: add Octokit dependencies and env template for GitHub App"
```

---

### Task 2: Register GitHub App and configure credentials

This is a **manual step** — cannot be automated.

**Step 1: Register the GitHub App**

Go to https://github.com/settings/apps/new and fill in:

| Field | Value |
|-------|-------|
| App name | Variantform |
| Homepage URL | `http://localhost:3000` (update later) |
| Callback URL | `http://localhost:3000/api/github/callback` |
| Setup URL | `http://localhost:3000/api/github/install` |
| Webhook Active | Unchecked (not needed yet) |
| Repository permissions → Contents | Read & write |
| Repository permissions → Metadata | Read-only |
| Where can this app be installed? | Any account |

**Step 2: Generate a private key**

After creation, click "Generate a private key". Download the `.pem` file.

**Step 3: Fill in `.env.local`**

```env
GITHUB_APP_ID=<app-id-from-settings>
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
```

Note: The private key must be a single line with `\n` for newlines, or use the file path approach with `GITHUB_APP_PRIVATE_KEY_PATH`.

**Step 4: Get Supabase service role key**

Go to Supabase dashboard → Settings → API → `service_role` key. Add to `.env.local`:

```env
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

**Step 5: No commit** — `.env.local` is gitignored.

---

### Task 3: Create server-side Supabase admin client

**Files:**
- Create: `web/src/lib/supabase/admin.ts`

**Step 1: Write the admin client**

```typescript
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
```

**Step 2: Commit**

```bash
git add web/src/lib/supabase/admin.ts
git commit -m "feat: add server-side Supabase admin client"
```

---

### Task 4: Create GitHub App utility module

**Files:**
- Create: `web/src/lib/github.ts`

**Step 1: Write the GitHub utility**

```typescript
import { App } from "@octokit/app";
import { Octokit } from "@octokit/rest";

let app: App | null = null;

function getApp(): App {
  if (!app) {
    app = new App({
      appId: process.env.GITHUB_APP_ID!,
      privateKey: process.env.GITHUB_APP_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    });
  }
  return app;
}

/** Get an authenticated Octokit instance for a specific installation. */
export async function getInstallationOctokit(installationId: number): Promise<Octokit> {
  const ghApp = getApp();
  return (await ghApp.getInstallationOctokit(installationId)) as unknown as Octokit;
}

/** Parse "owner/repo" into components. */
export function parseRepo(fullName: string): { owner: string; repo: string } {
  const [owner, repo] = fullName.split("/");
  if (!owner || !repo) throw new Error(`Invalid repo: "${fullName}"`);
  return { owner, repo };
}
```

**Step 2: Commit**

```bash
git add web/src/lib/github.ts
git commit -m "feat: add GitHub App utility for minting installation tokens"
```

---

### Task 5: Migrate `vf_projects` schema and add Supabase migration

**Files:**
- Create: `web/supabase/migrations/002_github_integration.sql`
- Modify: `web/src/lib/types.ts`

**Step 1: Write the SQL migration**

```sql
-- Add GitHub fields to vf_projects
ALTER TABLE vf_projects
  ADD COLUMN github_repo text,
  ADD COLUMN github_installation_id bigint,
  ADD COLUMN default_branch text DEFAULT 'main';

-- Drop tables that are now served from Git
DROP TABLE IF EXISTS vf_overrides;
DROP TABLE IF EXISTS vf_surfaces;
DROP TABLE IF EXISTS vf_variants;
```

**Step 2: Run the migration**

Run this SQL in the Supabase SQL Editor (dashboard → SQL Editor → New Query → paste and run). Alternatively, if using Supabase CLI:

```bash
supabase db push
```

**Step 3: Update types**

Replace `web/src/lib/types.ts` with:

```typescript
export interface Project {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  github_repo: string | null;
  github_installation_id: number | null;
  default_branch: string;
  surface_count?: number;
  variant_count?: number;
}

export interface Surface {
  path: string;
  format: "json" | "yaml";
  strategy: "merge" | "replace";
  base_content: string;
}

export interface Variant {
  name: string;
  override_count: number;
}

export interface Override {
  surface_path: string;
  content: string;
  sha: string; // GitHub blob SHA for updates
}
```

**Step 4: Commit**

```bash
git add web/supabase/migrations/002_github_integration.sql web/src/lib/types.ts
git commit -m "feat: migrate schema — add GitHub fields, drop Supabase config tables"
```

---

### Task 6: GitHub App installation callback route

**Files:**
- Create: `web/src/app/api/github/install/route.ts`

**Step 1: Write the installation callback**

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const installationId = searchParams.get("installation_id");
  const setupAction = searchParams.get("setup_action"); // "install" | "update"

  if (!installationId) {
    return NextResponse.redirect(`${origin}/dashboard?error=missing_installation`);
  }

  // Store installation_id in the session/cookie for use during project creation
  const response = NextResponse.redirect(
    `${origin}/dashboard?installation_id=${installationId}&setup_action=${setupAction ?? "install"}`
  );

  return response;
}
```

**Step 2: Commit**

```bash
git add web/src/app/api/github/install/route.ts
git commit -m "feat: add GitHub App installation callback route"
```

---

### Task 7: API route — list repos accessible to the installation

**Files:**
- Create: `web/src/app/api/github/repos/route.ts`

**Step 1: Write the repos list route**

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getInstallationOctokit } from "@/lib/github";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const installationId = searchParams.get("installation_id");
  if (!installationId) {
    return NextResponse.json({ error: "installation_id required" }, { status: 400 });
  }

  try {
    const octokit = await getInstallationOctokit(Number(installationId));
    const { data } = await octokit.apps.listReposAccessibleToInstallation({ per_page: 100 });

    const repos = data.repositories.map((r) => ({
      full_name: r.full_name,
      default_branch: r.default_branch,
      private: r.private,
    }));

    return NextResponse.json({ repos });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to list repos" },
      { status: 500 }
    );
  }
}
```

**Step 2: Commit**

```bash
git add web/src/app/api/github/repos/route.ts
git commit -m "feat: add API route to list repos accessible to GitHub App installation"
```

---

### Task 8: API route — read project data from repo

**Files:**
- Create: `web/src/app/api/projects/[id]/surfaces/route.ts`
- Create: `web/src/app/api/projects/[id]/variants/route.ts`
- Create: `web/src/app/api/projects/[id]/variants/[name]/route.ts`
- Create: `web/src/lib/github-repo.ts`

**Step 1: Write the shared GitHub repo reader**

`web/src/lib/github-repo.ts`:

```typescript
import { getInstallationOctokit, parseRepo } from "./github";
import yaml from "js-yaml";
import type { Octokit } from "@octokit/rest";

interface RepoContext {
  octokit: Octokit;
  owner: string;
  repo: string;
  branch: string;
}

export async function getRepoContext(
  installationId: number,
  githubRepo: string,
  branch: string
): Promise<RepoContext> {
  const octokit = await getInstallationOctokit(installationId);
  const { owner, repo } = parseRepo(githubRepo);
  return { octokit, owner, repo, branch };
}

/** Fetch and parse .variantform.yaml from the repo. */
export async function fetchConfig(ctx: RepoContext) {
  const { data } = await ctx.octokit.repos.getContent({
    owner: ctx.owner,
    repo: ctx.repo,
    path: ".variantform.yaml",
    ref: ctx.branch,
  });

  if (Array.isArray(data) || data.type !== "file") {
    throw new Error(".variantform.yaml is not a file");
  }

  const content = Buffer.from(data.content, "base64").toString("utf-8");
  const parsed = yaml.load(content) as { surfaces?: unknown[] };

  if (!parsed?.surfaces || !Array.isArray(parsed.surfaces)) {
    throw new Error(".variantform.yaml must contain a 'surfaces' array");
  }

  return parsed.surfaces.map((s: any) => ({
    path: s.path as string,
    format: s.format as "json" | "yaml",
    strategy: (s.strategy || "merge") as "merge" | "replace",
  }));
}

/** Fetch a single file's content from the repo. Returns content + SHA. */
export async function fetchFile(
  ctx: RepoContext,
  path: string
): Promise<{ content: string; sha: string } | null> {
  try {
    const { data } = await ctx.octokit.repos.getContent({
      owner: ctx.owner,
      repo: ctx.repo,
      path,
      ref: ctx.branch,
    });

    if (Array.isArray(data) || data.type !== "file") return null;

    return {
      content: Buffer.from(data.content, "base64").toString("utf-8"),
      sha: data.sha,
    };
  } catch (e: any) {
    if (e.status === 404) return null;
    throw e;
  }
}

/** List subdirectories under a path (e.g., variants/). */
export async function listDirectories(
  ctx: RepoContext,
  path: string
): Promise<string[]> {
  try {
    const { data } = await ctx.octokit.repos.getContent({
      owner: ctx.owner,
      repo: ctx.repo,
      path,
      ref: ctx.branch,
    });

    if (!Array.isArray(data)) return [];
    return data.filter((d) => d.type === "dir").map((d) => d.name);
  } catch (e: any) {
    if (e.status === 404) return [];
    throw e;
  }
}

/** Create or update a file in the repo. */
export async function putFile(
  ctx: RepoContext,
  path: string,
  content: string,
  message: string,
  existingSha?: string
): Promise<void> {
  await ctx.octokit.repos.createOrUpdateFileContents({
    owner: ctx.owner,
    repo: ctx.repo,
    path,
    message,
    content: Buffer.from(content).toString("base64"),
    branch: ctx.branch,
    ...(existingSha ? { sha: existingSha } : {}),
  });
}

/** Delete a file from the repo. */
export async function deleteFile(
  ctx: RepoContext,
  path: string,
  sha: string,
  message: string
): Promise<void> {
  await ctx.octokit.repos.deleteFile({
    owner: ctx.owner,
    repo: ctx.repo,
    path,
    message,
    sha,
    branch: ctx.branch,
  });
}
```

**Step 2: Write the surfaces API route**

`web/src/app/api/projects/[id]/surfaces/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRepoContext, fetchConfig, fetchFile } from "@/lib/github-repo";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: project } = await supabase
    .from("vf_projects")
    .select("github_repo, github_installation_id, default_branch")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!project?.github_repo || !project.github_installation_id) {
    return NextResponse.json({ error: "Project not connected to GitHub" }, { status: 400 });
  }

  try {
    const ctx = await getRepoContext(
      project.github_installation_id,
      project.github_repo,
      project.default_branch
    );

    const surfaceDefs = await fetchConfig(ctx);

    // Fetch base content for each surface
    const surfaces = await Promise.all(
      surfaceDefs.map(async (s) => {
        const file = await fetchFile(ctx, s.path);
        return {
          ...s,
          base_content: file?.content ?? "",
        };
      })
    );

    return NextResponse.json({ surfaces });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to read repo" },
      { status: 500 }
    );
  }
}
```

**Step 3: Write the variants list API route**

`web/src/app/api/projects/[id]/variants/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getRepoContext,
  fetchConfig,
  listDirectories,
  fetchFile,
  putFile,
} from "@/lib/github-repo";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: project } = await supabase
    .from("vf_projects")
    .select("github_repo, github_installation_id, default_branch")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!project?.github_repo || !project.github_installation_id) {
    return NextResponse.json({ error: "Project not connected to GitHub" }, { status: 400 });
  }

  try {
    const ctx = await getRepoContext(
      project.github_installation_id,
      project.github_repo,
      project.default_branch
    );

    const surfaceDefs = await fetchConfig(ctx);
    const variantNames = await listDirectories(ctx, "variants");

    // For each variant, count how many overrides exist
    const variants = await Promise.all(
      variantNames.map(async (name) => {
        let overrideCount = 0;
        for (const s of surfaceDefs) {
          const file = await fetchFile(ctx, `variants/${name}/${s.path}`);
          if (file) overrideCount++;
        }
        return { name, override_count: overrideCount };
      })
    );

    return NextResponse.json({ variants });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to read repo" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await request.json();
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const { data: project } = await supabase
    .from("vf_projects")
    .select("github_repo, github_installation_id, default_branch")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!project?.github_repo || !project.github_installation_id) {
    return NextResponse.json({ error: "Project not connected to GitHub" }, { status: 400 });
  }

  try {
    const ctx = await getRepoContext(
      project.github_installation_id,
      project.github_repo,
      project.default_branch
    );

    // Create a .gitkeep file in the variant directory
    await putFile(
      ctx,
      `variants/${name}/.gitkeep`,
      "",
      `variantform: create variant "${name}"`
    );

    return NextResponse.json({ name }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create variant" },
      { status: 500 }
    );
  }
}
```

**Step 4: Write the single variant (overrides) API route**

`web/src/app/api/projects/[id]/variants/[name]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getRepoContext,
  fetchConfig,
  fetchFile,
  putFile,
  deleteFile,
} from "@/lib/github-repo";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; name: string }> }
) {
  const { id, name } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: project } = await supabase
    .from("vf_projects")
    .select("github_repo, github_installation_id, default_branch")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!project?.github_repo || !project.github_installation_id) {
    return NextResponse.json({ error: "Project not connected to GitHub" }, { status: 400 });
  }

  try {
    const ctx = await getRepoContext(
      project.github_installation_id,
      project.github_repo,
      project.default_branch
    );

    const surfaceDefs = await fetchConfig(ctx);

    // Fetch surfaces with base content + overrides
    const surfaces = await Promise.all(
      surfaceDefs.map(async (s) => {
        const [base, override] = await Promise.all([
          fetchFile(ctx, s.path),
          fetchFile(ctx, `variants/${name}/${s.path}`),
        ]);
        return {
          ...s,
          base_content: base?.content ?? "",
          override: override
            ? { surface_path: s.path, content: override.content, sha: override.sha }
            : null,
        };
      })
    );

    return NextResponse.json({ surfaces });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to read variant" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; name: string }> }
) {
  const { id, name } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { surface_path, content, sha } = await request.json();
  if (!surface_path || typeof content !== "string") {
    return NextResponse.json({ error: "surface_path and content required" }, { status: 400 });
  }

  const { data: project } = await supabase
    .from("vf_projects")
    .select("github_repo, github_installation_id, default_branch")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!project?.github_repo || !project.github_installation_id) {
    return NextResponse.json({ error: "Project not connected to GitHub" }, { status: 400 });
  }

  try {
    const ctx = await getRepoContext(
      project.github_installation_id,
      project.github_repo,
      project.default_branch
    );

    const filePath = `variants/${name}/${surface_path}`;
    await putFile(
      ctx,
      filePath,
      content,
      `variantform: update ${name}/${surface_path}`,
      sha || undefined
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to save override" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; name: string }> }
) {
  const { id, name } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { surface_path, sha } = await request.json();
  if (!surface_path || !sha) {
    return NextResponse.json({ error: "surface_path and sha required" }, { status: 400 });
  }

  const { data: project } = await supabase
    .from("vf_projects")
    .select("github_repo, github_installation_id, default_branch")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!project?.github_repo || !project.github_installation_id) {
    return NextResponse.json({ error: "Project not connected to GitHub" }, { status: 400 });
  }

  try {
    const ctx = await getRepoContext(
      project.github_installation_id,
      project.github_repo,
      project.default_branch
    );

    await deleteFile(
      ctx,
      `variants/${name}/${surface_path}`,
      sha,
      `variantform: remove ${name}/${surface_path}`
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to delete override" },
      { status: 500 }
    );
  }
}
```

**Step 5: Commit**

```bash
git add web/src/lib/github-repo.ts web/src/app/api/projects/
git commit -m "feat: add API routes for reading/writing repo data via GitHub App"
```

---

### Task 9: Refactor "New Project" flow — connect a repo instead of naming a project

**Files:**
- Modify: `web/src/app/dashboard/page.tsx`
- Rewrite: `web/src/components/dashboard/create-project-modal.tsx`

**Step 1: Rewrite the create project modal**

Replace `web/src/components/dashboard/create-project-modal.tsx` with a two-step flow:

1. If no `installation_id` in URL, show a button that links to the GitHub App install URL
2. If `installation_id` is present, fetch accessible repos and let user pick one

```typescript
"use client";

import { useState, useEffect } from "react";
import { X, Loader2, GitBranch } from "lucide-react";

interface CreateProjectModalProps {
  open: boolean;
  installationId: string | null;
  onClose: () => void;
  onCreate: (repo: string, installationId: number, defaultBranch: string) => Promise<void>;
}

interface Repo {
  full_name: string;
  default_branch: string;
  private: boolean;
}

const GITHUB_APP_SLUG = "variantform"; // Update after app registration

export function CreateProjectModal({
  open,
  installationId,
  onClose,
  onCreate,
}: CreateProjectModalProps) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !installationId) return;
    setLoading(true);
    fetch(`/api/github/repos?installation_id=${installationId}`)
      .then((r) => r.json())
      .then((data) => setRepos(data.repos ?? []))
      .catch(() => setError("Failed to load repos"))
      .finally(() => setLoading(false));
  }, [open, installationId]);

  if (!open) return null;

  async function handleSelect(repo: Repo) {
    setCreating(true);
    setError(null);
    try {
      await onCreate(repo.full_name, Number(installationId), repo.default_branch);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <div className="slide-over-backdrop" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="glass-card w-full max-w-md p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium text-fg">Connect Repository</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-muted transition-colors hover:bg-white/[0.06] hover:text-fg"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {!installationId ? (
            <div className="space-y-4">
              <p className="text-xs text-muted">
                Install the Variantform GitHub App on your repository first.
                The repo must have <code className="text-accent">.variantform.yaml</code> (run{" "}
                <code className="text-accent">variantform init</code> first).
              </p>
              <a
                href={`https://github.com/apps/${GITHUB_APP_SLUG}/installations/new`}
                className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium"
              >
                <GitBranch className="h-4 w-4" />
                Install GitHub App
              </a>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted" />
            </div>
          ) : repos.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted">
              No repositories found. Make sure you granted access to at least one repo.
            </p>
          ) : (
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {repos.map((repo) => (
                <button
                  key={repo.full_name}
                  onClick={() => handleSelect(repo)}
                  disabled={creating}
                  className="glass-card flex w-full items-center gap-3 p-3 text-left transition-all hover:border-accent/30"
                >
                  <GitBranch className="h-4 w-4 shrink-0 text-accent" />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-fg">
                      {repo.full_name}
                    </p>
                    <p className="text-[11px] text-muted">
                      {repo.default_branch} &middot; {repo.private ? "private" : "public"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {error && <p className="mt-3 text-xs text-danger">{error}</p>}
        </div>
      </div>
    </>
  );
}
```

**Step 2: Update the dashboard page**

Modify `web/src/app/dashboard/page.tsx`:

- Read `installation_id` from URL search params
- Change `handleCreate` to accept `(repo, installationId, defaultBranch)` instead of `(name)`
- Insert into `vf_projects` with `name` derived from repo (e.g., `owner/repo` → use repo part as name), plus `github_repo`, `github_installation_id`, `default_branch`
- Remove the enrichment queries that counted surfaces/variants from Supabase (they no longer exist)
- For surface/variant counts, either show "—" or fetch from the API

```typescript
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Plus } from "lucide-react";
import { ProjectCard } from "@/components/dashboard/project-card";
import { CreateProjectModal } from "@/components/dashboard/create-project-modal";
import type { Project } from "@/lib/types";

export default function DashboardPage() {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();
  const installationId = searchParams.get("installation_id");

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Auto-open modal if returning from GitHub App installation
  useEffect(() => {
    if (installationId) setModalOpen(true);
  }, [installationId]);

  const fetchProjects = useCallback(async () => {
    const { data } = await supabase
      .from("vf_projects")
      .select("*")
      .order("created_at", { ascending: false });

    setProjects((data ?? []) as Project[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  async function handleCreate(
    repo: string,
    ghInstallationId: number,
    defaultBranch: string
  ) {
    const name = repo.split("/")[1] || repo;
    const { error } = await supabase.from("vf_projects").insert({
      name,
      github_repo: repo,
      github_installation_id: ghInstallationId,
      default_branch: defaultBranch,
    });
    if (error) throw new Error(error.message);
    await fetchProjects();
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("vf_projects").delete().eq("id", id);
    if (error) return;
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-fg">Projects</h1>
          <p className="mt-0.5 text-xs text-muted">
            Manage your configuration variant projects
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="btn-primary flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium"
        >
          <Plus className="h-3.5 w-3.5" />
          Connect Repo
        </button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-32" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-16">
          <p className="text-sm text-muted">No projects yet</p>
          <button
            onClick={() => setModalOpen(true)}
            className="mt-3 text-xs text-accent transition-colors hover:text-fg"
          >
            Connect your first repository
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <CreateProjectModal
        open={modalOpen}
        installationId={installationId}
        onClose={() => setModalOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}
```

**Step 3: Update ProjectCard to show repo name**

Modify `web/src/components/dashboard/project-card.tsx` — show `project.github_repo` instead of surface/variant counts (or show both). The counts will be fetched dynamically on the project overview page.

**Step 4: Commit**

```bash
git add web/src/app/dashboard/page.tsx web/src/components/dashboard/create-project-modal.tsx web/src/components/dashboard/project-card.tsx
git commit -m "feat: refactor New Project flow to connect GitHub repos"
```

---

### Task 10: Refactor project overview to read from GitHub API

**Files:**
- Modify: `web/src/app/dashboard/[projectId]/page.tsx`
- Modify: `web/src/components/dashboard/surfaces-panel.tsx`
- Modify: `web/src/components/dashboard/variants-panel.tsx`
- Delete: `web/src/components/dashboard/add-surface-form.tsx`

**Step 1: Rewrite the project overview page**

Replace all Supabase queries with `fetch()` calls to the new API routes:

```typescript
"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SurfacesPanel } from "@/components/dashboard/surfaces-panel";
import { VariantsPanel } from "@/components/dashboard/variants-panel";
import type { Surface, Variant, Project } from "@/lib/types";

export default function ProjectOverviewPage() {
  const { projectId } = useParams<{ projectId: string }>();

  const [project, setProject] = useState<Project | null>(null);
  const [surfaces, setSurfaces] = useState<Surface[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      // Fetch project metadata from Supabase
      const supabase = createClient();
      const { data: proj } = await supabase
        .from("vf_projects")
        .select("*")
        .eq("id", projectId)
        .single();
      setProject(proj as Project);

      // Fetch surfaces and variants from GitHub via API
      const [surfacesRes, variantsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/surfaces`),
        fetch(`/api/projects/${projectId}/variants`),
      ]);

      if (!surfacesRes.ok || !variantsRes.ok) {
        throw new Error("Failed to load project data from repository");
      }

      const surfacesData = await surfacesRes.json();
      const variantsData = await variantsRes.json();

      setSurfaces(surfacesData.surfaces ?? []);
      setVariants(variantsData.variants ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load project");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleAddVariant(name: string) {
    const res = await fetch(`/api/projects/${projectId}/variants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to create variant");
    }
    await fetchData();
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="skeleton h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="skeleton h-64" />
          <div className="skeleton h-64" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="glass-card p-8 text-center">
          <p className="text-sm text-danger">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-lg font-medium text-fg">{project?.name}</h1>
        <p className="mt-0.5 text-xs text-muted">
          {project?.github_repo} &middot; {surfaces.length} surfaces &middot;{" "}
          {variants.length} variants
        </p>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="stat-card">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
            Surfaces
          </span>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums text-fg">
            {surfaces.length}
          </p>
        </div>
        <div className="stat-card">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
            Variants
          </span>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums text-fg">
            {variants.length}
          </p>
        </div>
        <div className="stat-card">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
            Overrides
          </span>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums text-fg">
            {variants.reduce((sum, v) => sum + v.override_count, 0)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SurfacesPanel surfaces={surfaces} />
        <VariantsPanel
          projectId={projectId}
          variants={variants}
          onAdd={handleAddVariant}
        />
      </div>
    </div>
  );
}
```

**Step 2: Simplify SurfacesPanel (read-only, no add/delete)**

Rewrite `web/src/components/dashboard/surfaces-panel.tsx` to be read-only — remove the Add button and the `onAdd`/`onDelete` props. Surfaces are defined by `.variantform.yaml` in the repo.

```typescript
"use client";

import { FileJson, FileText } from "lucide-react";
import type { Surface } from "@/lib/types";

interface SurfacesPanelProps {
  surfaces: Surface[];
}

export function SurfacesPanel({ surfaces }: SurfacesPanelProps) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-fg">Surfaces</h2>
        <span className="text-[11px] text-muted">from .variantform.yaml</span>
      </div>

      <div className="space-y-2">
        {surfaces.map((s) => (
          <div
            key={s.path}
            className="glass-card flex items-center gap-3 p-3"
          >
            {s.format === "json" ? (
              <FileJson className="h-4 w-4 shrink-0 text-accent" />
            ) : (
              <FileText className="h-4 w-4 shrink-0 text-accent" />
            )}
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-fg font-[family-name:var(--font-code)]">
                {s.path}
              </p>
              <p className="mt-0.5 text-[11px] text-muted">
                {s.format} &middot; {s.strategy}
              </p>
            </div>
          </div>
        ))}

        {surfaces.length === 0 && (
          <p className="py-4 text-center text-xs text-muted">
            No surfaces in .variantform.yaml
          </p>
        )}
      </div>
    </div>
  );
}
```

**Step 3: Simplify VariantsPanel**

Remove the `validationMap` prop (validation will happen in the editor, not the overview). Remove database IDs — variants are identified by name. Update the link to use variant name instead of ID.

```typescript
"use client";

import { useState } from "react";
import Link from "next/link";
import { GitBranch, Plus, Loader2 } from "lucide-react";
import type { Variant } from "@/lib/types";

interface VariantsPanelProps {
  projectId: string;
  variants: Variant[];
  onAdd: (name: string) => Promise<void>;
}

export function VariantsPanel({
  projectId,
  variants,
  onAdd,
}: VariantsPanelProps) {
  const [showInput, setShowInput] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await onAdd(name.trim());
      setName("");
      setShowInput(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-fg">Variants</h2>
        <button
          onClick={() => setShowInput(true)}
          className="btn flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-xs text-muted transition-colors hover:bg-white/[0.06] hover:text-fg"
        >
          <Plus className="h-3 w-3" />
          Create
        </button>
      </div>

      <div className="space-y-2">
        {variants.map((v) => (
          <Link
            key={v.name}
            href={`/dashboard/${projectId}/${encodeURIComponent(v.name)}`}
            className="glass-card group flex items-center justify-between p-3 transition-all"
          >
            <div className="flex items-center gap-3">
              <GitBranch className="h-4 w-4 shrink-0 text-accent" />
              <div>
                <p className="text-xs font-medium text-fg">{v.name}</p>
                <p className="mt-0.5 text-[11px] text-muted">
                  {v.override_count} overrides
                </p>
              </div>
            </div>
          </Link>
        ))}

        {variants.length === 0 && !showInput && (
          <p className="py-4 text-center text-xs text-muted">
            No variants created yet
          </p>
        )}

        {showInput && (
          <form onSubmit={handleCreate} className="glass-card flex items-center gap-2 p-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="acme"
              className="input-field flex-1"
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="btn-primary flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium"
            >
              {loading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                "Create"
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowInput(false);
                setName("");
              }}
              className="rounded-lg p-1.5 text-muted hover:text-fg"
            >
              &times;
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
```

**Step 4: Delete `add-surface-form.tsx`**

Remove `web/src/components/dashboard/add-surface-form.tsx` — surfaces are now read-only.

**Step 5: Commit**

```bash
git add web/src/app/dashboard/\[projectId\]/page.tsx web/src/components/dashboard/surfaces-panel.tsx web/src/components/dashboard/variants-panel.tsx
git rm web/src/components/dashboard/add-surface-form.tsx
git commit -m "feat: refactor project overview to read from GitHub repo"
```

---

### Task 11: Refactor variant editor to read/write via GitHub API

**Files:**
- Modify: `web/src/app/dashboard/[projectId]/[variantId]/page.tsx`
- Modify: `web/src/components/dashboard/override-editor.tsx`

**Step 1: Rewrite the variant editor page**

The route changes from `[variantId]` (UUID) to `[variantName]` (string). Update the file at `web/src/app/dashboard/[projectId]/[variantId]/page.tsx` — the dynamic segment name can stay as `[variantId]` in the filesystem but we'll treat the param as the variant name:

```typescript
"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { OverrideEditor } from "@/components/dashboard/override-editor";
import { ArrowLeft } from "lucide-react";
import type { Surface, Override } from "@/lib/types";

interface SurfaceWithOverride extends Surface {
  override: Override | null;
}

export default function VariantEditorPage() {
  const { projectId, variantId: variantName } = useParams<{
    projectId: string;
    variantId: string;
  }>();
  const router = useRouter();

  const [projectName, setProjectName] = useState("");
  const [surfaces, setSurfaces] = useState<SurfaceWithOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: proj } = await supabase
        .from("vf_projects")
        .select("name")
        .eq("id", projectId)
        .single();
      if (proj) setProjectName(proj.name);

      const res = await fetch(
        `/api/projects/${projectId}/variants/${encodeURIComponent(variantName)}`
      );
      if (!res.ok) throw new Error("Failed to load variant data");

      const data = await res.json();
      setSurfaces(data.surfaces ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load variant");
    } finally {
      setLoading(false);
    }
  }, [projectId, variantName]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSave(surfacePath: string, content: string, sha?: string) {
    const res = await fetch(
      `/api/projects/${projectId}/variants/${encodeURIComponent(variantName)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surface_path: surfacePath, content, sha }),
      }
    );
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to save");
    }
    await fetchData();
  }

  async function handleDelete(surfacePath: string, sha: string) {
    const res = await fetch(
      `/api/projects/${projectId}/variants/${encodeURIComponent(variantName)}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surface_path: surfacePath, sha }),
      }
    );
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to delete");
    }
    await fetchData();
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="skeleton h-8 w-64" />
        <div className="skeleton h-96" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="glass-card p-8 text-center">
          <p className="text-sm text-danger">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <button
          onClick={() => router.push(`/dashboard/${projectId}`)}
          className="mb-2 flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to {projectName}
        </button>
        <h1 className="text-lg font-medium text-fg">
          Variant: <span className="text-accent">{decodeURIComponent(variantName)}</span>
        </h1>
        <p className="mt-0.5 text-xs text-muted">
          Edit overrides for each surface. Changes are committed directly to the repo.
        </p>
      </div>

      {surfaces.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-16">
          <p className="text-sm text-muted">
            No surfaces declared in .variantform.yaml
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {surfaces.map((surface) => (
            <OverrideEditor
              key={surface.path}
              surface={surface}
              override={surface.override}
              onSave={handleSave}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Update OverrideEditor props**

Modify `web/src/components/dashboard/override-editor.tsx`:

- Change `onSave` signature from `(surfaceId: string, content: string)` to `(surfacePath: string, content: string, sha?: string)`
- Change `onDelete` signature from `(surfaceId: string)` to `(surfacePath: string, sha: string)`
- Use `surface.path` instead of `surface.id` as the key
- Track the override's SHA for GitHub API updates

Key changes in the component:

```typescript
interface OverrideEditorProps {
  surface: Surface;
  override: Override | null;
  onSave: (surfacePath: string, content: string, sha?: string) => Promise<void>;
  onDelete: (surfacePath: string, sha: string) => Promise<void>;
}
```

In `handleSave`:
```typescript
await onSave(surface.path, content, override?.sha);
```

In `handleDelete`:
```typescript
if (override?.sha) {
  await onDelete(surface.path, override.sha);
}
```

The rest of the component (Monaco editors, validation, merge preview) stays the same — the merge/validate logic is client-side and format-agnostic.

**Step 3: Commit**

```bash
git add web/src/app/dashboard/\[projectId\]/\[variantId\]/page.tsx web/src/components/dashboard/override-editor.tsx
git commit -m "feat: refactor variant editor to read/write via GitHub API"
```

---

### Task 12: Clean up unused Supabase references and test

**Files:**
- Modify: `web/src/lib/types.ts` (verify final shape)
- Delete: `web/src/lib/validate.ts` imports of removed types (if any)

**Step 1: Search for any remaining Supabase queries to dropped tables**

Run: `cd /Users/nikitadmitrieff/Projects/variantform/web && grep -rn "vf_surfaces\|vf_variants\|vf_overrides" src/`

Fix any remaining references.

**Step 2: Build the project**

Run: `cd /Users/nikitadmitrieff/Projects/variantform/web && npm run build`

Expected: Build succeeds with no type errors.

**Step 3: Test manually**

1. Start dev server: `npm run dev`
2. Log in with GitHub
3. Click "Connect Repo" — should redirect to GitHub App install page
4. After installing on a repo with `.variantform.yaml`, select the repo
5. Project overview should show surfaces from the config and variants from `variants/`
6. Open a variant — editor should show base config from repo
7. Edit an override and save — check the repo for the new commit
8. Delete an override — check the repo for the deletion commit

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "chore: clean up unused Supabase references after GitHub integration"
```

---

### Summary

| Task | What it does |
|------|-------------|
| 1 | Install Octokit, set up env vars |
| 2 | Register GitHub App (manual) |
| 3 | Server-side Supabase admin client |
| 4 | GitHub App utility (token minting) |
| 5 | Migrate DB schema |
| 6 | App installation callback route |
| 7 | API: list accessible repos |
| 8 | API: read/write repo data (surfaces, variants, overrides) |
| 9 | Refactor New Project flow (connect repo) |
| 10 | Refactor project overview (read from GitHub) |
| 11 | Refactor variant editor (read/write via GitHub) |
| 12 | Clean up and test |
