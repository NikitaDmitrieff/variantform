# Dashboard V2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Evolve variantform from a config-file overlay tool into a full-repo customization platform with extended surface types, AI conversational onboarding, and a control plane dashboard.

**Architecture:** Extend the CLI surface type system to support any file format (code, CSS, assets, templates). Add AI chat + worker execution for onboarding. Redesign the dashboard as a control plane (surface map, health monitoring, activity feed, variant diffs) rather than a code editor.

**Tech Stack:** Next.js 16 App Router, Supabase (Postgres + Auth), Claude API (chat), Claude Code CLI (worker), GitHub API (existing), Vitest (testing), Tailwind CSS.

**Design doc:** `docs/plans/2026-02-21-dashboard-v2-design.md`

---

## Task 1: Extend CLI Surface Format Types

**Files:**
- Modify: `src/config.ts:6-12` (type definitions), `src/config.ts:43-49` (validation)
- Test: `tests/config.test.ts`

**Step 1: Write failing tests for new format types**

Add to `tests/config.test.ts`:

```typescript
it("accepts css format with replace strategy", async () => {
  project = await createTestProject();
  await project.writeFile(
    ".variantform.yaml",
    `surfaces:
  - path: "styles/brand.css"
    format: css
    strategy: replace
`
  );
  const config = await loadConfig(project.path);
  expect(config.surfaces[0]).toEqual({
    path: "styles/brand.css",
    format: "css",
    strategy: "replace",
  });
});

it("accepts code format with replace strategy", async () => {
  project = await createTestProject();
  await project.writeFile(
    ".variantform.yaml",
    `surfaces:
  - path: "src/components/Hero.tsx"
    format: code
    strategy: replace
`
  );
  const config = await loadConfig(project.path);
  expect(config.surfaces[0].format).toBe("code");
  expect(config.surfaces[0].strategy).toBe("replace");
});

it("accepts asset format", async () => {
  project = await createTestProject();
  await project.writeFile(
    ".variantform.yaml",
    `surfaces:
  - path: "public/logo.svg"
    format: asset
    strategy: replace
`
  );
  const config = await loadConfig(project.path);
  expect(config.surfaces[0].format).toBe("asset");
});

it("accepts markdown format", async () => {
  project = await createTestProject();
  await project.writeFile(
    ".variantform.yaml",
    `surfaces:
  - path: "content/landing.md"
    format: markdown
    strategy: replace
`
  );
  const config = await loadConfig(project.path);
  expect(config.surfaces[0].format).toBe("markdown");
});

it("accepts template format", async () => {
  project = await createTestProject();
  await project.writeFile(
    ".variantform.yaml",
    `surfaces:
  - path: "templates/welcome.html"
    format: template
    strategy: replace
`
  );
  const config = await loadConfig(project.path);
  expect(config.surfaces[0].format).toBe("template");
});

it("accepts text format", async () => {
  project = await createTestProject();
  await project.writeFile(
    ".variantform.yaml",
    `surfaces:
  - path: ".env.example"
    format: text
    strategy: replace
`
  );
  const config = await loadConfig(project.path);
  expect(config.surfaces[0].format).toBe("text");
});

it("rejects merge strategy for non-json/yaml formats", async () => {
  project = await createTestProject();
  await project.writeFile(
    ".variantform.yaml",
    `surfaces:
  - path: "styles/brand.css"
    format: css
    strategy: merge
`
  );
  await expect(loadConfig(project.path)).rejects.toThrow("merge strategy");
});

it("defaults strategy to replace for non-json/yaml formats", async () => {
  project = await createTestProject();
  await project.writeFile(
    ".variantform.yaml",
    `surfaces:
  - path: "public/logo.svg"
    format: asset
`
  );
  const config = await loadConfig(project.path);
  expect(config.surfaces[0].strategy).toBe("replace");
});
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/nikitadmitrieff/Projects/variantform && npx vitest run tests/config.test.ts`
Expected: FAIL — "Invalid format" errors for css, code, asset, markdown, template, text.

**Step 3: Update type definitions and validation**

In `src/config.ts`, change the `Surface` type and `loadConfig` validation:

```typescript
// Line 1: add new type
export type SurfaceFormat = "json" | "yaml" | "css" | "code" | "markdown" | "asset" | "template" | "text";

// Formats that support merge strategy
const MERGEABLE_FORMATS: SurfaceFormat[] = ["json", "yaml"];

// All valid formats
const VALID_FORMATS: SurfaceFormat[] = ["json", "yaml", "css", "code", "markdown", "asset", "template", "text"];

export type MergeStrategy = "merge" | "replace";

export interface Surface {
  path: string;
  format: SurfaceFormat;
  strategy: MergeStrategy;
}
```

In the validation logic inside `loadConfig` (around line 43):

```typescript
if (!VALID_FORMATS.includes(surface.format as SurfaceFormat)) {
  throw new Error(`Invalid format "${surface.format}". Must be one of: ${VALID_FORMATS.join(", ")}.`);
}

// Default strategy: merge for json/yaml, replace for everything else
const defaultStrategy = MERGEABLE_FORMATS.includes(surface.format as SurfaceFormat) ? "merge" : "replace";
const strategy = (surface.strategy as string) || defaultStrategy;

if (!["merge", "replace"].includes(strategy)) {
  throw new Error(`Invalid strategy "${surface.strategy}". Must be "merge" or "replace".`);
}

// Merge strategy only allowed for json/yaml
if (strategy === "merge" && !MERGEABLE_FORMATS.includes(surface.format as SurfaceFormat)) {
  throw new Error(`Format "${surface.format}" does not support merge strategy. Use replace instead.`);
}
```

