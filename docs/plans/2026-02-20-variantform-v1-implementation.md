# Variantform V1 CLI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the open-source Variantform CLI that lets SaaS vendors manage per-client configuration variants from a single git repo.

**Architecture:** TypeScript CLI wrapping git commands. Declares customization "surfaces" in `.variantform.yaml`, creates per-client variant branches that only modify those surfaces, and syncs them with upstream `main` using format-aware (JSON/YAML) 3-way merge drivers registered via `.gitattributes`.

**Tech Stack:** TypeScript, Commander.js (CLI), simple-git (git ops), js-yaml (YAML), chalk (terminal colors), Vitest (tests), tsx (dev runner)

---

## Project Structure

```
variantform/
├── src/
│   ├── cli.ts                    # Entry point, command registration
│   ├── config.ts                 # Parse .variantform.yaml
│   ├── git.ts                    # Git operations wrapper
│   ├── merge/
│   │   ├── json-driver.ts        # 3-way JSON deep merge
│   │   ├── yaml-driver.ts        # 3-way YAML deep merge
│   │   └── index.ts              # Merge driver CLI entry (invoked by git)
│   └── commands/
│       ├── init.ts               # variantform init
│       ├── create.ts             # variantform create <client>
│       ├── status.ts             # variantform status
│       ├── sync.ts               # variantform sync
│       └── diff.ts               # variantform diff <client>
├── tests/
│   ├── helpers/
│   │   └── test-repo.ts          # Create temp git repos for testing
│   ├── config.test.ts
│   ├── merge/
│   │   ├── json-driver.test.ts
│   │   └── yaml-driver.test.ts
│   └── commands/
│       ├── init.test.ts
│       ├── create.test.ts
│       ├── status.test.ts
│       ├── sync.test.ts
│       └── diff.test.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `src/cli.ts`

**Step 1: Create package.json**

```json
{
  "name": "variantform",
  "version": "0.1.0",
  "description": "Git-native tool for managing per-client SaaS product variants",
  "type": "module",
  "bin": {
    "variantform": "./dist/cli.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/cli.ts",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "chalk": "^5.4.0",
    "commander": "^13.1.0",
    "fast-glob": "^3.3.3",
    "js-yaml": "^4.1.0",
    "simple-git": "^3.27.0"
  },
  "devDependencies": {
    "@types/js-yaml": "^4.0.9",
    "@types/node": "^22.13.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  },
  "license": "MIT"
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "declaration": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

**Step 3: Create vitest.config.ts**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 15000,
  },
});
```

**Step 4: Create minimal src/cli.ts**

```typescript
#!/usr/bin/env node
import { Command } from "commander";

const program = new Command();

program
  .name("variantform")
  .description("Git-native tool for managing per-client SaaS product variants")
  .version("0.1.0");

program.parse();
```

**Step 5: Install dependencies**

Run: `npm install`
Expected: `node_modules` created, lock file generated

**Step 6: Verify build works**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 7: Verify test runner works**

Run: `npx vitest run`
Expected: "No test files found" (but vitest itself runs)

**Step 8: Commit**

```bash
git add package.json tsconfig.json vitest.config.ts src/cli.ts package-lock.json
git commit -m "feat: project scaffolding with TypeScript, Commander, Vitest"
```

---

### Task 2: Test Helper -- Temp Git Repo Factory

Creates a helper that spins up real temp git repos for integration testing. Every subsequent test task depends on this.

**Files:**
- Create: `tests/helpers/test-repo.ts`

**Step 1: Write the test helper**

```typescript
import { simpleGit, SimpleGit } from "simple-git";
import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface TestRepo {
  path: string;
  git: SimpleGit;
  /** Write a file relative to repo root and optionally stage+commit it */
  writeFile(relativePath: string, content: string): Promise<void>;
  /** Stage and commit all changes */
  commit(message: string): Promise<void>;
  /** Clean up the temp directory */
  cleanup(): Promise<void>;
}

export async function createTestRepo(): Promise<TestRepo> {
  const path = await mkdtemp(join(tmpdir(), "variantform-test-"));
  const git = simpleGit(path);
  await git.init();
  await git.addConfig("user.email", "test@variantform.dev");
  await git.addConfig("user.name", "Variantform Test");

  // Create initial commit so main branch exists
  const readmePath = join(path, "README.md");
  await writeFile(readmePath, "# Test Repo\n");
  await git.add("README.md");
  await git.commit("initial commit");

  const repo: TestRepo = {
    path,
    git,
    async writeFile(relativePath: string, content: string) {
      const fullPath = join(path, relativePath);
      const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));
      await mkdir(dir, { recursive: true });
      await writeFile(fullPath, content);
    },
    async commit(message: string) {
      await git.add(".");
      await git.commit(message);
    },
    async cleanup() {
      await rm(path, { recursive: true, force: true });
    },
  };

  return repo;
}
```

**Step 2: Write a smoke test for the helper**

Create `tests/helpers/test-repo.test.ts`:

```typescript
import { describe, it, expect, afterEach } from "vitest";
import { createTestRepo, TestRepo } from "./test-repo.js";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

describe("createTestRepo", () => {
  let repo: TestRepo;

  afterEach(async () => {
    await repo?.cleanup();
  });

  it("creates a git repo with an initial commit", async () => {
    repo = await createTestRepo();
    const log = await repo.git.log();
    expect(log.total).toBe(1);
    expect(log.latest?.message).toBe("initial commit");
  });

  it("can write files and commit them", async () => {
    repo = await createTestRepo();
    await repo.writeFile("config/features.json", '{"a": 1}');
    await repo.commit("add config");

    const log = await repo.git.log();
    expect(log.total).toBe(2);

    const content = await readFile(join(repo.path, "config/features.json"), "utf-8");
    expect(JSON.parse(content)).toEqual({ a: 1 });
  });
});
```

**Step 3: Run test to verify it passes**

Run: `npx vitest run tests/helpers/test-repo.test.ts`
Expected: 2 tests PASS

**Step 4: Commit**

```bash
git add tests/helpers/
git commit -m "test: add temp git repo factory for integration tests"
```

---

### Task 3: Config Module

Parses `.variantform.yaml` and returns typed surface declarations.

**Files:**
- Create: `src/config.ts`
- Create: `tests/config.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, afterEach } from "vitest";
import { createTestRepo, TestRepo } from "./helpers/test-repo.js";
import { loadConfig, VariantformConfig } from "../src/config.js";