**Step 4: Run tests to verify they pass**

Run: `cd /Users/nikitadmitrieff/Projects/variantform && npx vitest run tests/config.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/config.ts tests/config.test.ts
git commit -m "feat: extend surface formats — css, code, asset, markdown, template, text"
```

---

## Task 2: Update CLI Validate Command for New Formats

**Files:**
- Modify: `src/commands/validate.ts:55-126` (format-specific validation)
- Test: `tests/validate.test.ts` (add tests for new formats)

**Step 1: Write failing tests for new format validation**

Add to `tests/validate.test.ts` (follow existing test patterns — use `createTestProject()`):

```typescript
it("validates replace-strategy files exist and are not empty", async () => {
  project = await createTestProject();
  await project.writeFile(".variantform.yaml", `surfaces:
  - path: "styles/brand.css"
    format: css
    strategy: replace
`);
  await project.writeFile("styles/brand.css", ":root { --color: blue; }");
  await project.writeFile("variants/acme/styles/brand.css", "");

  const issues = await runValidate(project.path);
  expect(issues).toContainEqual(
    expect.objectContaining({ type: "empty_file", variant: "acme" })
  );
});

it("passes validation for valid replace-strategy override files", async () => {
  project = await createTestProject();
  await project.writeFile(".variantform.yaml", `surfaces:
  - path: "styles/brand.css"
    format: css
    strategy: replace
`);
  await project.writeFile("styles/brand.css", ":root { --color: blue; }");
  await project.writeFile("variants/acme/styles/brand.css", ":root { --color: red; }");

  const issues = await runValidate(project.path);
  expect(issues).toHaveLength(0);
});

it("skips parse validation for non-json/yaml formats", async () => {
  project = await createTestProject();
  await project.writeFile(".variantform.yaml", `surfaces:
  - path: "src/Hero.tsx"
    format: code
    strategy: replace
`);
  await project.writeFile("src/Hero.tsx", "export default function Hero() { return <div/>; }");
  await project.writeFile("variants/acme/src/Hero.tsx", "export default function Hero() { return <h1>Acme</h1>; }");

  const issues = await runValidate(project.path);
  expect(issues).toHaveLength(0);
});
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/nikitadmitrieff/Projects/variantform && npx vitest run tests/validate.test.ts`
Expected: FAIL — "empty_file" type not recognized, format handling issues.

**Step 3: Update validate.ts to handle new formats**

In `src/commands/validate.ts`, add the `"empty_file"` type to `ValidationIssue`:

```typescript
export interface ValidationIssue {
  type: "stale_key" | "parse_error" | "extraneous_file" | "invalid_shape" | "empty_file";
  // ...rest unchanged
}
```

Then refactor the per-file validation loop (around line 55). After matching the surface, branch on format:

```typescript
// For json/yaml with merge strategy: keep existing logic (parse, shape check, stale keys)
// For json/yaml with replace strategy: keep existing logic (parse validation only)
// For all other formats: just check the file is not empty
if (!MERGEABLE_FORMATS.includes(matchingSurface.format)) {
  // Non-parseable format: just check file exists and is not empty
  const content = await readFile(overridePath, "utf-8");
  if (content.trim().length === 0) {
    issues.push({
      type: "empty_file",
      variant,
      surface: file,
      message: `Override "${file}" in variant "${variant}" is empty`,
    });
  }
  continue;
}
```

Import `MERGEABLE_FORMATS` from config or define locally: `const MERGEABLE_FORMATS = ["json", "yaml"];`

**Step 4: Run tests to verify they pass**

Run: `cd /Users/nikitadmitrieff/Projects/variantform && npx vitest run tests/validate.test.ts`
Expected: ALL PASS

**Step 5: Run full test suite**

Run: `cd /Users/nikitadmitrieff/Projects/variantform && npx vitest run`
Expected: ALL PASS (no regressions)

**Step 6: Commit**

```bash
git add src/commands/validate.ts tests/validate.test.ts
git commit -m "feat: validate command handles non-json/yaml surface formats"
```

---

## Task 3: Update Dashboard Types and GitHub API for New Formats

**Files:**
- Modify: `web/src/lib/types.ts:13-18` (Surface interface)
- Modify: `web/src/lib/github-repo.ts:39-43` (fetchConfig return type)
- Modify: `web/src/lib/validate.ts:16-22` (validateOverride signature)

**Step 1: Update Surface type in web/src/lib/types.ts**

```typescript
export type SurfaceFormat = "json" | "yaml" | "css" | "code" | "markdown" | "asset" | "template" | "text";

export interface Surface {
  path: string;
  format: SurfaceFormat;
  strategy: "merge" | "replace";
  base_content: string;
}
```

**Step 2: Update fetchConfig in web/src/lib/github-repo.ts**

At line 39-43, update the type cast:

```typescript
return parsed.surfaces.map((s: any) => ({
  path: s.path as string,
  format: s.format as SurfaceFormat,
  strategy: (s.strategy || (["json", "yaml"].includes(s.format) ? "merge" : "replace")) as "merge" | "replace",
}));
```

Import `SurfaceFormat` from types:

```typescript
import type { SurfaceFormat } from "./types";
```

**Step 3: Update validateOverride in web/src/lib/validate.ts**

Update the function signature to accept `SurfaceFormat`:

```typescript
import type { SurfaceFormat } from "./types";

export function validateOverride(
  overrideContent: string,
  baseContent: string,
  surfacePath: string,
  format: SurfaceFormat,
  strategy: "merge" | "replace"
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // For non-json/yaml formats, skip parse validation
  if (!["json", "yaml"].includes(format)) {
    if (overrideContent.trim().length === 0) {
      issues.push({
        severity: "warning",
        surface: surfacePath,
        message: "Override file is empty",
      });
    }
    return issues;
  }

  // ... existing json/yaml validation logic unchanged
```

**Step 4: Commit**

```bash
git add web/src/lib/types.ts web/src/lib/github-repo.ts web/src/lib/validate.ts
git commit -m "feat: dashboard types support extended surface formats"
```

---

## Task 4: Supabase Schema — Add Jobs and Chat Sessions Tables

**Files:**
- Create: `web/supabase/migrations/002_add_jobs_and_chat_sessions.sql`

**Step 1: Write the migration SQL**

```sql
-- Worker jobs for AI-driven repo modifications
CREATE TABLE IF NOT EXISTS vf_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES vf_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  job_type text NOT NULL CHECK (job_type IN ('onboarding', 'variant_create', 'variant_modify')),
  plan jsonb NOT NULL DEFAULT '{}',
  result jsonb,
  pr_url text,
  error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS: users can only see their own jobs
ALTER TABLE vf_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own jobs" ON vf_jobs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own jobs" ON vf_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Chat sessions for AI onboarding conversations
CREATE TABLE IF NOT EXISTS vf_chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES vf_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  messages jsonb NOT NULL DEFAULT '[]',
  plan jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS: users can only see their own chat sessions
ALTER TABLE vf_chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own chat sessions" ON vf_chat_sessions
  FOR ALL USING (auth.uid() = user_id);
```

**Step 2: Apply migration via Supabase dashboard or CLI**

Run: `cd /Users/nikitadmitrieff/Projects/variantform/web && npx supabase migration up` (or apply via Supabase Studio)

**Step 3: Commit**

```bash
git add web/supabase/migrations/002_add_jobs_and_chat_sessions.sql
git commit -m "feat: add vf_jobs and vf_chat_sessions tables"
```

---

## Task 5: API Route — Project Health Endpoint

**Files:**
- Create: `web/src/app/api/projects/[id]/health/route.ts`
- Reference: `web/src/app/api/projects/[id]/surfaces/route.ts` (auth pattern), `web/src/lib/github-repo.ts`

This endpoint returns aggregate validation status across all variants for a project.

**Step 1: Create the health API route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRepoContext, fetchConfig, fetchFile, listDirectories } from "@/lib/github-repo";
import type { SurfaceFormat } from "@/lib/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: project } = await supabase
    .from("vf_projects")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  if (!project.github_repo || !project.github_installation_id) {
    return NextResponse.json({ error: "No GitHub connection" }, { status: 400 });
  }

  const ctx = await getRepoContext(project.github_installation_id, project.github_repo, project.default_branch);
  const surfaces = await fetchConfig(ctx);
  const variantNames = await listDirectories(ctx, "variants");

  const MERGEABLE = ["json", "yaml"];
  const health: Record<string, { status: "healthy" | "warnings" | "errors"; issues: string[] }> = {};

  for (const variant of variantNames) {
    const issues: string[] = [];

    for (const surface of surfaces) {
      const overrideFile = await fetchFile(ctx, `variants/${variant}/${surface.path}`);
      if (!overrideFile) continue;

      if (MERGEABLE.includes(surface.format)) {
        // Parse check
        try {
          const parsed = surface.format === "yaml"
            ? (await import("js-yaml")).default.load(overrideFile.content)
            : JSON.parse(overrideFile.content);

          if (surface.strategy === "merge" && typeof parsed !== "object") {
            issues.push(`${surface.path}: override must be an object for merge strategy`);
          }
        } catch {
          issues.push(`${surface.path}: parse error`);
        }
      } else {
        if (overrideFile.content.trim().length === 0) {
          issues.push(`${surface.path}: empty override file`);
        }
      }
    }

    health[variant] = {
      status: issues.length === 0 ? "healthy" : issues.some(i => i.includes("error")) ? "errors" : "warnings",
      issues,
    };
  }

  const summary = {
    total_variants: variantNames.length,
    healthy: Object.values(health).filter(h => h.status === "healthy").length,
    warnings: Object.values(health).filter(h => h.status === "warnings").length,
    errors: Object.values(health).filter(h => h.status === "errors").length,
  };

  return NextResponse.json({ summary, variants: health });
}
```

**Step 2: Commit**

```bash
git add web/src/app/api/projects/[id]/health/route.ts
git commit -m "feat: add /api/projects/[id]/health endpoint"
```

---

## Task 6: API Route — Project Activity Feed

**Files:**
- Create: `web/src/app/api/projects/[id]/activity/route.ts`
- Reference: `web/src/lib/github-repo.ts` (RepoContext pattern)

This endpoint returns recent Git commits touching the `variants/` directory.

**Step 1: Create the activity API route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRepoContext } from "@/lib/github-repo";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: project } = await supabase
    .from("vf_projects")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  if (!project.github_repo || !project.github_installation_id) {
    return NextResponse.json({ error: "No GitHub connection" }, { status: 400 });
  }

  const ctx = await getRepoContext(project.github_installation_id, project.github_repo, project.default_branch);

  // Fetch commits that touch variants/ directory
  const { data: commits } = await ctx.octokit.request(
    "GET /repos/{owner}/{repo}/commits",
    {
      owner: ctx.owner,
      repo: ctx.repo,
      sha: ctx.branch,
      path: "variants",
      per_page: 30,
    }
  );

  const activity = commits.map((c: any) => ({
    sha: c.sha.slice(0, 7),
    message: c.commit.message,
    author: c.commit.author?.name || c.author?.login || "unknown",
    date: c.commit.author?.date,
    url: c.html_url,
  }));

  return NextResponse.json({ activity });
}
```