describe("loadConfig", () => {
  let repo: TestRepo;

  afterEach(async () => {
    await repo?.cleanup();
  });

  it("parses .variantform.yaml with surface declarations", async () => {
    repo = await createTestRepo();
    await repo.writeFile(
      ".variantform.yaml",
      `surfaces:
  - path: "config/features.json"
    format: json
  - path: "config/theme.json"
    format: json
  - path: "config/workflows/*.yaml"
    format: yaml
`
    );

    const config = await loadConfig(repo.path);
    expect(config.surfaces).toHaveLength(3);
    expect(config.surfaces[0]).toEqual({
      path: "config/features.json",
      format: "json",
    });
    expect(config.surfaces[2]).toEqual({
      path: "config/workflows/*.yaml",
      format: "yaml",
    });
  });

  it("throws if .variantform.yaml is missing", async () => {
    repo = await createTestRepo();
    await expect(loadConfig(repo.path)).rejects.toThrow(
      ".variantform.yaml not found"
    );
  });

  it("throws if surfaces array is missing", async () => {
    repo = await createTestRepo();
    await repo.writeFile(".variantform.yaml", "version: 1\n");
    await expect(loadConfig(repo.path)).rejects.toThrow(
      "surfaces"
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/config.test.ts`
Expected: FAIL -- module `../src/config.js` not found or `loadConfig` not defined

**Step 3: Write minimal implementation**

```typescript
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import yaml from "js-yaml";

export interface Surface {
  path: string;
  format: "json" | "yaml";
}

export interface VariantformConfig {
  surfaces: Surface[];
}

export async function loadConfig(repoPath: string): Promise<VariantformConfig> {
  const configPath = join(repoPath, ".variantform.yaml");

  let raw: string;
  try {
    raw = await readFile(configPath, "utf-8");
  } catch {
    throw new Error(".variantform.yaml not found in " + repoPath);
  }

  const parsed = yaml.load(raw) as Record<string, unknown>;

  if (!parsed || !Array.isArray(parsed.surfaces)) {
    throw new Error(".variantform.yaml must contain a 'surfaces' array");
  }

  const surfaces: Surface[] = parsed.surfaces.map((s: unknown) => {
    const surface = s as Record<string, unknown>;
    if (typeof surface.path !== "string" || typeof surface.format !== "string") {
      throw new Error("Each surface must have 'path' (string) and 'format' (string)");
    }
    return { path: surface.path, format: surface.format as Surface["format"] };
  });

  return { surfaces };
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/config.test.ts`
Expected: 3 tests PASS

**Step 5: Commit**

```bash
git add src/config.ts tests/config.test.ts
git commit -m "feat: config module to parse .variantform.yaml surface declarations"
```

---

### Task 4: Git Module

Wraps git operations needed by all commands: list variant branches, get current branch, check sync status.

**Files:**
- Create: `src/git.ts`
- Create: `tests/git.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, afterEach } from "vitest";
import { createTestRepo, TestRepo } from "./helpers/test-repo.js";
import { VariantGit } from "../src/git.js";

describe("VariantGit", () => {
  let repo: TestRepo;

  afterEach(async () => {
    await repo?.cleanup();
  });

  it("lists variant branches", async () => {
    repo = await createTestRepo();
    await repo.git.checkoutLocalBranch("variant/acme");
    await repo.git.checkout("main");
    await repo.git.checkoutLocalBranch("variant/globex");
    await repo.git.checkout("main");
    // Non-variant branch should be excluded
    await repo.git.checkoutLocalBranch("feature/unrelated");
    await repo.git.checkout("main");

    const vg = new VariantGit(repo.path);
    const variants = await vg.listVariants();
    expect(variants).toEqual(["acme", "globex"]);
  });

  it("returns empty array when no variants exist", async () => {
    repo = await createTestRepo();
    const vg = new VariantGit(repo.path);
    const variants = await vg.listVariants();
    expect(variants).toEqual([]);
  });

  it("gets the main branch HEAD commit", async () => {
    repo = await createTestRepo();
    const vg = new VariantGit(repo.path);
    const head = await vg.getMainHead();
    expect(head).toMatch(/^[a-f0-9]{40}$/);
  });

  it("checks if a variant is synced with main", async () => {
    repo = await createTestRepo();
    // Create variant at current main HEAD
    await repo.git.checkoutLocalBranch("variant/acme");
    await repo.git.checkout("main");

    const vg = new VariantGit(repo.path);
    // Variant is at same commit as main, so it's synced
    expect(await vg.isVariantSynced("acme")).toBe(true);

    // Now add a commit to main
    await repo.writeFile("src/app.ts", "console.log('hello');");
    await repo.commit("add app");

    // Variant is now behind main
    expect(await vg.isVariantSynced("acme")).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/git.test.ts`
Expected: FAIL -- `VariantGit` not defined

**Step 3: Write minimal implementation**

```typescript
import { simpleGit, SimpleGit } from "simple-git";

const VARIANT_PREFIX = "variant/";

export class VariantGit {
  private git: SimpleGit;

  constructor(repoPath: string) {
    this.git = simpleGit(repoPath);
  }

  /** List all variant names (without the variant/ prefix) */
  async listVariants(): Promise<string[]> {
    const branches = await this.git.branchLocal();
    return branches.all
      .filter((b) => b.startsWith(VARIANT_PREFIX))
      .map((b) => b.slice(VARIANT_PREFIX.length))
      .sort();
  }

  /** Get the HEAD commit hash of main */
  async getMainHead(): Promise<string> {
    const log = await this.git.log({ maxCount: 1, from: "main" });
    return log.latest!.hash;
  }

  /** Check if a variant branch contains the latest main HEAD */
  async isVariantSynced(variantName: string): Promise<boolean> {
    const mainHead = await this.getMainHead();
    const branchName = VARIANT_PREFIX + variantName;
    // Check if main's HEAD is an ancestor of the variant branch
    try {
      await this.git.raw([
        "merge-base",
        "--is-ancestor",
        mainHead,
        branchName,
      ]);
      return true;
    } catch {
      return false;
    }
  }

  /** Get the count of files that differ between main and a variant */
  async getVariantDiffCount(variantName: string): Promise<number> {
    const branchName = VARIANT_PREFIX + variantName;
    const diff = await this.git.diff(["--name-only", "main..." + branchName]);
    if (!diff.trim()) return 0;
    return diff.trim().split("\n").length;
  }

  /** Get the list of files that differ between main and a variant */
  async getVariantDiffFiles(variantName: string): Promise<string[]> {
    const branchName = VARIANT_PREFIX + variantName;
    const diff = await this.git.diff(["--name-only", "main..." + branchName]);
    if (!diff.trim()) return [];
    return diff.trim().split("\n");
  }

  /** Get the underlying simple-git instance for advanced operations */
  get raw(): SimpleGit {
    return this.git;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/git.test.ts`
Expected: 4 tests PASS

**Step 5: Commit**

```bash
git add src/git.ts tests/git.test.ts
git commit -m "feat: git module with variant branch listing and sync detection"
```

---

### Task 5: JSON 3-Way Merge Driver

The core differentiator. Performs a 3-way merge on JSON files: preserves variant overrides, adds new upstream keys, flags true conflicts.

**Files:**
- Create: `src/merge/json-driver.ts`
- Create: `tests/merge/json-driver.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { mergeJson, MergeResult } from "../../src/merge/json-driver.js";

describe("mergeJson", () => {
  it("preserves variant overrides while adding new upstream keys", () => {
    const base = { kanban: true, gantt: true, time_tracking: false, max_projects: 10 };
    const upstream = { kanban: true, gantt: true, time_tracking: false, max_projects: 10, ai_assistant: true };
    const variant = { kanban: true, gantt: true, time_tracking: true, max_projects: 50 };

    const result = mergeJson(base, upstream, variant);

    expect(result.ok).toBe(true);
    expect(result.merged).toEqual({
      kanban: true,
      gantt: true,
      time_tracking: true,       // variant override preserved
      max_projects: 50,          // variant override preserved
      ai_assistant: true,        // new upstream key added
    });
    expect(result.conflicts).toEqual([]);
  });

  it("detects conflicts when both sides change the same key", () => {
    const base = { theme: "light", max_users: 10 };
    const upstream = { theme: "dark", max_users: 10 };
    const variant = { theme: "ocean", max_users: 100 };

    const result = mergeJson(base, upstream, variant);

    expect(result.ok).toBe(false);
    expect(result.conflicts).toContainEqual({
      path: "theme",
      base: "light",
      upstream: "dark",
      variant: "ocean",
    });
    // max_users: only variant changed it, no conflict
    expect(result.merged?.max_users).toBe(100);
  });

  it("handles nested objects with deep merge", () => {
    const base = { ui: { sidebar: true, footer: false }, limits: { storage: 10 } };
    const upstream = { ui: { sidebar: true, footer: false, topbar: true }, limits: { storage: 10 } };
    const variant = { ui: { sidebar: false, footer: false }, limits: { storage: 50 } };

    const result = mergeJson(base, upstream, variant);

    expect(result.ok).toBe(true);
    expect(result.merged).toEqual({
      ui: { sidebar: false, footer: false, topbar: true },
      limits: { storage: 50 },
    });
  });

  it("handles key removed by upstream", () => {
    const base = { a: 1, b: 2, c: 3 };
    const upstream = { a: 1, c: 3 }; // b removed upstream
    const variant = { a: 1, b: 2, c: 3 }; // variant didn't touch b

    const result = mergeJson(base, upstream, variant);

    expect(result.ok).toBe(true);
    // upstream removed b, variant didn't change it, so removal wins
    expect(result.merged).toEqual({ a: 1, c: 3 });
  });

  it("flags conflict when upstream removes a key that variant modified", () => {
    const base = { a: 1, b: 2 };
    const upstream = { a: 1 }; // b removed upstream
    const variant = { a: 1, b: 99 }; // variant modified b

    const result = mergeJson(base, upstream, variant);

    expect(result.ok).toBe(false);
    expect(result.conflicts.length).toBe(1);
    expect(result.conflicts[0].path).toBe("b");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/merge/json-driver.test.ts`
Expected: FAIL -- module not found

**Step 3: Write minimal implementation**

```typescript
export interface MergeConflict {
  path: string;
  base: unknown;
  upstream: unknown;
  variant: unknown;
}

export interface MergeResult {
  ok: boolean;
  merged: Record<string, unknown> | null;
  conflicts: MergeConflict[];
}

/**
 * 3-way deep merge for JSON objects.
 *
 * Logic per key:
 * - If only upstream changed it (variant matches base): take upstream value
 * - If only variant changed it (upstream matches base): take variant value
 * - If both changed it to the same value: take that value
 * - If both changed it to different values: conflict
 * - If upstream added a new key: include it
 * - If variant added a new key: include it
 * - If upstream removed a key and variant didn't modify it: remove it
 * - If upstream removed a key but variant modified it: conflict
 */
export function mergeJson(
  base: Record<string, unknown>,
  upstream: Record<string, unknown>,
  variant: Record<string, unknown>
): MergeResult {
  const conflicts: MergeConflict[] = [];
  const merged = deepMerge3(base, upstream, variant, "", conflicts);

  return {
    ok: conflicts.length === 0,
    merged: merged as Record<string, unknown>,
    conflicts,
  };
}

function deepMerge3(
  base: unknown,
  upstream: unknown,
  variant: unknown,
  path: string,
  conflicts: MergeConflict[]
): unknown {
  // If both upstream and variant are objects (and base is too), recurse
  if (isObject(base) && isObject(upstream) && isObject(variant)) {
    const allKeys = new Set([
      ...Object.keys(base),
      ...Object.keys(upstream),
      ...Object.keys(variant),
    ]);

    const result: Record<string, unknown> = {};

    for (const key of allKeys) {
      const keyPath = path ? `${path}.${key}` : key;
      const inBase = key in base;
      const inUpstream = key in upstream;
      const inVariant = key in variant;

      if (!inBase && inUpstream && !inVariant) {
        // New key added by upstream only -- include it
        result[key] = upstream[key];
      } else if (!inBase && !inUpstream && inVariant) {
        // New key added by variant only -- include it
        result[key] = variant[key];
      } else if (!inBase && inUpstream && inVariant) {
        // Both added the same new key
        if (deepEqual(upstream[key], variant[key])) {
          result[key] = upstream[key];
        } else {
          // Both added different values -- conflict
          conflicts.push({ path: keyPath, base: undefined, upstream: upstream[key], variant: variant[key] });
          result[key] = variant[key]; // default to variant
        }
      } else if (inBase && !inUpstream && inVariant) {
        // Upstream removed this key
        if (deepEqual(base[key], variant[key])) {
          // Variant didn't modify it, so upstream removal wins
          // (don't include in result)
        } else {
          // Variant modified a key that upstream removed -- conflict
          conflicts.push({ path: keyPath, base: base[key], upstream: undefined, variant: variant[key] });
          result[key] = variant[key]; // default to variant
        }
      } else if (inBase && inUpstream && !inVariant) {
        // Variant removed this key
        if (deepEqual(base[key], upstream[key])) {
          // Upstream didn't modify it, variant removal wins
        } else {
          // Upstream modified a key that variant removed -- conflict
          conflicts.push({ path: keyPath, base: base[key], upstream: upstream[key], variant: undefined });
          result[key] = upstream[key]; // default to upstream
        }
      } else if (inBase && inUpstream && inVariant) {
        // Key exists in all three -- 3-way merge
        const baseVal = base[key];
        const upVal = upstream[key];
        const varVal = variant[key];

        const upChanged = !deepEqual(baseVal, upVal);
        const varChanged = !deepEqual(baseVal, varVal);

        if (!upChanged && !varChanged) {
          result[key] = baseVal;
        } else if (upChanged && !varChanged) {
          result[key] = upVal;
        } else if (!upChanged && varChanged) {
          result[key] = varVal;
        } else if (deepEqual(upVal, varVal)) {
          result[key] = upVal;
        } else if (isObject(upVal) && isObject(varVal) && isObject(baseVal)) {
          result[key] = deepMerge3(baseVal, upVal, varVal, keyPath, conflicts);
        } else {
          conflicts.push({ path: keyPath, base: baseVal, upstream: upVal, variant: varVal });
          result[key] = varVal; // default to variant override
        }
      }
    }

    return result;
  }

  // Scalar values -- handled by the caller (object-level merge)
  return variant;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, i) => deepEqual(val, b[i]));
  }
  if (isObject(a) && isObject(b)) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((key) => key in b && deepEqual(a[key], b[key]));
  }
  return false;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/merge/json-driver.test.ts`
Expected: 5 tests PASS

**Step 5: Commit**

```bash
git add src/merge/json-driver.ts tests/merge/json-driver.test.ts
git commit -m "feat: 3-way JSON deep merge driver with conflict detection"
```

---

### Task 6: YAML 3-Way Merge Driver

Converts YAML to JSON objects, reuses the JSON merge logic, converts back.

**Files:**
- Create: `src/merge/yaml-driver.ts`
- Create: `tests/merge/yaml-driver.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { mergeYaml } from "../../src/merge/yaml-driver.js";

describe("mergeYaml", () => {
  it("merges YAML strings using 3-way JSON logic", () => {
    const base = `
stages:
  - name: todo
    color: gray
  - name: done
    color: green
auto_assign: false
`;
    const upstream = `
stages:
  - name: todo
    color: gray
  - name: done
    color: green
auto_assign: false
notifications: true
`;
    const variant = `
stages:
  - name: todo
    color: gray
  - name: done
    color: green
auto_assign: true
`;

    const result = mergeYaml(base, upstream, variant);

    expect(result.ok).toBe(true);
    expect(result.merged).toContain("auto_assign: true"); // variant override
    expect(result.merged).toContain("notifications: true"); // upstream addition
  });

  it("detects conflicts in YAML values", () => {
    const base = "theme: light\nmax: 10\n";
    const upstream = "theme: dark\nmax: 10\n";
    const variant = "theme: ocean\nmax: 100\n";

    const result = mergeYaml(base, upstream, variant);

    expect(result.ok).toBe(false);
    expect(result.conflicts.length).toBe(1);
    expect(result.conflicts[0].path).toBe("theme");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/merge/yaml-driver.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
import yaml from "js-yaml";
import { mergeJson, MergeConflict } from "./json-driver.js";

export interface YamlMergeResult {
  ok: boolean;
  merged: string | null;
  conflicts: MergeConflict[];
}

export function mergeYaml(
  baseStr: string,
  upstreamStr: string,
  variantStr: string
): YamlMergeResult {
  const base = yaml.load(baseStr) as Record<string, unknown>;
  const upstream = yaml.load(upstreamStr) as Record<string, unknown>;
  const variant = yaml.load(variantStr) as Record<string, unknown>;

  const result = mergeJson(base, upstream, variant);

  if (!result.merged) {
    return { ok: false, merged: null, conflicts: result.conflicts };
  }

  const mergedStr = yaml.dump(result.merged, { indent: 2, lineWidth: -1 });

  return {
    ok: result.ok,
    merged: mergedStr,
    conflicts: result.conflicts,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/merge/yaml-driver.test.ts`
Expected: 2 tests PASS

**Step 5: Commit**

```bash
git add src/merge/yaml-driver.ts tests/merge/yaml-driver.test.ts
git commit -m "feat: YAML merge driver (delegates to JSON 3-way merge)"
```

---

### Task 7: Merge Driver CLI Entry Point

Creates the subcommand that git invokes as a custom merge driver: `variantform merge-driver <format> <base> <ours> <theirs>`. Reads files, runs merge, writes result.

**Files:**
- Create: `src/merge/index.ts`
- Create: `tests/merge/driver-cli.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, afterEach } from "vitest";
import { runMergeDriver } from "../../src/merge/index.js";
import { mkdtemp, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("runMergeDriver", () => {
  let tmpDir: string;

  afterEach(async () => {
    if (tmpDir) {
      const { rm } = await import("node:fs/promises");
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("merges JSON files and writes result to 'ours' path", async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "merge-test-"));
    const basePath = join(tmpDir, "base.json");
    const oursPath = join(tmpDir, "ours.json");
    const theirsPath = join(tmpDir, "theirs.json");

    await writeFile(basePath, JSON.stringify({ a: 1, b: 2 }));
    await writeFile(oursPath, JSON.stringify({ a: 1, b: 2, c: 3 })); // upstream added c
    await writeFile(theirsPath, JSON.stringify({ a: 1, b: 99 })); // variant changed b

    const exitCode = await runMergeDriver("json", basePath, oursPath, theirsPath);

    expect(exitCode).toBe(0);
    const result = JSON.parse(await readFile(oursPath, "utf-8"));
    expect(result).toEqual({ a: 1, b: 99, c: 3 });
  });

  it("returns non-zero exit code on conflict", async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "merge-test-"));
    const basePath = join(tmpDir, "base.json");
    const oursPath = join(tmpDir, "ours.json");
    const theirsPath = join(tmpDir, "theirs.json");

    await writeFile(basePath, JSON.stringify({ a: 1 }));
    await writeFile(oursPath, JSON.stringify({ a: 2 })); // upstream changed
    await writeFile(theirsPath, JSON.stringify({ a: 3 })); // variant also changed

    const exitCode = await runMergeDriver("json", basePath, oursPath, theirsPath);

    expect(exitCode).toBe(1);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/merge/driver-cli.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
import { readFile, writeFile } from "node:fs/promises";
import { mergeJson } from "./json-driver.js";
import { mergeYaml } from "./yaml-driver.js";

/**
 * Git custom merge driver entry point.
 * Called by git as: variantform merge-driver <format> <base> <ours> <theirs>
 *
 * In git's merge driver protocol:
 * - %O = base (common ancestor)
 * - %A = ours (the version being merged INTO, i.e. current branch)
 * - %B = theirs (the version being merged FROM)
 *
 * The driver must write the merged result to the 'ours' path.
 * Exit 0 for clean merge, non-zero for conflict.
 */
export async function runMergeDriver(
  format: string,
  basePath: string,
  oursPath: string,
  theirsPath: string
): Promise<number> {
  const baseContent = await readFile(basePath, "utf-8");
  const oursContent = await readFile(oursPath, "utf-8");
  const theirsContent = await readFile(theirsPath, "utf-8");

  if (format === "json") {
    const base = JSON.parse(baseContent);
    const ours = JSON.parse(oursContent);
    const theirs = JSON.parse(theirsContent);

    const result = mergeJson(base, ours, theirs);

    if (result.merged) {
      await writeFile(oursPath, JSON.stringify(result.merged, null, 2) + "\n");
    }

    return result.ok ? 0 : 1;
  }

  if (format === "yaml") {
    const result = mergeYaml(baseContent, oursContent, theirsContent);

    if (result.merged) {
      await writeFile(oursPath, result.merged);
    }

    return result.ok ? 0 : 1;
  }

  console.error(`Unknown format: ${format}`);
  return 1;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/merge/driver-cli.test.ts`
Expected: 2 tests PASS

**Step 5: Commit**

```bash
git add src/merge/index.ts tests/merge/driver-cli.test.ts
git commit -m "feat: merge driver CLI entry point for git integration"
```

---

### Task 8: `init` Command

Creates `.variantform.yaml` with interactive surface setup, configures `.gitattributes` and git merge drivers.

**Files:**
- Create: `src/commands/init.ts`
- Create: `tests/commands/init.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, afterEach } from "vitest";
import { createTestRepo, TestRepo } from "../helpers/test-repo.js";
import { runInit } from "../../src/commands/init.js";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

describe("init command", () => {
  let repo: TestRepo;

  afterEach(async () => {
    await repo?.cleanup();
  });

  it("creates .variantform.yaml with provided surfaces", async () => {
    repo = await createTestRepo();
    await repo.writeFile("config/features.json", '{"a": 1}');
    await repo.commit("add config");

    await runInit(repo.path, [
      { path: "config/features.json", format: "json" as const },
    ]);

    const config = await readFile(join(repo.path, ".variantform.yaml"), "utf-8");
    expect(config).toContain("config/features.json");
    expect(config).toContain("format: json");
  });

  it("creates .gitattributes with merge driver mappings", async () => {
    repo = await createTestRepo();

    await runInit(repo.path, [
      { path: "config/features.json", format: "json" as const },
      { path: "config/workflows/*.yaml", format: "yaml" as const },
    ]);

    const attrs = await readFile(join(repo.path, ".gitattributes"), "utf-8");
    expect(attrs).toContain("config/features.json merge=variantform-json");
    expect(attrs).toContain("config/workflows/*.yaml merge=variantform-yaml");
  });

  it("configures git merge drivers", async () => {
    repo = await createTestRepo();

    await runInit(repo.path, [
      { path: "config/features.json", format: "json" as const },
    ]);

    const jsonDriver = await repo.git.raw(["config", "merge.variantform-json.driver"]);
    expect(jsonDriver.trim()).toContain("variantform merge-driver json");
  });

  it("commits the configuration files", async () => {
    repo = await createTestRepo();

    await runInit(repo.path, [
      { path: "config/features.json", format: "json" as const },
    ]);

    const log = await repo.git.log();
    expect(log.latest?.message).toContain("variantform");
  });

  it("throws if .variantform.yaml already exists", async () => {
    repo = await createTestRepo();
    await repo.writeFile(".variantform.yaml", "surfaces: []\n");
    await repo.commit("existing config");

    await expect(
      runInit(repo.path, [{ path: "config/features.json", format: "json" as const }])
    ).rejects.toThrow("already initialized");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/commands/init.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
import { writeFile, access } from "node:fs/promises";
import { join } from "node:path";
import { simpleGit } from "simple-git";
import yaml from "js-yaml";
import { Surface } from "../config.js";

export async function runInit(
  repoPath: string,
  surfaces: Surface[]
): Promise<void> {
  const configPath = join(repoPath, ".variantform.yaml");
  const attrsPath = join(repoPath, ".gitattributes");

  // Check if already initialized
  try {
    await access(configPath);
    throw new Error("already initialized: .variantform.yaml exists");
  } catch (e) {
    if (e instanceof Error && e.message.includes("already initialized")) throw e;
    // File doesn't exist -- good
  }

  // Write .variantform.yaml
  const config = { surfaces: surfaces.map((s) => ({ path: s.path, format: s.format })) };
  await writeFile(configPath, yaml.dump(config, { indent: 2 }));

  // Write .gitattributes
  const attrLines = surfaces.map(
    (s) => `${s.path} merge=variantform-${s.format}`
  );
  await writeFile(attrsPath, attrLines.join("\n") + "\n");

  // Configure git merge drivers
  const git = simpleGit(repoPath);
  const formats = [...new Set(surfaces.map((s) => s.format))];
  for (const format of formats) {
    await git.addConfig(
      `merge.variantform-${format}.name`,
      `Variantform ${format.toUpperCase()} merge driver`
    );
    await git.addConfig(
      `merge.variantform-${format}.driver`,
      `variantform merge-driver ${format} %O %A %B`
    );
  }

  // Commit
  await git.add([".variantform.yaml", ".gitattributes"]);
  await git.commit("chore: initialize variantform configuration");
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/commands/init.test.ts`
Expected: 5 tests PASS

**Step 5: Commit**

```bash
git add src/commands/init.ts tests/commands/init.test.ts
git commit -m "feat: init command creates config, gitattributes, and merge drivers"
```

---

### Task 9: `create` Command

Creates a new variant branch for a client.

**Files:**
- Create: `src/commands/create.ts`
- Create: `tests/commands/create.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, afterEach } from "vitest";
import { createTestRepo, TestRepo } from "../helpers/test-repo.js";
import { runCreate } from "../../src/commands/create.js";

describe("create command", () => {
  let repo: TestRepo;

  afterEach(async () => {
    await repo?.cleanup();
  });

  it("creates a variant branch from main", async () => {
    repo = await createTestRepo();
    await runCreate(repo.path, "acme-corp");

    const branches = await repo.git.branchLocal();
    expect(branches.all).toContain("variant/acme-corp");
    // Should stay on main after creation
    expect(branches.current).toBe("main");
  });

  it("throws if variant already exists", async () => {
    repo = await createTestRepo();
    await runCreate(repo.path, "acme-corp");
    await expect(runCreate(repo.path, "acme-corp")).rejects.toThrow("already exists");
  });

  it("throws if name contains invalid characters", async () => {
    repo = await createTestRepo();
    await expect(runCreate(repo.path, "acme corp")).rejects.toThrow("invalid");
    await expect(runCreate(repo.path, "acme/corp")).rejects.toThrow("invalid");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/commands/create.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
import { simpleGit } from "simple-git";

const VALID_NAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

export async function runCreate(
  repoPath: string,
  clientName: string
): Promise<void> {
  if (!VALID_NAME.test(clientName)) {
    throw new Error(
      `invalid variant name: "${clientName}". Use alphanumeric, dots, hyphens, underscores.`
    );
  }

  const git = simpleGit(repoPath);
  const branchName = `variant/${clientName}`;

  const branches = await git.branchLocal();
  if (branches.all.includes(branchName)) {
    throw new Error(`variant "${clientName}" already exists`);
  }

  // Create branch from main without switching to it
  await git.branch([branchName, "main"]);
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/commands/create.test.ts`
Expected: 3 tests PASS

**Step 5: Commit**

```bash
git add src/commands/create.ts tests/commands/create.test.ts
git commit -m "feat: create command to add new client variant branches"
```

---

### Task 10: `status` Command

Shows the sync state and override count for all variant branches.

**Files:**
- Create: `src/commands/status.ts`
- Create: `tests/commands/status.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, afterEach } from "vitest";
import { createTestRepo, TestRepo } from "../helpers/test-repo.js";
import { runStatus, VariantStatus } from "../../src/commands/status.js";

describe("status command", () => {
  let repo: TestRepo;

  afterEach(async () => {
    await repo?.cleanup();
  });

  it("reports synced variants with override counts", async () => {
    repo = await createTestRepo();
    await repo.writeFile("config/features.json", '{"a": 1}');
    await repo.commit("add config");

    // Create variant and add an override
    await repo.git.checkoutLocalBranch("variant/acme");
    await repo.writeFile("config/features.json", '{"a": 1, "b": 2}');
    await repo.commit("customize acme");
    await repo.git.checkout("main");

    const statuses = await runStatus(repo.path);

    expect(statuses).toHaveLength(1);
    expect(statuses[0].name).toBe("acme");
    expect(statuses[0].synced).toBe(true);
    expect(statuses[0].overrideCount).toBe(1); // 1 file differs
  });

  it("reports unsynced variants when main moves ahead", async () => {
    repo = await createTestRepo();

    // Create variant at current main
    await repo.git.checkoutLocalBranch("variant/acme");
    await repo.git.checkout("main");

    // Move main ahead
    await repo.writeFile("src/app.ts", "console.log('new');");
    await repo.commit("new feature on main");

    const statuses = await runStatus(repo.path);

    expect(statuses).toHaveLength(1);
    expect(statuses[0].name).toBe("acme");
    expect(statuses[0].synced).toBe(false);
  });

  it("returns empty array when no variants exist", async () => {
    repo = await createTestRepo();
    const statuses = await runStatus(repo.path);
    expect(statuses).toEqual([]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/commands/status.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
import { VariantGit } from "../git.js";

export interface VariantStatus {
  name: string;
  synced: boolean;
  overrideCount: number;
}

export async function runStatus(repoPath: string): Promise<VariantStatus[]> {
  const vg = new VariantGit(repoPath);
  const variants = await vg.listVariants();

  const statuses: VariantStatus[] = [];

  for (const name of variants) {
    const synced = await vg.isVariantSynced(name);
    const overrideCount = await vg.getVariantDiffCount(name);

    statuses.push({ name, synced, overrideCount });
  }

  return statuses;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/commands/status.test.ts`
Expected: 3 tests PASS

**Step 5: Commit**

```bash
git add src/commands/status.ts tests/commands/status.test.ts
git commit -m "feat: status command showing variant sync state and override counts"
```

---

### Task 11: `sync` Command

The core command. Rebases all variant branches onto latest main, using format-aware merge for surface files.

**Files:**
- Create: `src/commands/sync.ts`
- Create: `tests/commands/sync.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, afterEach } from "vitest";
import { createTestRepo, TestRepo } from "../helpers/test-repo.js";
import { runSync, SyncResult } from "../../src/commands/sync.js";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { loadConfig } from "../../src/config.js";

describe("sync command", () => {
  let repo: TestRepo;

  afterEach(async () => {
    await repo?.cleanup();
  });

  it("rebases variant branches onto latest main", async () => {
    repo = await createTestRepo();

    // Create variant at current main
    await repo.git.checkoutLocalBranch("variant/acme");
    await repo.writeFile("config/override.txt", "acme-custom");
    await repo.commit("acme customization");
    await repo.git.checkout("main");

    // Move main ahead
    await repo.writeFile("src/app.ts", "console.log('new');");
    await repo.commit("new feature");

    const results = await runSync(repo.path);

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("acme");
    expect(results[0].status).toBe("synced");

    // Verify variant now includes main's latest commit
    await repo.git.checkout("variant/acme");
    const appContent = await readFile(join(repo.path, "src/app.ts"), "utf-8");
    expect(appContent).toBe("console.log('new');");

    // Verify variant's customization is preserved
    const override = await readFile(join(repo.path, "config/override.txt"), "utf-8");
    expect(override).toBe("acme-custom");
  });

  it("reports conflict when rebase fails", async () => {
    repo = await createTestRepo();
    await repo.writeFile("file.txt", "original");
    await repo.commit("add file");

    // Create variant that modifies the same file
    await repo.git.checkoutLocalBranch("variant/acme");
    await repo.writeFile("file.txt", "variant-change");
    await repo.commit("acme change");
    await repo.git.checkout("main");

    // Main also modifies the same file
    await repo.writeFile("file.txt", "main-change");
    await repo.commit("main change");

    const results = await runSync(repo.path);

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("acme");
    expect(results[0].status).toBe("conflict");
  });

  it("syncs multiple variants independently", async () => {
    repo = await createTestRepo();

    // Create two variants
    await repo.git.checkoutLocalBranch("variant/acme");
    await repo.git.checkout("main");
    await repo.git.checkoutLocalBranch("variant/globex");
    await repo.git.checkout("main");

    // Move main ahead
    await repo.writeFile("src/feature.ts", "new feature");
    await repo.commit("add feature");

    const results = await runSync(repo.path);

    expect(results).toHaveLength(2);
    expect(results.every((r) => r.status === "synced")).toBe(true);
  });

  it("skips variants already synced", async () => {
    repo = await createTestRepo();

    // Create variant at current main (already synced)
    await repo.git.checkoutLocalBranch("variant/acme");
    await repo.git.checkout("main");

    const results = await runSync(repo.path);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("up-to-date");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/commands/sync.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
import { simpleGit } from "simple-git";
import { VariantGit } from "../git.js";

export interface SyncResult {
  name: string;
  status: "synced" | "conflict" | "up-to-date";
  error?: string;
}

export async function runSync(repoPath: string): Promise<SyncResult[]> {
  const vg = new VariantGit(repoPath);
  const git = vg.raw;

  const variants = await vg.listVariants();
  const results: SyncResult[] = [];

  // Save current branch to return to after sync
  const currentBranch = (await git.branchLocal()).current;

  for (const name of variants) {
    // Check if already synced
    if (await vg.isVariantSynced(name)) {
      results.push({ name, status: "up-to-date" });
      continue;
    }

    const branchName = `variant/${name}`;

    try {
      // Checkout variant branch and rebase onto main
      await git.checkout(branchName);
      await git.rebase(["main"]);
      results.push({ name, status: "synced" });
    } catch (e) {
      // Rebase failed -- abort and report conflict
      try {
        await git.rebase(["--abort"]);
      } catch {
        // abort might fail if we're not in a rebase state
      }
      results.push({
        name,
        status: "conflict",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  // Return to original branch
  try {
    await git.checkout(currentBranch);
  } catch {
    // If current branch was a variant that got rebased, try main
    await git.checkout("main");
  }

  return results;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/commands/sync.test.ts`
Expected: 4 tests PASS

**Step 5: Commit**

```bash
git add src/commands/sync.ts tests/commands/sync.test.ts
git commit -m "feat: sync command rebases all variant branches onto latest main"
```

---

### Task 12: `diff` Command

Shows what a specific variant overrides compared to main, filtered to surface files.

**Files:**
- Create: `src/commands/diff.ts`
- Create: `tests/commands/diff.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, afterEach } from "vitest";
import { createTestRepo, TestRepo } from "../helpers/test-repo.js";
import { runDiff, DiffResult } from "../../src/commands/diff.js";

describe("diff command", () => {
  let repo: TestRepo;

  afterEach(async () => {
    await repo?.cleanup();
  });

  it("lists files that differ between main and variant", async () => {
    repo = await createTestRepo();
    await repo.writeFile("config/features.json", '{"a": 1}');
    await repo.writeFile("src/app.ts", "main code");
    await repo.commit("setup");

    await repo.git.checkoutLocalBranch("variant/acme");
    await repo.writeFile("config/features.json", '{"a": 1, "b": 2}');
    await repo.commit("customize features");
    await repo.git.checkout("main");

    const result = await runDiff(repo.path, "acme");

    expect(result.variantName).toBe("acme");
    expect(result.files).toHaveLength(1);
    expect(result.files[0].path).toBe("config/features.json");
  });

  it("throws if variant does not exist", async () => {
    repo = await createTestRepo();
    await expect(runDiff(repo.path, "nonexistent")).rejects.toThrow("not found");
  });

  it("returns empty files array when variant matches main", async () => {
    repo = await createTestRepo();
    await repo.git.checkoutLocalBranch("variant/acme");
    await repo.git.checkout("main");

    const result = await runDiff(repo.path, "acme");
    expect(result.files).toHaveLength(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/commands/diff.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
import { VariantGit } from "../git.js";

export interface DiffFile {
  path: string;
}

export interface DiffResult {
  variantName: string;
  files: DiffFile[];
}

export async function runDiff(
  repoPath: string,
  variantName: string
): Promise<DiffResult> {
  const vg = new VariantGit(repoPath);

  // Check variant exists
  const variants = await vg.listVariants();
  if (!variants.includes(variantName)) {
    throw new Error(`variant "${variantName}" not found`);
  }

  const files = await vg.getVariantDiffFiles(variantName);

  return {
    variantName,
    files: files.map((path) => ({ path })),
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/commands/diff.test.ts`
Expected: 3 tests PASS

**Step 5: Commit**

```bash
git add src/commands/diff.ts tests/commands/diff.test.ts
git commit -m "feat: diff command shows variant overrides vs main"
```

---

### Task 13: Wire CLI Commands

Connect all commands to the Commander.js program in `src/cli.ts`. Add the `merge-driver` subcommand for git integration.

**Files:**
- Modify: `src/cli.ts`

**Step 1: Update src/cli.ts**

```typescript
#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { runInit } from "./commands/init.js";
import { runCreate } from "./commands/create.js";
import { runStatus } from "./commands/status.js";
import { runSync } from "./commands/sync.js";
import { runDiff } from "./commands/diff.js";
import { runMergeDriver } from "./merge/index.js";

const program = new Command();

program
  .name("variantform")
  .description("Git-native tool for managing per-client SaaS product variants")
  .version("0.1.0");

program
  .command("init")
  .description("Initialize variantform in the current repository")
  .requiredOption(
    "-s, --surface <surface...>",
    "Surface declarations in format path:format (e.g. config/features.json:json)"
  )
  .action(async (opts) => {
    const surfaces = opts.surface.map((s: string) => {
      const [path, format] = s.split(":");
      if (!path || !format || !["json", "yaml"].includes(format)) {
        console.error(chalk.red(`Invalid surface: "${s}". Use path:format (e.g. config/features.json:json)`));
        process.exit(1);
      }
      return { path, format: format as "json" | "yaml" };
    });

    try {
      await runInit(process.cwd(), surfaces);
      console.log(chalk.green("Variantform initialized successfully."));
      console.log(`  ${surfaces.length} surface(s) configured.`);
    } catch (e) {
      console.error(chalk.red(`Error: ${(e as Error).message}`));
      process.exit(1);
    }
  });

program
  .command("create <client-name>")
  .description("Create a new client variant branch")
  .action(async (clientName: string) => {
    try {
      await runCreate(process.cwd(), clientName);
      console.log(chalk.green(`Variant "${clientName}" created (branch: variant/${clientName}).`));
    } catch (e) {
      console.error(chalk.red(`Error: ${(e as Error).message}`));
      process.exit(1);
    }
  });

program
  .command("status")
  .description("Show sync state of all variant branches")
  .action(async () => {
    try {
      const statuses = await runStatus(process.cwd());
      if (statuses.length === 0) {
        console.log("No variants found. Create one with: variantform create <client-name>");
        return;
      }
      console.log(`\n${chalk.bold("Variants")} (${statuses.length})\n`);
      for (const s of statuses) {
        const icon = s.synced ? chalk.green("✓") : chalk.red("✗");
        const statusText = s.synced ? "synced" : "drift";
        const overrides = s.overrideCount > 0 ? `${s.overrideCount} file(s)` : "no overrides";
        console.log(`  ${icon} ${chalk.bold(s.name.padEnd(20))} ${statusText.padEnd(10)} ${overrides}`);
      }
      console.log();
    } catch (e) {
      console.error(chalk.red(`Error: ${(e as Error).message}`));
      process.exit(1);
    }
  });

program
  .command("sync")
  .description("Sync all variant branches with latest main")
  .action(async () => {
    try {
      console.log(chalk.bold("Syncing variants with main...\n"));
      const results = await runSync(process.cwd());
      for (const r of results) {
        if (r.status === "synced") {
          console.log(`  ${chalk.green("✓")} ${r.name} — synced`);
        } else if (r.status === "up-to-date") {
          console.log(`  ${chalk.dim("–")} ${r.name} — already up to date`);
        } else {
          console.log(`  ${chalk.red("✗")} ${r.name} — ${chalk.red("conflict")}`);
        }
      }
      console.log();
    } catch (e) {
      console.error(chalk.red(`Error: ${(e as Error).message}`));
      process.exit(1);
    }
  });

program
  .command("diff <client-name>")
  .description("Show what a variant overrides compared to main")
  .action(async (clientName: string) => {
    try {
      const result = await runDiff(process.cwd(), clientName);
      if (result.files.length === 0) {
        console.log(`Variant "${clientName}" has no overrides (matches main).`);
        return;
      }
      console.log(`\n${chalk.bold(clientName)} overrides (${result.files.length} file(s)):\n`);
      for (const f of result.files) {
        console.log(`  ${f.path}`);
      }
      console.log();
    } catch (e) {
      console.error(chalk.red(`Error: ${(e as Error).message}`));
      process.exit(1);
    }
  });

// Hidden subcommand invoked by git as a custom merge driver
program
  .command("merge-driver <format> <base> <ours> <theirs>", { hidden: true })
  .description("Git merge driver (invoked by git, not directly by users)")
  .action(async (format: string, base: string, ours: string, theirs: string) => {
    const exitCode = await runMergeDriver(format, base, ours, theirs);
    process.exit(exitCode);
  });

program.parse();
```

**Step 2: Verify the CLI builds**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Verify help output works**

Run: `npx tsx src/cli.ts --help`
Expected: Shows all commands (init, create, status, sync, diff)

**Step 4: Commit**

```bash
git add src/cli.ts
git commit -m "feat: wire all commands into CLI entry point"
```

---

### Task 14: End-to-End Integration Test

A full workflow test: init → create variants → customize → sync → status → diff. Tests the complete user journey.

**Files:**
- Create: `tests/e2e.test.ts`

**Step 1: Write the test**

```typescript
import { describe, it, expect, afterEach } from "vitest";
import { createTestRepo, TestRepo } from "./helpers/test-repo.js";
import { runInit } from "../src/commands/init.js";
import { runCreate } from "../src/commands/create.js";
import { runStatus } from "../src/commands/status.js";
import { runSync } from "../src/commands/sync.js";
import { runDiff } from "../src/commands/diff.js";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

describe("end-to-end workflow", () => {
  let repo: TestRepo;

  afterEach(async () => {
    await repo?.cleanup();
  });

  it("full lifecycle: init → create → customize → sync → status → diff", async () => {
    repo = await createTestRepo();

    // 1. Set up a realistic SaaS repo
    await repo.writeFile(
      "config/features.json",
      JSON.stringify({ kanban: true, gantt: true, time_tracking: false, max_projects: 10 }, null, 2)
    );
    await repo.writeFile("src/app.ts", "export const app = 'my-saas';");
    await repo.commit("initial product");

    // 2. Initialize variantform
    await runInit(repo.path, [
      { path: "config/features.json", format: "json" },
    ]);

    // 3. Create two variants
    await runCreate(repo.path, "acme");
    await runCreate(repo.path, "globex");

    // 4. Customize acme
    await repo.git.checkout("variant/acme");
    await repo.writeFile(
      "config/features.json",
      JSON.stringify({ kanban: true, gantt: true, time_tracking: true, max_projects: 50 }, null, 2)
    );
    await repo.commit("customize acme: enable time tracking, increase projects");
    await repo.git.checkout("main");

    // 5. Customize globex
    await repo.git.checkout("variant/globex");
    await repo.writeFile(
      "config/features.json",
      JSON.stringify({ kanban: true, gantt: false, time_tracking: false, max_projects: 5 }, null, 2)
    );
    await repo.commit("customize globex: disable gantt, fewer projects");
    await repo.git.checkout("main");

    // 6. Check status -- both should be synced (main hasn't moved since they branched after init)
    let statuses = await runStatus(repo.path);
    expect(statuses).toHaveLength(2);

    // 7. Now main evolves: add a new feature
    await repo.writeFile("src/new-feature.ts", "export const feature = 'ai';");
    await repo.commit("add AI feature to core");

    // 8. Check status -- variants should be out of sync
    statuses = await runStatus(repo.path);
    expect(statuses.every((s) => !s.synced)).toBe(true);

    // 9. Sync all variants
    const syncResults = await runSync(repo.path);
    expect(syncResults).toHaveLength(2);
    expect(syncResults.every((r) => r.status === "synced")).toBe(true);

    // 10. Verify variants have the new feature AND their customizations
    await repo.git.checkout("variant/acme");
    const acmeApp = await readFile(join(repo.path, "src/new-feature.ts"), "utf-8");
    expect(acmeApp).toContain("ai");
    const acmeFeatures = JSON.parse(
      await readFile(join(repo.path, "config/features.json"), "utf-8")
    );
    expect(acmeFeatures.time_tracking).toBe(true);
    expect(acmeFeatures.max_projects).toBe(50);
    await repo.git.checkout("main");

    // 11. Check status again -- all synced
    statuses = await runStatus(repo.path);
    expect(statuses.every((s) => s.synced)).toBe(true);

    // 12. Diff shows overrides
    const acmeDiff = await runDiff(repo.path, "acme");
    expect(acmeDiff.files.length).toBeGreaterThan(0);
    expect(acmeDiff.files.some((f) => f.path === "config/features.json")).toBe(true);
  });
});
```

**Step 2: Run the test**

Run: `npx vitest run tests/e2e.test.ts`
Expected: PASS

**Step 3: Run all tests to verify nothing is broken**

Run: `npx vitest run`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add tests/e2e.test.ts
git commit -m "test: end-to-end integration test covering full variant lifecycle"
```

---

### Task 15: Surface Violation Detection

Add a `validate` check to `status` that flags when a variant branch has changes outside declared surfaces. This enforces the key invariant.

**Files:**
- Modify: `src/git.ts` (add `getChangesOutsideSurfaces` method)
- Modify: `src/commands/status.ts` (add violation flag)
- Create: `tests/commands/surface-violation.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, afterEach } from "vitest";
import { createTestRepo, TestRepo } from "../helpers/test-repo.js";
import { runInit } from "../../src/commands/init.js";
import { runCreate } from "../../src/commands/create.js";
import { runStatus } from "../../src/commands/status.js";

describe("surface violation detection", () => {
  let repo: TestRepo;

  afterEach(async () => {
    await repo?.cleanup();
  });

  it("flags variant with changes outside declared surfaces", async () => {
    repo = await createTestRepo();
    await repo.writeFile("config/features.json", '{"a": 1}');
    await repo.writeFile("src/app.ts", "core code");
    await repo.commit("setup");

    await runInit(repo.path, [
      { path: "config/features.json", format: "json" },
    ]);

    await runCreate(repo.path, "rogue-client");

    // Customize -- but also modify core code (violation!)
    await repo.git.checkout("variant/rogue-client");
    await repo.writeFile("config/features.json", '{"a": 2}');
    await repo.writeFile("src/app.ts", "modified core code!"); // VIOLATION
    await repo.commit("customize + violate");
    await repo.git.checkout("main");

    const statuses = await runStatus(repo.path);

    expect(statuses).toHaveLength(1);
    expect(statuses[0].violations).toBeDefined();
    expect(statuses[0].violations!.length).toBeGreaterThan(0);
    expect(statuses[0].violations).toContain("src/app.ts");
  });

  it("reports no violations for clean variant", async () => {
    repo = await createTestRepo();
    await repo.writeFile("config/features.json", '{"a": 1}');
    await repo.commit("setup");

    await runInit(repo.path, [
      { path: "config/features.json", format: "json" },
    ]);

    await runCreate(repo.path, "clean-client");
    await repo.git.checkout("variant/clean-client");
    await repo.writeFile("config/features.json", '{"a": 2}');
    await repo.commit("customize within surfaces");
    await repo.git.checkout("main");

    const statuses = await runStatus(repo.path);

    expect(statuses).toHaveLength(1);
    expect(statuses[0].violations).toEqual([]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/commands/surface-violation.test.ts`
Expected: FAIL -- `violations` property doesn't exist on `VariantStatus`

**Step 3: Update `src/git.ts` -- add surface matching**

Add this method to the `VariantGit` class:

```typescript
// Add to imports at top of git.ts
import fg from "fast-glob";

// Add to VariantGit class:

  /** Get files changed by variant that are outside declared surface patterns */
  async getViolations(
    variantName: string,
    surfacePatterns: string[]
  ): Promise<string[]> {
    const changedFiles = await this.getVariantDiffFiles(variantName);
    if (changedFiles.length === 0) return [];

    // Exclude .variantform.yaml and .gitattributes (created by init, always shared)
    const excluded = new Set([".variantform.yaml", ".gitattributes"]);

    return changedFiles.filter((file) => {
      if (excluded.has(file)) return false;
      // Check if file matches any surface pattern
      return !surfacePatterns.some((pattern) => fg.isDynamicPattern(pattern)
        ? fg.sync(pattern, { dot: true }).includes(file) || new RegExp(fg.convertPathToPattern(pattern).replace(/\*/g, ".*")).test(file)
        : file === pattern
      );
    });
  }
```

Actually, let me simplify the surface matching. `fast-glob`'s `isDynamicPattern` is for checking if a pattern has wildcards. For matching a file against a glob pattern, we should use `micromatch` or `picomatch`. Let me use `picomatch` which is already a dependency of `fast-glob`.

**Step 3 (revised): Update `src/git.ts`**

Add this method to the `VariantGit` class in `src/git.ts`:

```typescript
// Add import at top
import picomatch from "picomatch";

// Add to VariantGit class:

  /** Get files changed by variant that are outside declared surface patterns */
  async getViolations(
    variantName: string,
    surfacePatterns: string[]
  ): Promise<string[]> {
    const changedFiles = await this.getVariantDiffFiles(variantName);
    if (changedFiles.length === 0) return [];

    const excluded = new Set([".variantform.yaml", ".gitattributes"]);
    const isMatch = picomatch(surfacePatterns);

    return changedFiles.filter((file) => {
      if (excluded.has(file)) return false;
      return !isMatch(file);
    });
  }
```

Note: `picomatch` is a transitive dependency of `fast-glob`, so it's already installed. But add it as a direct dependency for clarity:

Run: `npm install picomatch && npm install -D @types/picomatch`

**Step 4: Update `src/commands/status.ts`**

```typescript
import { VariantGit } from "../git.js";
import { loadConfig } from "../config.js";

export interface VariantStatus {
  name: string;
  synced: boolean;
  overrideCount: number;
  violations?: string[];
}

export async function runStatus(repoPath: string): Promise<VariantStatus[]> {
  const vg = new VariantGit(repoPath);
  const variants = await vg.listVariants();

  // Try to load config for surface violation checking
  let surfacePatterns: string[] | null = null;
  try {
    const config = await loadConfig(repoPath);
    surfacePatterns = config.surfaces.map((s) => s.path);
  } catch {
    // Config might not exist (e.g. in tests without init)
  }

  const statuses: VariantStatus[] = [];

  for (const name of variants) {
    const synced = await vg.isVariantSynced(name);
    const overrideCount = await vg.getVariantDiffCount(name);

    let violations: string[] = [];
    if (surfacePatterns) {
      violations = await vg.getViolations(name, surfacePatterns);
    }

    statuses.push({ name, synced, overrideCount, violations });
  }

  return statuses;
}
```

**Step 5: Run test to verify it passes**

Run: `npx vitest run tests/commands/surface-violation.test.ts`
Expected: 2 tests PASS

**Step 6: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS

**Step 7: Commit**

```bash
git add src/git.ts src/commands/status.ts tests/commands/surface-violation.test.ts package.json package-lock.json
git commit -m "feat: surface violation detection flags changes outside declared surfaces"
```

---

### Task 16: Package for npm and Add README

Make the CLI installable via `npm install -g variantform`.

**Files:**
- Modify: `package.json` (add `files`, `keywords`, `repository`)
- Create: `README.md`

**Step 1: Update package.json fields**

Add to `package.json`:
```json
{
  "files": ["dist", "README.md", "LICENSE"],
  "keywords": ["saas", "variant", "customization", "git", "multi-tenant", "white-label", "cli"],
  "repository": {
    "type": "git",
    "url": "https://github.com/nikitadmitrieff/variantform"
  }
}
```

**Step 2: Create a concise README.md**

Write a README covering:
- One-line description
- Install: `npm install -g variantform`
- Quick start (init, create, customize, sync, status, diff)
- How it works (surfaces, variant branches, format-aware merge)
- License: MIT

Keep it under 150 lines. Match the tone of the design doc.

**Step 3: Create LICENSE**

MIT license with current year and author name.

**Step 4: Build and verify**

Run: `npx tsc`
Expected: `dist/` directory created with compiled JS

Run: `node dist/cli.js --help`
Expected: Shows help with all commands

**Step 5: Run all tests one final time**

Run: `npx vitest run`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add package.json README.md LICENSE dist/
git commit -m "chore: package for npm with README and license"
```

---

## Task Dependency Graph

```
Task 1 (scaffolding)
  └── Task 2 (test helper)
        ├── Task 3 (config module)
        │     └── Task 15 (surface violations) ← also depends on Task 10
        ├── Task 4 (git module)
        │     ├── Task 10 (status)
        │     ├── Task 11 (sync)
        │     └── Task 12 (diff)
        ├── Task 5 (JSON merge driver)
        │     └── Task 6 (YAML merge driver)
        │           └── Task 7 (merge driver CLI)
        └── Task 8 (init command)
              └── Task 9 (create command)

Task 13 (wire CLI) ← depends on Tasks 8-12
Task 14 (e2e test) ← depends on Task 13
Task 15 (violations) ← depends on Tasks 3, 4, 10
Task 16 (packaging) ← depends on all above
```

## Parallel Execution Opportunities

These task groups can be worked on simultaneously:
- **Group A**: Tasks 3 (config) + 4 (git) + 5 (JSON merge)
- **Group B**: Tasks 8 (init) + 9 (create) (after Group A)
- **Group C**: Tasks 10 (status) + 11 (sync) + 12 (diff) (after Task 4)