**Step 2: Commit**

```bash
git add web/src/app/api/projects/[id]/activity/route.ts
git commit -m "feat: add /api/projects/[id]/activity endpoint"
```

---

## Task 7: API Route — Variant Diff

**Files:**
- Create: `web/src/app/api/projects/[id]/diff/route.ts`

This endpoint returns a list of surfaces that differ between a variant and base, or between two variants.

**Step 1: Create the diff API route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRepoContext, fetchConfig, fetchFile } from "@/lib/github-repo";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(request.url);
  const variant = url.searchParams.get("variant");
  const compareWith = url.searchParams.get("compare"); // optional: another variant name

  if (!variant) {
    return NextResponse.json({ error: "variant query param required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: project } = await supabase
    .from("vf_projects")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  if (!project.github_repo || !project.github_installation_id) {
    return NextResponse.json({ error: "No GitHub connection" }, { status: 400 });
  }

  const ctx = await getRepoContext(project.github_installation_id, project.github_repo, project.default_branch);
  const surfaces = await fetchConfig(ctx);

  const diffs: Array<{
    surface: string;
    format: string;
    variant_has_override: boolean;
    compare_has_override?: boolean;
  }> = [];

  for (const surface of surfaces) {
    const variantOverride = await fetchFile(ctx, `variants/${variant}/${surface.path}`);

    if (compareWith) {
      const compareOverride = await fetchFile(ctx, `variants/${compareWith}/${surface.path}`);
      diffs.push({
        surface: surface.path,
        format: surface.format,
        variant_has_override: !!variantOverride,
        compare_has_override: !!compareOverride,
      });
    } else {
      diffs.push({
        surface: surface.path,
        format: surface.format,
        variant_has_override: !!variantOverride,
      });
    }
  }

  return NextResponse.json({ variant, compare: compareWith, diffs });
}
```

**Step 2: Commit**

```bash
git add web/src/app/api/projects/[id]/diff/route.ts
git commit -m "feat: add /api/projects/[id]/diff endpoint"
```

---

## Task 8: API Route — Variant Deletion

**Files:**
- Modify: `web/src/app/api/projects/[id]/variants/[name]/route.ts` (add full-variant DELETE)
- Reference: `web/src/lib/github-repo.ts` (deleteFile, listDirectories)

Currently DELETE removes a single override file. We need a way to delete an entire variant (all its files).

**Step 1: Add a new API route for deleting entire variants**

Create `web/src/app/api/projects/[id]/variants/[name]/delete-all/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRepoContext, fetchFile, deleteFile } from "@/lib/github-repo";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; name: string }> }
) {
  const { id, name } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: project } = await supabase
    .from("vf_projects")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const ctx = await getRepoContext(project.github_installation_id!, project.github_repo!, project.default_branch);

  // Use GitHub Trees API to list all files in the variant directory
  const { data: tree } = await ctx.octokit.request(
    "GET /repos/{owner}/{repo}/git/trees/{tree_sha}",
    {
      owner: ctx.owner,
      repo: ctx.repo,
      tree_sha: `${ctx.branch}:variants/${name}`,
      recursive: "1",
    }
  );

  const files = tree.tree.filter((t: any) => t.type === "blob");

  // Delete each file (GitHub Contents API requires deleting one at a time)
  for (const file of files) {
    const filePath = `variants/${name}/${file.path}`;
    const fileData = await fetchFile(ctx, filePath);
    if (fileData) {
      await deleteFile(ctx, filePath, fileData.sha, `variantform: delete variant ${name}`);
    }
  }

  return NextResponse.json({ ok: true, deleted: files.length });
}
```

**Step 2: Commit**

```bash
git add "web/src/app/api/projects/[id]/variants/[name]/delete-all/route.ts"
git commit -m "feat: add API route to delete entire variant"
```

---

## Task 9: API Route — Variant Duplication

**Files:**
- Create: `web/src/app/api/projects/[id]/variants/[name]/duplicate/route.ts`

**Step 1: Create the duplicate API route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRepoContext, fetchFile, putFile } from "@/lib/github-repo";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; name: string }> }
) {
  const { id, name: sourceName } = await params;
  const { target_name } = await request.json();

  if (!target_name || typeof target_name !== "string") {
    return NextResponse.json({ error: "target_name required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: project } = await supabase
    .from("vf_projects")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const ctx = await getRepoContext(project.github_installation_id!, project.github_repo!, project.default_branch);

  // List all files in source variant
  let sourceFiles: any[];
  try {
    const { data: tree } = await ctx.octokit.request(
      "GET /repos/{owner}/{repo}/git/trees/{tree_sha}",
      {
        owner: ctx.owner,
        repo: ctx.repo,
        tree_sha: `${ctx.branch}:variants/${sourceName}`,
        recursive: "1",
      }
    );
    sourceFiles = tree.tree.filter((t: any) => t.type === "blob");
  } catch {
    return NextResponse.json({ error: `Source variant "${sourceName}" not found` }, { status: 404 });
  }

  // Copy each file to the target variant
  let copied = 0;
  for (const file of sourceFiles) {
    const sourcePath = `variants/${sourceName}/${file.path}`;
    const targetPath = `variants/${target_name}/${file.path}`;
    const fileData = await fetchFile(ctx, sourcePath);
    if (fileData) {
      await putFile(ctx, targetPath, fileData.content, `variantform: duplicate ${sourceName} to ${target_name}`);
      copied++;
    }
  }

  return NextResponse.json({ ok: true, name: target_name, copied }, { status: 201 });
}
```

**Step 2: Commit**

```bash
git add "web/src/app/api/projects/[id]/variants/[name]/duplicate/route.ts"
git commit -m "feat: add API route to duplicate variant"
```

---

## Task 10: Redesign Project Overview — Surface Map Component

**Files:**
- Create: `web/src/components/dashboard/surface-map.tsx`
- Reference: `web/src/components/dashboard/surfaces-panel.tsx` (existing pattern)

The surface map is a matrix showing variants (columns) vs surfaces (rows). Each cell shows whether the variant overrides that surface.

**Step 1: Create the SurfaceMap component**

```typescript
// web/src/components/dashboard/surface-map.tsx
"use client";

interface SurfaceMapProps {
  surfaces: Array<{ path: string; format: string; strategy: string }>;
  variants: Array<{ name: string; overrides: string[] }>; // overrides = list of surface paths this variant overrides
}

export function SurfaceMap({ surfaces, variants }: SurfaceMapProps) {
  if (surfaces.length === 0 || variants.length === 0) {
    return (
      <div className="glass-card p-6 text-center text-sm text-muted">
        Connect surfaces and create variants to see the customization map.
      </div>
    );
  }

  return (
    <div className="glass-card overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-white/5">
            <th className="sticky left-0 bg-panel px-3 py-2 text-left font-medium text-muted">
              Surface
            </th>
            {variants.map((v) => (
              <th key={v.name} className="px-3 py-2 text-center font-medium text-muted">
                {v.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {surfaces.map((surface) => (
            <tr key={surface.path} className="border-b border-white/5 last:border-0">
              <td className="sticky left-0 bg-panel px-3 py-2 font-mono text-fg">
                <span className="mr-2 inline-block rounded bg-white/5 px-1 py-0.5 text-[10px] text-muted">
                  {surface.format}
                </span>
                {surface.path}
              </td>
              {variants.map((v) => {
                const hasOverride = v.overrides.includes(surface.path);
                return (
                  <td key={v.name} className="px-3 py-2 text-center">
                    {hasOverride ? (
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent" title="Overridden" />
                    ) : (
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-white/10" title="Inherits base" />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add web/src/components/dashboard/surface-map.tsx
git commit -m "feat: add SurfaceMap component for variant/surface matrix"
```

---

## Task 11: Redesign Project Overview — Health Bar Component

**Files:**
- Create: `web/src/components/dashboard/health-bar.tsx`

**Step 1: Create the HealthBar component**

```typescript
// web/src/components/dashboard/health-bar.tsx
"use client";

interface HealthBarProps {
  summary: {
    total_variants: number;
    healthy: number;
    warnings: number;
    errors: number;
  } | null;
  loading: boolean;
}

export function HealthBar({ summary, loading }: HealthBarProps) {
  if (loading) {
    return <div className="skeleton h-12 w-full rounded-lg" />;
  }

  if (!summary || summary.total_variants === 0) {
    return null;
  }

  const total = summary.total_variants;
  const healthyPct = (summary.healthy / total) * 100;
  const warningPct = (summary.warnings / total) * 100;
  const errorPct = (summary.errors / total) * 100;

  return (
    <div className="glass-card p-4">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-medium text-fg">Variant Health</span>
        <span className="text-muted">
          {summary.healthy}/{total} healthy
        </span>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-white/5">
        {healthyPct > 0 && (
          <div className="bg-emerald-500" style={{ width: `${healthyPct}%` }} />
        )}
        {warningPct > 0 && (
          <div className="bg-amber-500" style={{ width: `${warningPct}%` }} />
        )}
        {errorPct > 0 && (
          <div className="bg-red-500" style={{ width: `${errorPct}%` }} />
        )}
      </div>
      <div className="mt-2 flex gap-4 text-[10px] text-muted">
        <span className="flex items-center gap-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {summary.healthy} healthy
        </span>
        {summary.warnings > 0 && (
          <span className="flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
            {summary.warnings} warnings
          </span>
        )}
        {summary.errors > 0 && (
          <span className="flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
            {summary.errors} errors
          </span>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add web/src/components/dashboard/health-bar.tsx
git commit -m "feat: add HealthBar component for variant health visualization"
```

---

## Task 12: Redesign Project Overview — Activity Feed Component

**Files:**
- Create: `web/src/components/dashboard/activity-feed.tsx`

**Step 1: Create the ActivityFeed component**

```typescript
// web/src/components/dashboard/activity-feed.tsx
"use client";

interface ActivityItem {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

interface ActivityFeedProps {
  activity: ActivityItem[];
  loading: boolean;
}

export function ActivityFeed({ activity, loading }: ActivityFeedProps) {
  if (loading) {
    return (
      <div className="glass-card space-y-3 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-10 w-full" />
        ))}
      </div>
    );
  }

  if (activity.length === 0) {
    return (
      <div className="glass-card p-6 text-center text-xs text-muted">
        No variant changes yet.
      </div>
    );
  }

  return (
    <div className="glass-card divide-y divide-white/5">
      {activity.slice(0, 10).map((item) => (
        <div key={item.sha} className="flex items-start gap-3 px-4 py-3">
          <code className="mt-0.5 shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-muted">
            {item.sha}
          </code>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-fg">{item.message}</p>
            <p className="mt-0.5 text-[10px] text-muted">
              {item.author} &middot;{" "}
              {new Date(item.date).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add web/src/components/dashboard/activity-feed.tsx
git commit -m "feat: add ActivityFeed component for variant change history"
```

---

## Task 13: Redesign Project Overview Page — Wire Everything Together

**Files:**
- Modify: `web/src/app/dashboard/[projectId]/page.tsx` (full rewrite)
- Modify: `web/src/app/api/projects/[id]/variants/route.ts` (add override surface paths to response)

The project overview page needs to fetch health, activity, and surface-level override data to power the new components.

**Step 1: Update the variants API route to return override paths per variant**

In `web/src/app/api/projects/[id]/variants/route.ts`, the GET handler currently returns `{name, override_count}`. Update it to also return the list of overridden surface paths:

```typescript
// Inside the for loop over variantNames, after getting surfaces and listing overrides:
for (const variant of variantNames) {
  const overridePaths: string[] = [];
  let overrideCount = 0;
  for (const surface of surfaces) {
    const override = await fetchFile(ctx, `variants/${variant}/${surface.path}`);
    if (override) {
      overridePaths.push(surface.path);
      overrideCount++;
    }
  }
  variantData.push({ name: variant, override_count: overrideCount, overrides: overridePaths });
}
```

**Step 2: Rewrite the project overview page**

Replace `web/src/app/dashboard/[projectId]/page.tsx` with a version that:
- Fetches surfaces, variants (with override paths), health, and activity in parallel
- Renders: stats bar, HealthBar, SurfaceMap, and ActivityFeed
- Keeps the existing "Add Variant" functionality

The page should import:
```typescript
import { SurfaceMap } from "@/components/dashboard/surface-map";
import { HealthBar } from "@/components/dashboard/health-bar";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { VariantsPanel } from "@/components/dashboard/variants-panel";
```

Layout structure:
```
[Stats: surfaces | variants | overrides]
[HealthBar]
[SurfaceMap — full width]
[Two columns: VariantsPanel | ActivityFeed]
```

**Step 3: Commit**

```bash
git add web/src/app/dashboard/[projectId]/page.tsx web/src/app/api/projects/[id]/variants/route.ts
git commit -m "feat: redesign project overview with surface map, health bar, and activity feed"
```

---

## Task 14: AI Chat API Route

**Files:**
- Create: `web/src/app/api/ai/chat/route.ts`
- Dependency: Claude API key in environment (`ANTHROPIC_API_KEY`)

This is the conversational AI endpoint for onboarding. It receives messages, fetches repo context, and streams Claude's responses.

**Step 1: Install Anthropic SDK**

Run: `cd /Users/nikitadmitrieff/Projects/variantform/web && npm install @anthropic-ai/sdk`

**Step 2: Create the chat API route**

```typescript
import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getRepoContext, fetchConfig, fetchFile } from "@/lib/github-repo";

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are an expert at helping SaaS developers set up multi-client customization for their products using variantform.

variantform is an overlay system where a .variantform.yaml file declares "surfaces" — files in the repo that can be customized per client. Each surface has a format and strategy:
- json/yaml formats support "merge" (delta overlays using RFC 7396 JSON Merge Patch) or "replace" (full file swap)
- css, code, markdown, asset, template, text formats only support "replace" (full file swap)

Variants live under variants/<client-name>/ and only include files that differ from the base.

Your job:
1. Analyze the developer's codebase (you'll receive the file tree and key files)
2. Ask questions to understand what they want to customize per client
3. Suggest which files should be declared as surfaces and why
4. Produce a structured customization plan as JSON when the developer approves

When producing the final plan, output a JSON block with this structure:
\`\`\`json
{
  "surfaces": [
    { "path": "config/features.json", "format": "json", "strategy": "merge", "reason": "..." },
    { "path": "public/logo.svg", "format": "asset", "strategy": "replace", "reason": "..." }
  ],
  "install_variantform": true,
  "create_variants": ["acme", "globex"],
  "refactoring": [
    { "description": "Extract hardcoded colors from globals.css into config/theme.json", "files": ["src/app/globals.css", "config/theme.json"] }
  ]
}
\`\`\`

Be conversational, ask one question at a time, and guide the developer step by step.`;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { project_id, messages } = await request.json();

  // Fetch project for repo context
  const { data: project } = await supabase
    .from("vf_projects")
    .select("*")
    .eq("id", project_id)
    .eq("user_id", user.id)
    .single();

  if (!project) {
    return new Response(JSON.stringify({ error: "Project not found" }), { status: 404 });
  }

  // Build repo context for first message
  let repoContext = "";
  if (project.github_repo && project.github_installation_id) {
    try {
      const ctx = await getRepoContext(project.github_installation_id, project.github_repo, project.default_branch);

      // Fetch file tree (top 2 levels)
      const { data: tree } = await ctx.octokit.request(
        "GET /repos/{owner}/{repo}/git/trees/{tree_sha}",
        { owner: ctx.owner, repo: ctx.repo, tree_sha: ctx.branch, recursive: "1" }
      );
      const fileList = tree.tree
        .filter((t: any) => t.type === "blob")
        .map((t: any) => t.path)
        .slice(0, 200); // cap at 200 files

      // Fetch package.json if it exists
      const packageJson = await fetchFile(ctx, "package.json");

      // Check for existing .variantform.yaml
      let existingConfig = null;
      try { existingConfig = await fetchConfig(ctx); } catch { /* not set up yet */ }

      repoContext = `\n\nRepo: ${project.github_repo}\nBranch: ${project.default_branch}\n\nFile tree:\n${fileList.join("\n")}\n\npackage.json:\n${packageJson?.content || "not found"}\n\nExisting .variantform.yaml: ${existingConfig ? JSON.stringify(existingConfig) : "not set up yet"}`;
    } catch (e) {
      repoContext = `\n\nCould not fetch repo context: ${e instanceof Error ? e.message : "unknown error"}`;
    }
  }

  // Stream response from Claude
  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: SYSTEM_PROMPT + repoContext,
    messages: messages.map((m: any) => ({
      role: m.role,
      content: m.content,
    })),
  });

  // Return as SSE stream
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`));
        }
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

**Step 3: Add ANTHROPIC_API_KEY to .env.local template**

Add to `.env.example` or `.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-...
```

**Step 4: Commit**

```bash
git add web/src/app/api/ai/chat/route.ts web/package.json web/package-lock.json
git commit -m "feat: add AI chat API route for conversational onboarding"
```

---

## Task 15: AI Chat UI Component

**Files:**
- Create: `web/src/components/dashboard/ai-chat.tsx`
- Create: `web/src/app/dashboard/[projectId]/chat/page.tsx`

**Step 1: Create the AiChat component**

Build a chat interface that:
- Shows message history (user + assistant messages)
- Has a text input at the bottom
- Streams responses from `/api/ai/chat`
- Highlights JSON plan blocks when the AI outputs them
- Has an "Execute Plan" button when a plan is detected

The component should manage:
- `messages: Array<{role: "user" | "assistant", content: string}>`
- `input: string`
- `streaming: boolean`
- `plan: object | null` (extracted from assistant's JSON block)

Key behaviors:
- On submit: append user message, POST to `/api/ai/chat`, read SSE stream, append assistant message
- Detect ````json ... ```` blocks in assistant messages — parse as plan
- When plan is detected, show "Execute Plan" button that will POST to `/api/ai/execute` (Task 16)

**Step 2: Create the chat page**

`web/src/app/dashboard/[projectId]/chat/page.tsx`:

```typescript
"use client";
import { useParams } from "next/navigation";
import { AiChat } from "@/components/dashboard/ai-chat";

export default function ChatPage() {
  const { projectId } = useParams<{ projectId: string }>();
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-lg font-medium text-fg">AI Setup Assistant</h1>
      <AiChat projectId={projectId} />
    </div>
  );
}
```

**Step 3: Add a "Setup with AI" button to the project overview**

In the project overview page, add a link/button that navigates to `/dashboard/[projectId]/chat` when the project doesn't have `.variantform.yaml` set up yet, or as an ongoing assistant option.

**Step 4: Commit**

```bash
git add web/src/components/dashboard/ai-chat.tsx web/src/app/dashboard/[projectId]/chat/page.tsx
git commit -m "feat: add AI chat UI for conversational onboarding"
```

---

## Task 16: Worker Execution API Route

**Files:**
- Create: `web/src/app/api/ai/execute/route.ts`
- Create: `web/src/app/api/ai/jobs/[id]/route.ts`

This is the route that receives a customization plan from the AI chat and dispatches it to a worker. For MVP, the "worker" creates a branch and applies the plan using GitHub API directly (no container needed yet). The container-based Claude Code worker is Phase 2.

**Step 1: Create the execute API route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRepoContext, putFile } from "@/lib/github-repo";
import yaml from "js-yaml";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { project_id, plan } = await request.json();

  const { data: project } = await supabase
    .from("vf_projects")
    .select("*")
    .eq("id", project_id)
    .eq("user_id", user.id)
    .single();

  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  // Create job record
  const admin = createAdminClient();
  const { data: job, error: jobErr } = await admin
    .from("vf_jobs")
    .insert({
      project_id,
      user_id: user.id,
      status: "running",
      job_type: "onboarding",
      plan,
    })
    .select()
    .single();

  if (jobErr) return NextResponse.json({ error: jobErr.message }, { status: 500 });

  // Execute the plan (MVP: direct GitHub API, no container)
  try {
    const ctx = await getRepoContext(project.github_installation_id!, project.github_repo!, project.default_branch);

    // 1. Create .variantform.yaml if plan includes surfaces
    if (plan.surfaces && plan.surfaces.length > 0) {
      const yamlContent = yaml.dump({
        surfaces: plan.surfaces.map((s: any) => ({
          path: s.path,
          format: s.format,
          strategy: s.strategy,
        })),
      });
      await putFile(ctx, ".variantform.yaml", yamlContent, "variantform: initialize project configuration");
    }

    // 2. Create variant directories if plan includes them
    if (plan.create_variants) {
      for (const variantName of plan.create_variants) {
        await putFile(
          ctx,
          `variants/${variantName}/.gitkeep`,
          "",
          `variantform: create variant ${variantName}`
        );
      }
    }

    // Update job as completed
    await admin
      .from("vf_jobs")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", job.id);

    return NextResponse.json({ job_id: job.id, status: "completed" });
  } catch (e) {
    // Update job as failed
    await admin
      .from("vf_jobs")
      .update({
        status: "failed",
        error: e instanceof Error ? e.message : "Unknown error",
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    return NextResponse.json({ job_id: job.id, status: "failed", error: e instanceof Error ? e.message : "Unknown" }, { status: 500 });
  }
}
```

**Step 2: Create the job status route**

```typescript
// web/src/app/api/ai/jobs/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: job } = await supabase
    .from("vf_jobs")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  return NextResponse.json(job);
}
```

**Step 3: Commit**

```bash
git add web/src/app/api/ai/execute/route.ts web/src/app/api/ai/jobs/[id]/route.ts
git commit -m "feat: add worker execution and job status API routes"
```

---

## Task 17: Update Variant Detail Page — Health, History, Actions

**Files:**
- Modify: `web/src/app/dashboard/[projectId]/[variantId]/page.tsx`

Redesign the variant editor page to show:
- Variant name + health status
- List of overridden surfaces (with status per surface)
- Delete variant button (calls Task 8 API)
- Duplicate variant button (calls Task 9 API)
- Keep the existing override editor as an expandable section per surface

**Step 1: Update the page to include health data and actions**

Fetch health data from `/api/projects/${projectId}/health` alongside the existing variant data fetch.

Add delete handler:
```typescript
async function handleDeleteVariant() {
  if (!confirm(`Delete variant "${variantName}" and all its overrides?`)) return;
  await fetch(`/api/projects/${projectId}/variants/${encodeURIComponent(variantName)}/delete-all`, {
    method: "POST",
  });
  router.push(`/dashboard/${projectId}`);
}
```

Add duplicate handler:
```typescript
async function handleDuplicateVariant() {
  const targetName = prompt("New variant name:");
  if (!targetName) return;
  await fetch(`/api/projects/${projectId}/variants/${encodeURIComponent(variantName)}/duplicate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target_name: targetName }),
  });
  router.push(`/dashboard/${projectId}`);
}
```

Add action buttons in the header area:
```typescript
<div className="flex gap-2">
  <button onClick={handleDuplicateVariant} className="btn-secondary text-xs">Duplicate</button>
  <button onClick={handleDeleteVariant} className="btn-danger text-xs">Delete</button>
</div>
```

**Step 2: Commit**

```bash
git add web/src/app/dashboard/[projectId]/[variantId]/page.tsx
git commit -m "feat: redesign variant detail with health status, delete, and duplicate actions"
```

---

## Task 18: Update CLI `init` Command for New Format Types

**Files:**
- Modify: `src/cli.ts:18-54` (init command surface parsing)
- Modify: `src/commands/init.ts`
- Test: `tests/commands/init.test.ts` (if exists, or `tests/e2e.test.ts`)

**Step 1: Update the CLI init command to accept new formats**

In `src/cli.ts`, the init command parses surfaces as `path:format[:strategy]`. Update the validation (around line 29-36) to accept new format values and default strategy to `replace` for non-json/yaml:

```typescript
const VALID_FORMATS = ["json", "yaml", "css", "code", "markdown", "asset", "template", "text"];
const MERGEABLE_FORMATS = ["json", "yaml"];

// In the surface parsing loop:
const format = parts[1];
if (!VALID_FORMATS.includes(format)) {
  program.error(`Invalid format "${format}". Must be one of: ${VALID_FORMATS.join(", ")}`);
}
const defaultStrategy = MERGEABLE_FORMATS.includes(format) ? "merge" : "replace";
const strategy = parts[2] || defaultStrategy;
```

**Step 2: Run existing tests to check for regressions**

Run: `cd /Users/nikitadmitrieff/Projects/variantform && npx vitest run`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add src/cli.ts
git commit -m "feat: CLI init command accepts extended surface formats"
```

---

## Task 19: Add Navigation to AI Chat from Dashboard

**Files:**
- Modify: `web/src/components/dashboard/sidebar.tsx`
- Modify: `web/src/app/dashboard/[projectId]/page.tsx` (add "Setup with AI" CTA)

**Step 1: Add AI Chat link to sidebar**

When viewing a project, add a nav item in the sidebar for the AI chat:
```typescript
{projectId && (
  <NavLink href={`/dashboard/${projectId}/chat`} icon={<SparklesIcon />} label="AI Assistant" />
)}
```

**Step 2: Add a CTA on the project overview**

If the project has no surfaces (`.variantform.yaml` not found or empty), show a prominent call-to-action:

```typescript
{surfaces.length === 0 && (
  <div className="glass-card p-8 text-center">
    <h2 className="text-sm font-medium text-fg">Set up customization</h2>
    <p className="mt-1 text-xs text-muted">
      Use the AI assistant to analyze your repo and declare what's customizable.
    </p>
    <Link href={`/dashboard/${projectId}/chat`} className="btn-primary mt-4 inline-block text-xs">
      Start AI Setup
    </Link>
  </div>
)}
```

**Step 3: Commit**

```bash
git add web/src/components/dashboard/sidebar.tsx web/src/app/dashboard/[projectId]/page.tsx
git commit -m "feat: add AI assistant navigation and setup CTA"
```

---

## Task 20: Final Integration Test and Cleanup

**Step 1: Run full CLI test suite**

Run: `cd /Users/nikitadmitrieff/Projects/variantform && npx vitest run`
Expected: ALL PASS

**Step 2: Build the web app**

Run: `cd /Users/nikitadmitrieff/Projects/variantform/web && npm run build`
Expected: Build succeeds with no type errors

**Step 3: Manual smoke test**

1. Start dev server: `cd web && npm run dev`
2. Log in, navigate to an existing project
3. Verify: surface map renders, health bar shows, activity feed loads
4. Navigate to AI chat, send a test message
5. Test variant deletion and duplication

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final integration fixes for dashboard v2"
```
