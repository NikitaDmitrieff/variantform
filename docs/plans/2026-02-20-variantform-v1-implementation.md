# Variantform V1 CLI Implementation Plan (Revised: Overlay Architecture)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the open-source Variantform CLI that lets SaaS vendors manage per-client configuration variants using an overlay model -- all variants as folders in the same repo, no branches, no rebase.

**Architecture:** TypeScript CLI. Base config files live in their normal locations. Per-client overrides live in `variants/<client>/` as delta files. The tool merges base + overrides on demand using JSON Merge Patch (RFC 7396) or full file replacement. Validation catches stale or invalid overrides.

**Tech Stack:** TypeScript, Commander.js (CLI), js-yaml (YAML), chalk (terminal colors), Vitest (tests), tsx (dev runner)

**Key dependency removed:** `simple-git` -- no longer needed since we don't manage branches. We only use git for detecting the repo root (or just use cwd).

---

## Project Structure

```
variantform/
├── src/
│   ├── cli.ts                    # Entry point, command registration
│   ├── config.ts                 # Parse .variantform.yaml
│   ├── merge.ts                  # JSON/YAML deep merge (RFC 7396)
│   └── commands/
│       ├── init.ts               # variantform init
│       ├── create.ts             # variantform create <client>
│       ├── resolve.ts            # variantform resolve <client> [surface]
│       ├── status.ts             # variantform status
│       ├── diff.ts               # variantform diff <client>
│       └── validate.ts           # variantform validate
├── tests/
│   ├── helpers/
│   │   └── test-project.ts       # Create temp project directories for testing
│   ├── config.test.ts
│   ├── merge.test.ts
│   └── commands/
│       ├── init.test.ts
│       ├── create.test.ts
│       ├── resolve.test.ts
│       ├── status.test.ts
│       ├── diff.test.ts
│       └── validate.test.ts
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
  "description": "Git-native overlay tool for managing per-client SaaS product variants",
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
    "js-yaml": "^4.1.0"
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

Note: `simple-git` is removed. We don't manage branches anymore.

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
    testTimeout: 10000,
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
  .description("Git-native overlay tool for managing per-client SaaS product variants")
  .version("0.1.0");

program.parse();
```

**Step 5: Install dependencies**

Run: `npm install`
Expected: `node_modules` created, lock file generated

**Step 6: Verify build works**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 7: Commit**

```bash
git add package.json tsconfig.json vitest.config.ts src/cli.ts package-lock.json
git commit -m "feat: project scaffolding with TypeScript, Commander, Vitest"
```

---

### Task 2: Test Helper -- Temp Project Factory

Creates a helper that sets up temporary project directories with base config files and variant folders for testing.

**Files:**
- Create: `tests/helpers/test-project.ts`
- Create: `tests/helpers/test-project.test.ts`

**Step 1: Write the test helper**

```typescript
import { mkdtemp, writeFile, mkdir, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";

export interface TestProject {
  path: string;
  /** Write a file relative to project root */
  writeFile(relativePath: string, content: string): Promise<void>;
  /** Read a file relative to project root */
  readFile(relativePath: string): Promise<string>;
  /** Clean up the temp directory */
  cleanup(): Promise<void>;
}

export async function createTestProject(): Promise<TestProject> {
  const path = await mkdtemp(join(tmpdir(), "variantform-test-"));

  const project: TestProject = {
    path,
    async writeFile(relativePath: string, content: string) {
      const fullPath = join(path, relativePath);
      await mkdir(dirname(fullPath), { recursive: true });
      await writeFile(fullPath, content);
    },
    async readFile(relativePath: string): Promise<string> {
      return readFile(join(path, relativePath), "utf-8");
    },
    async cleanup() {
      await rm(path, { recursive: true, force: true });
    },
  };

  return project;
}
```

**Step 2: Write a smoke test**

```typescript
import { describe, it, expect, afterEach } from "vitest";
import { createTestProject, TestProject } from "./test-project.js";

describe("createTestProject", () => {
  let project: TestProject;

  afterEach(async () => {
    await project?.cleanup();
  });

  it("creates a temp directory and allows writing/reading files", async () => {
    project = await createTestProject();
    await project.writeFile("config/features.json", '{"a": 1}');
    const content = await project.readFile("config/features.json");
    expect(JSON.parse(content)).toEqual({ a: 1 });
  });

  it("creates nested directories automatically", async () => {
    project = await createTestProject();
    await project.writeFile("variants/acme/config/features.json", '{"b": 2}');
    const content = await project.readFile("variants/acme/config/features.json");
    expect(JSON.parse(content)).toEqual({ b: 2 });
  });
});
```

**Step 3: Run test to verify it passes**

Run: `npx vitest run tests/helpers/test-project.test.ts`
Expected: 2 tests PASS

**Step 4: Commit**

```bash
git add tests/helpers/
git commit -m "test: add temp project factory for integration tests"
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
import { createTestProject, TestProject } from "./helpers/test-project.js";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  let project: TestProject;

  afterEach(async () => {
    await project?.cleanup();
  });

  it("parses .variantform.yaml with surface declarations", async () => {
    project = await createTestProject();
    await project.writeFile(
      ".variantform.yaml",
      `surfaces:
  - path: "config/features.json"
    format: json
    strategy: merge
  - path: "config/theme.json"
    format: json
    strategy: replace
  - path: "config/workflows/*.yaml"
    format: yaml
    strategy: merge
`
    );

    const config = await loadConfig(project.path);
    expect(config.surfaces).toHaveLength(3);
    expect(config.surfaces[0]).toEqual({
      path: "config/features.json",
      format: "json",
      strategy: "merge",
    });
    expect(config.surfaces[1].strategy).toBe("replace");
  });

  it("defaults strategy to merge when not specified", async () => {
    project = await createTestProject();
    await project.writeFile(
      ".variantform.yaml",
      `surfaces:
  - path: "config/features.json"
    format: json
`
    );

    const config = await loadConfig(project.path);
    expect(config.surfaces[0].strategy).toBe("merge");
  });

  it("throws if .variantform.yaml is missing", async () => {
    project = await createTestProject();
    await expect(loadConfig(project.path)).rejects.toThrow(".variantform.yaml not found");
  });

  it("throws if surfaces array is missing", async () => {
    project = await createTestProject();
    await project.writeFile(".variantform.yaml", "version: 1\n");
    await expect(loadConfig(project.path)).rejects.toThrow("surfaces");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/config.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import yaml from "js-yaml";

export type MergeStrategy = "merge" | "replace";

export interface Surface {
  path: string;
  format: "json" | "yaml";
  strategy: MergeStrategy;
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
    return {
      path: surface.path,
      format: surface.format as Surface["format"],
      strategy: (surface.strategy as MergeStrategy) || "merge",
    };
  });

  return { surfaces };
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/config.test.ts`
Expected: 4 tests PASS

**Step 5: Commit**

```bash
git add src/config.ts tests/config.test.ts
git commit -m "feat: config module with surface declarations and merge strategies"
```

---

### Task 4: JSON/YAML Deep Merge (RFC 7396)

The core merge engine. Applies an override (partial patch) on top of a base using JSON Merge Patch semantics. Much simpler than the 3-way merge from the branch approach -- this is just 2-way (base + override).

**Files:**
- Create: `src/merge.ts`
- Create: `tests/merge.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { applyOverride, applyYamlOverride } from "../src/merge.js";

describe("applyOverride (JSON)", () => {
  it("deep merges override on top of base", () => {
    const base = { kanban: true, gantt: true, time_tracking: false, max_projects: 10 };
    const override = { time_tracking: true, max_projects: 50 };

    const result = applyOverride(base, override);

    expect(result).toEqual({
      kanban: true,
      gantt: true,
      time_tracking: true,
      max_projects: 50,
    });
  });

  it("preserves base keys not in override", () => {
    const base = { a: 1, b: 2, c: 3 };
    const override = { b: 99 };

    const result = applyOverride(base, override);
    expect(result).toEqual({ a: 1, b: 99, c: 3 });
  });

  it("adds new keys from override", () => {
    const base = { a: 1 };
    const override = { b: 2 };

    const result = applyOverride(base, override);
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it("handles nested objects", () => {
    const base = { ui: { sidebar: true, footer: false }, limits: { storage: 10 } };
    const override = { ui: { sidebar: false }, limits: { storage: 50 } };

    const result = applyOverride(base, override);
    expect(result).toEqual({
      ui: { sidebar: false, footer: false },
      limits: { storage: 50 },
    });
  });

  it("removes keys when override sets them to null (RFC 7396)", () => {
    const base = { a: 1, b: 2, c: 3 };
    const override = { b: null };

    const result = applyOverride(base, override);
    expect(result).toEqual({ a: 1, c: 3 });
  });

  it("replaces arrays entirely (RFC 7396 behavior)", () => {
    const base = { tags: ["a", "b", "c"] };
    const override = { tags: ["x", "y"] };

    const result = applyOverride(base, override);
    expect(result).toEqual({ tags: ["x", "y"] });
  });

  it("handles empty override (returns base as-is)", () => {
    const base = { a: 1, b: 2 };
    const override = {};

    const result = applyOverride(base, override);
    expect(result).toEqual({ a: 1, b: 2 });
  });
});

describe("applyYamlOverride", () => {
  it("merges YAML strings using JSON merge logic", () => {
    const base = "auto_assign: false\nnotifications: true\n";
    const override = "auto_assign: true\n";

    const result = applyYamlOverride(base, override);
    expect(result).toContain("auto_assign: true");
    expect(result).toContain("notifications: true");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/merge.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
import yaml from "js-yaml";

/**
 * Apply an override on top of a base object using JSON Merge Patch (RFC 7396) semantics.
 *
 * Rules:
 * - Override keys are deep-merged into base
 * - null values in override mean "delete this key"
 * - Arrays are replaced entirely (not merged element-by-element)
 * - Nested objects are recursively merged
 * - Keys in base but not in override are preserved
 */
export function applyOverride(
  base: Record<string, unknown>,
  override: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...base };

  for (const [key, overrideValue] of Object.entries(override)) {
    if (overrideValue === null) {
      // RFC 7396: null means delete
      delete result[key];
    } else if (
      isObject(overrideValue) &&
      isObject(result[key])
    ) {
      // Both are objects: recurse
      result[key] = applyOverride(
        result[key] as Record<string, unknown>,
        overrideValue as Record<string, unknown>
      );
    } else {
      // Scalar, array, or type mismatch: override wins
      result[key] = overrideValue;
    }
  }

  return result;
}

/**
 * Apply a YAML override on top of a YAML base string.
 * Parses both to objects, applies JSON merge, serializes back to YAML.
 */
export function applyYamlOverride(baseStr: string, overrideStr: string): string {
  const base = yaml.load(baseStr) as Record<string, unknown>;
  const override = yaml.load(overrideStr) as Record<string, unknown>;
  const merged = applyOverride(base, override);
  return yaml.dump(merged, { indent: 2, lineWidth: -1 });
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/merge.test.ts`
Expected: 8 tests PASS

**Step 5: Commit**

```bash
git add src/merge.ts tests/merge.test.ts
git commit -m "feat: JSON/YAML deep merge engine with RFC 7396 semantics"
```

---

### Task 5: `init` Command

Creates `.variantform.yaml` and the `variants/` directory.

**Files:**
- Create: `src/commands/init.ts`
- Create: `tests/commands/init.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, afterEach } from "vitest";
import { createTestProject, TestProject } from "../helpers/test-project.js";
import { runInit } from "../../src/commands/init.js";
import { existsSync } from "node:fs";
import { join } from "node:path";

describe("init command", () => {
  let project: TestProject;

  afterEach(async () => {
    await project?.cleanup();
  });

  it("creates .variantform.yaml with provided surfaces", async () => {
    project = await createTestProject();

    await runInit(project.path, [
      { path: "config/features.json", format: "json", strategy: "merge" },
    ]);

    const config = await project.readFile(".variantform.yaml");
    expect(config).toContain("config/features.json");
    expect(config).toContain("format: json");
    expect(config).toContain("strategy: merge");
  });

  it("creates the variants/ directory", async () => {
    project = await createTestProject();

    await runInit(project.path, [
      { path: "config/features.json", format: "json", strategy: "merge" },
    ]);

    expect(existsSync(join(project.path, "variants"))).toBe(true);
  });

  it("creates a .gitkeep in variants/ so git tracks the empty directory", async () => {
    project = await createTestProject();

    await runInit(project.path, [
      { path: "config/features.json", format: "json", strategy: "merge" },
    ]);

    expect(existsSync(join(project.path, "variants", ".gitkeep"))).toBe(true);
  });

  it("throws if .variantform.yaml already exists", async () => {
    project = await createTestProject();
    await project.writeFile(".variantform.yaml", "surfaces: []\n");

    await expect(
      runInit(project.path, [
        { path: "config/features.json", format: "json", strategy: "merge" },
      ])
    ).rejects.toThrow("already initialized");
  });

  it("does NOT auto-commit", async () => {
    project = await createTestProject();

    await runInit(project.path, [
      { path: "config/features.json", format: "json", strategy: "merge" },
    ]);

    // Files exist but no git operations were performed
    // (user commits when ready)
    expect(existsSync(join(project.path, ".variantform.yaml"))).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/commands/init.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
import { writeFile, mkdir, access } from "node:fs/promises";
import { join } from "node:path";
import yaml from "js-yaml";
import { Surface } from "../config.js";

export async function runInit(
  projectPath: string,
  surfaces: Surface[]
): Promise<void> {
  const configPath = join(projectPath, ".variantform.yaml");
  const variantsDir = join(projectPath, "variants");

  // Check if already initialized
  try {
    await access(configPath);
    throw new Error("already initialized: .variantform.yaml exists");
  } catch (e) {
    if (e instanceof Error && e.message.includes("already initialized")) throw e;
  }

  // Write .variantform.yaml
  const config = {
    surfaces: surfaces.map((s) => ({
      path: s.path,
      format: s.format,
      strategy: s.strategy,
    })),
  };
  await writeFile(configPath, yaml.dump(config, { indent: 2 }));

  // Create variants/ directory with .gitkeep
  await mkdir(variantsDir, { recursive: true });
  await writeFile(join(variantsDir, ".gitkeep"), "");
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/commands/init.test.ts`
Expected: 5 tests PASS

**Step 5: Commit**

```bash
git add src/commands/init.ts tests/commands/init.test.ts
git commit -m "feat: init command creates config and variants directory"
```

---

### Task 6: `create` Command

Creates a new variant directory.

**Files:**
- Create: `src/commands/create.ts`
- Create: `tests/commands/create.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, afterEach } from "vitest";
import { createTestProject, TestProject } from "../helpers/test-project.js";
import { runCreate } from "../../src/commands/create.js";
import { existsSync } from "node:fs";
import { join } from "node:path";

describe("create command", () => {
  let project: TestProject;

  afterEach(async () => {
    await project?.cleanup();
  });

  it("creates a variant directory", async () => {
    project = await createTestProject();
    await project.writeFile("variants/.gitkeep", "");

    await runCreate(project.path, "acme-corp");

    expect(existsSync(join(project.path, "variants", "acme-corp"))).toBe(true);
  });

  it("creates a .gitkeep in the variant directory", async () => {
    project = await createTestProject();
    await project.writeFile("variants/.gitkeep", "");

    await runCreate(project.path, "acme-corp");

    expect(existsSync(join(project.path, "variants", "acme-corp", ".gitkeep"))).toBe(true);
  });

  it("throws if variant already exists", async () => {
    project = await createTestProject();
    await project.writeFile("variants/acme-corp/.gitkeep", "");

    await expect(runCreate(project.path, "acme-corp")).rejects.toThrow("already exists");
  });

  it("throws if name contains invalid characters", async () => {
    project = await createTestProject();
    await project.writeFile("variants/.gitkeep", "");

    await expect(runCreate(project.path, "acme corp")).rejects.toThrow("invalid");
    await expect(runCreate(project.path, "../escape")).rejects.toThrow("invalid");
  });

  it("throws if variants/ directory does not exist", async () => {
    project = await createTestProject();

    await expect(runCreate(project.path, "acme")).rejects.toThrow("not initialized");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/commands/create.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
import { mkdir, access, writeFile } from "node:fs/promises";
import { join } from "node:path";

const VALID_NAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

export async function runCreate(
  projectPath: string,
  clientName: string
): Promise<void> {
  if (!VALID_NAME.test(clientName)) {
    throw new Error(
      `invalid variant name: "${clientName}". Use alphanumeric, dots, hyphens, underscores.`
    );
  }

  const variantsDir = join(projectPath, "variants");

  // Check variants/ exists (project is initialized)
  try {
    await access(variantsDir);
  } catch {
    throw new Error("not initialized: run 'variantform init' first");
  }

  const variantDir = join(variantsDir, clientName);

  // Check if variant already exists
  try {
    await access(variantDir);
    throw new Error(`variant "${clientName}" already exists`);
  } catch (e) {
    if (e instanceof Error && e.message.includes("already exists")) throw e;
  }

  await mkdir(variantDir, { recursive: true });
  await writeFile(join(variantDir, ".gitkeep"), "");
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/commands/create.test.ts`
Expected: 5 tests PASS

**Step 5: Commit**

```bash
git add src/commands/create.ts tests/commands/create.test.ts
git commit -m "feat: create command adds new variant directories"
```

---

### Task 7: `resolve` Command

The core value command. Reads base + override, merges them, outputs the resolved config for a client.

**Files:**
- Create: `src/commands/resolve.ts`
- Create: `tests/commands/resolve.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, afterEach } from "vitest";
import { createTestProject, TestProject } from "../helpers/test-project.js";
import { runResolve } from "../../src/commands/resolve.js";

describe("resolve command", () => {
  let project: TestProject;

  afterEach(async () => {
    await project?.cleanup();
  });

  it("deep merges override on top of base for JSON surface", async () => {
    project = await createTestProject();
    await project.writeFile(
      ".variantform.yaml",
      'surfaces:\n  - path: "config/features.json"\n    format: json\n    strategy: merge\n'
    );
    await project.writeFile(
      "config/features.json",
      JSON.stringify({ kanban: true, gantt: true, time_tracking: false, max_projects: 10 }, null, 2)
    );
    await project.writeFile(
      "variants/acme/config/features.json",
      JSON.stringify({ time_tracking: true, max_projects: 50 }, null, 2)
    );

    const results = await runResolve(project.path, "acme");

    expect(results).toHaveLength(1);
    expect(results[0].surface).toBe("config/features.json");
    const resolved = JSON.parse(results[0].content);
    expect(resolved).toEqual({
      kanban: true,
      gantt: true,
      time_tracking: true,
      max_projects: 50,
    });
  });

  it("replaces file entirely for replace strategy", async () => {
    project = await createTestProject();
    await project.writeFile(
      ".variantform.yaml",
      'surfaces:\n  - path: "config/theme.json"\n    format: json\n    strategy: replace\n'
    );
    await project.writeFile(
      "config/theme.json",
      JSON.stringify({ color: "blue", font: "sans" }, null, 2)
    );
    await project.writeFile(
      "variants/acme/config/theme.json",
      JSON.stringify({ color: "red", font: "serif", logo: "acme.png" }, null, 2)
    );

    const results = await runResolve(project.path, "acme");

    const resolved = JSON.parse(results[0].content);
    expect(resolved).toEqual({ color: "red", font: "serif", logo: "acme.png" });
  });

  it("returns base when no override exists for a surface", async () => {
    project = await createTestProject();
    await project.writeFile(
      ".variantform.yaml",
      'surfaces:\n  - path: "config/features.json"\n    format: json\n    strategy: merge\n'
    );
    await project.writeFile(
      "config/features.json",
      JSON.stringify({ a: 1 }, null, 2)
    );
    // No override file for acme
    await project.writeFile("variants/acme/.gitkeep", "");

    const results = await runResolve(project.path, "acme");

    const resolved = JSON.parse(results[0].content);
    expect(resolved).toEqual({ a: 1 });
  });

  it("resolves a specific surface when specified", async () => {
    project = await createTestProject();
    await project.writeFile(
      ".variantform.yaml",
      'surfaces:\n  - path: "config/features.json"\n    format: json\n  - path: "config/theme.json"\n    format: json\n'
    );
    await project.writeFile("config/features.json", '{"a": 1}');
    await project.writeFile("config/theme.json", '{"color": "blue"}');
    await project.writeFile("variants/acme/config/features.json", '{"a": 2}');
    await project.writeFile("variants/acme/.gitkeep", "");

    const results = await runResolve(project.path, "acme", "config/features.json");

    expect(results).toHaveLength(1);
    expect(results[0].surface).toBe("config/features.json");
  });

  it("throws if variant does not exist", async () => {
    project = await createTestProject();
    await project.writeFile(
      ".variantform.yaml",
      'surfaces:\n  - path: "config/features.json"\n    format: json\n'
    );

    await expect(runResolve(project.path, "nonexistent")).rejects.toThrow("not found");
  });

  it("handles YAML surfaces", async () => {
    project = await createTestProject();
    await project.writeFile(
      ".variantform.yaml",
      'surfaces:\n  - path: "config/workflow.yaml"\n    format: yaml\n    strategy: merge\n'
    );
    await project.writeFile("config/workflow.yaml", "auto_assign: false\nnotifications: true\n");
    await project.writeFile("variants/acme/config/workflow.yaml", "auto_assign: true\n");

    const results = await runResolve(project.path, "acme");

    expect(results[0].content).toContain("auto_assign: true");
    expect(results[0].content).toContain("notifications: true");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/commands/resolve.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
import { readFile, access } from "node:fs/promises";
import { join } from "node:path";
import yaml from "js-yaml";
import { loadConfig, Surface } from "../config.js";
import { applyOverride, applyYamlOverride } from "../merge.js";
import fg from "fast-glob";

export interface ResolveResult {
  surface: string;
  content: string;
  hasOverride: boolean;
}

export async function runResolve(
  projectPath: string,
  variantName: string,
  surfaceFilter?: string
): Promise<ResolveResult[]> {
  const config = await loadConfig(projectPath);
  const variantDir = join(projectPath, "variants", variantName);

  // Check variant exists
  try {
    await access(variantDir);
  } catch {
    throw new Error(`variant "${variantName}" not found`);
  }

  // Expand glob patterns in surfaces
  const expandedSurfaces = await expandSurfaces(projectPath, config.surfaces);

  // Filter to specific surface if requested
  const surfaces = surfaceFilter
    ? expandedSurfaces.filter((s) => s.path === surfaceFilter)
    : expandedSurfaces;

  const results: ResolveResult[] = [];

  for (const surface of surfaces) {
    const basePath = join(projectPath, surface.path);
    const overridePath = join(variantDir, surface.path);

    const baseContent = await readFile(basePath, "utf-8");

    let hasOverride = false;
    let overrideContent: string | null = null;
    try {
      overrideContent = await readFile(overridePath, "utf-8");
      hasOverride = true;
    } catch {
      // No override -- use base as-is
    }

    let content: string;

    if (!hasOverride || !overrideContent) {
      content = baseContent;
    } else if (surface.strategy === "replace") {
      content = overrideContent;
    } else if (surface.format === "json") {
      const base = JSON.parse(baseContent);
      const override = JSON.parse(overrideContent);
      const merged = applyOverride(base, override);
      content = JSON.stringify(merged, null, 2);
    } else if (surface.format === "yaml") {
      content = applyYamlOverride(baseContent, overrideContent);
    } else {
      content = baseContent;
    }

    results.push({ surface: surface.path, content, hasOverride });
  }

  return results;
}

async function expandSurfaces(
  projectPath: string,
  surfaces: Surface[]
): Promise<Surface[]> {
  const expanded: Surface[] = [];

  for (const surface of surfaces) {
    if (surface.path.includes("*")) {
      const matches = await fg(surface.path, { cwd: projectPath });
      for (const match of matches.sort()) {
        expanded.push({ ...surface, path: match });
      }
    } else {
      expanded.push(surface);
    }
  }

  return expanded;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/commands/resolve.test.ts`
Expected: 6 tests PASS

**Step 5: Commit**

```bash
git add src/commands/resolve.ts tests/commands/resolve.test.ts
git commit -m "feat: resolve command merges base + overrides for a client variant"
```

---

### Task 8: `status` Command

Shows all variants and their override state.

**Files:**
- Create: `src/commands/status.ts`
- Create: `tests/commands/status.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, afterEach } from "vitest";
import { createTestProject, TestProject } from "../helpers/test-project.js";
import { runStatus } from "../../src/commands/status.js";

describe("status command", () => {
  let project: TestProject;

  afterEach(async () => {
    await project?.cleanup();
  });

  it("lists all variants with override counts", async () => {
    project = await createTestProject();
    await project.writeFile(
      ".variantform.yaml",
      'surfaces:\n  - path: "config/features.json"\n    format: json\n  - path: "config/theme.json"\n    format: json\n'
    );
    await project.writeFile("config/features.json", '{"a": 1}');
    await project.writeFile("config/theme.json", '{"color": "blue"}');
    // Acme overrides 1 surface
    await project.writeFile("variants/acme/config/features.json", '{"a": 2}');
    // Globex overrides 2 surfaces
    await project.writeFile("variants/globex/config/features.json", '{"a": 3}');
    await project.writeFile("variants/globex/config/theme.json", '{"color": "red"}');

    const statuses = await runStatus(project.path);

    expect(statuses).toHaveLength(2);
    expect(statuses.find((s) => s.name === "acme")?.overrideCount).toBe(1);
    expect(statuses.find((s) => s.name === "globex")?.overrideCount).toBe(2);
  });

  it("returns empty array when no variants exist", async () => {
    project = await createTestProject();
    await project.writeFile(
      ".variantform.yaml",
      'surfaces:\n  - path: "config/features.json"\n    format: json\n'
    );
    await project.writeFile("variants/.gitkeep", "");

    const statuses = await runStatus(project.path);
    expect(statuses).toEqual([]);
  });

  it("detects extraneous override files (not matching any surface)", async () => {
    project = await createTestProject();
    await project.writeFile(
      ".variantform.yaml",
      'surfaces:\n  - path: "config/features.json"\n    format: json\n'
    );
    await project.writeFile("config/features.json", '{"a": 1}');
    await project.writeFile("variants/rogue/config/features.json", '{"a": 2}');
    await project.writeFile("variants/rogue/src/hack.ts", "// should not be here");

    const statuses = await runStatus(project.path);

    expect(statuses).toHaveLength(1);
    expect(statuses[0].violations).toContain("src/hack.ts");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/commands/status.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
import { readdir, access } from "node:fs/promises";
import { join } from "node:path";
import fg from "fast-glob";
import { loadConfig } from "../config.js";

export interface VariantStatus {
  name: string;
  overrideCount: number;
  overrides: string[];
  violations: string[];
}

export async function runStatus(projectPath: string): Promise<VariantStatus[]> {
  const config = await loadConfig(projectPath);
  const variantsDir = join(projectPath, "variants");

  // List variant directories
  let entries: string[];
  try {
    const dirEntries = await readdir(variantsDir, { withFileTypes: true });
    entries = dirEntries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }

  const surfacePatterns = config.surfaces.map((s) => s.path);

  const statuses: VariantStatus[] = [];

  for (const name of entries) {
    const variantDir = join(variantsDir, name);

    // Find all files in this variant directory (excluding .gitkeep)
    const allFiles = await fg("**/*", {
      cwd: variantDir,
      ignore: [".gitkeep"],
      dot: false,
    });

    // Separate into valid overrides and violations
    const overrides: string[] = [];
    const violations: string[] = [];

    for (const file of allFiles) {
      const matchesSurface = surfacePatterns.some((pattern) => {
        if (pattern.includes("*")) {
          return fg.isDynamicPattern(pattern) && new RegExp(
            "^" + pattern.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$"
          ).test(file);
        }
        return file === pattern;
      });

      if (matchesSurface) {
        overrides.push(file);
      } else {
        violations.push(file);
      }
    }

    statuses.push({
      name,
      overrideCount: overrides.length,
      overrides,
      violations,
    });
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
git commit -m "feat: status command lists variants with override counts and violations"
```

---

### Task 9: `diff` Command

Shows what a variant overrides compared to the base.

**Files:**
- Create: `src/commands/diff.ts`
- Create: `tests/commands/diff.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, afterEach } from "vitest";
import { createTestProject, TestProject } from "../helpers/test-project.js";
import { runDiff } from "../../src/commands/diff.js";

describe("diff command", () => {
  let project: TestProject;

  afterEach(async () => {
    await project?.cleanup();
  });

  it("shows override keys that differ from base", async () => {
    project = await createTestProject();
    await project.writeFile(
      ".variantform.yaml",
      'surfaces:\n  - path: "config/features.json"\n    format: json\n    strategy: merge\n'
    );
    await project.writeFile(
      "config/features.json",
      JSON.stringify({ a: 1, b: 2, c: 3 }, null, 2)
    );
    await project.writeFile(
      "variants/acme/config/features.json",
      JSON.stringify({ b: 99, d: 4 }, null, 2)
    );

    const result = await runDiff(project.path, "acme");

    expect(result).toHaveLength(1);
    expect(result[0].surface).toBe("config/features.json");
    expect(result[0].overrideKeys).toContain("b");
    expect(result[0].overrideKeys).toContain("d");
  });

  it("returns empty when variant has no overrides", async () => {
    project = await createTestProject();
    await project.writeFile(
      ".variantform.yaml",
      'surfaces:\n  - path: "config/features.json"\n    format: json\n'
    );
    await project.writeFile("config/features.json", '{"a": 1}');
    await project.writeFile("variants/acme/.gitkeep", "");

    const result = await runDiff(project.path, "acme");
    expect(result).toEqual([]);
  });

  it("throws if variant does not exist", async () => {
    project = await createTestProject();
    await project.writeFile(
      ".variantform.yaml",
      'surfaces:\n  - path: "config/features.json"\n    format: json\n'
    );

    await expect(runDiff(project.path, "nonexistent")).rejects.toThrow("not found");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/commands/diff.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
import { readFile, access } from "node:fs/promises";
import { join } from "node:path";
import { loadConfig } from "../config.js";

export interface DiffResult {
  surface: string;
  overrideKeys: string[];
}

export async function runDiff(
  projectPath: string,
  variantName: string
): Promise<DiffResult[]> {
  const config = await loadConfig(projectPath);
  const variantDir = join(projectPath, "variants", variantName);

  try {
    await access(variantDir);
  } catch {
    throw new Error(`variant "${variantName}" not found`);
  }

  const results: DiffResult[] = [];

  for (const surface of config.surfaces) {
    const overridePath = join(variantDir, surface.path);

    let overrideContent: string;
    try {
      overrideContent = await readFile(overridePath, "utf-8");
    } catch {
      continue; // No override for this surface
    }

    const override = JSON.parse(overrideContent);
    const overrideKeys = Object.keys(override);

    if (overrideKeys.length > 0) {
      results.push({ surface: surface.path, overrideKeys });
    }
  }

  return results;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/commands/diff.test.ts`
Expected: 3 tests PASS

**Step 5: Commit**

```bash
git add src/commands/diff.ts tests/commands/diff.test.ts
git commit -m "feat: diff command shows override keys per surface"
```

---

### Task 10: `validate` Command

Checks all overrides are valid: correct format, only touch declared surfaces, override keys exist in base.

**Files:**
- Create: `src/commands/validate.ts`
- Create: `tests/commands/validate.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, afterEach } from "vitest";
import { createTestProject, TestProject } from "../helpers/test-project.js";
import { runValidate, ValidationIssue } from "../../src/commands/validate.js";

describe("validate command", () => {
  let project: TestProject;

  afterEach(async () => {
    await project?.cleanup();
  });

  it("returns no issues for valid overrides", async () => {
    project = await createTestProject();
    await project.writeFile(
      ".variantform.yaml",
      'surfaces:\n  - path: "config/features.json"\n    format: json\n    strategy: merge\n'
    );
    await project.writeFile("config/features.json", '{"a": 1, "b": 2}');
    await project.writeFile("variants/acme/config/features.json", '{"a": 99}');

    const issues = await runValidate(project.path);
    expect(issues).toEqual([]);
  });

  it("detects override keys not present in base (stale overrides)", async () => {
    project = await createTestProject();
    await project.writeFile(
      ".variantform.yaml",
      'surfaces:\n  - path: "config/features.json"\n    format: json\n    strategy: merge\n'
    );
    await project.writeFile("config/features.json", '{"a": 1}');
    await project.writeFile(
      "variants/acme/config/features.json",
      '{"a": 2, "removed_key": true}'
    );

    const issues = await runValidate(project.path);

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].type).toBe("stale_key");
    expect(issues[0].variant).toBe("acme");
    expect(issues[0].key).toBe("removed_key");
  });

  it("detects invalid JSON in override files", async () => {
    project = await createTestProject();
    await project.writeFile(
      ".variantform.yaml",
      'surfaces:\n  - path: "config/features.json"\n    format: json\n'
    );
    await project.writeFile("config/features.json", '{"a": 1}');
    await project.writeFile("variants/acme/config/features.json", "not valid json!!!");

    const issues = await runValidate(project.path);

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].type).toBe("parse_error");
  });

  it("detects extraneous files in variant directory", async () => {
    project = await createTestProject();
    await project.writeFile(
      ".variantform.yaml",
      'surfaces:\n  - path: "config/features.json"\n    format: json\n'
    );
    await project.writeFile("config/features.json", '{"a": 1}');
    await project.writeFile("variants/acme/config/features.json", '{"a": 2}');
    await project.writeFile("variants/acme/src/hack.ts", "evil code");

    const issues = await runValidate(project.path);

    expect(issues.some((i) => i.type === "extraneous_file")).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/commands/validate.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import fg from "fast-glob";
import { loadConfig } from "../config.js";

export interface ValidationIssue {
  type: "stale_key" | "parse_error" | "extraneous_file";
  variant: string;
  surface?: string;
  key?: string;
  message: string;
}

export async function runValidate(projectPath: string): Promise<ValidationIssue[]> {
  const config = await loadConfig(projectPath);
  const variantsDir = join(projectPath, "variants");
  const surfacePatterns = config.surfaces.map((s) => s.path);

  const issues: ValidationIssue[] = [];

  // List variant directories
  let variantNames: string[];
  try {
    const entries = await readdir(variantsDir, { withFileTypes: true });
    variantNames = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }

  for (const variant of variantNames) {
    const variantDir = join(variantsDir, variant);

    // Find all files in variant
    const allFiles = await fg("**/*", { cwd: variantDir, ignore: [".gitkeep"], dot: false });

    for (const file of allFiles) {
      // Check if file matches a declared surface
      const matchingSurface = config.surfaces.find((s) => {
        if (s.path.includes("*")) {
          return new RegExp(
            "^" + s.path.replace(/\./g, "\\.").replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*") + "$"
          ).test(file);
        }
        return file === s.path;
      });

      if (!matchingSurface) {
        issues.push({
          type: "extraneous_file",
          variant,
          message: `File "${file}" in variant "${variant}" does not match any declared surface`,
        });
        continue;
      }

      // Validate the override file
      const overridePath = join(variantDir, file);
      const basePath = join(projectPath, file);

      if (matchingSurface.strategy === "merge" && matchingSurface.format === "json") {
        let overrideObj: Record<string, unknown>;
        try {
          const content = await readFile(overridePath, "utf-8");
          overrideObj = JSON.parse(content);
        } catch {
          issues.push({
            type: "parse_error",
            variant,
            surface: file,
            message: `Cannot parse "${file}" in variant "${variant}" as JSON`,
          });
          continue;
        }

        // Check for stale keys (override references keys not in base)
        let baseObj: Record<string, unknown>;
        try {
          const baseContent = await readFile(basePath, "utf-8");
          baseObj = JSON.parse(baseContent);
        } catch {
          continue; // If base doesn't exist, we can't validate keys
        }

        for (const key of Object.keys(overrideObj)) {
          if (!(key in baseObj)) {
            issues.push({
              type: "stale_key",
              variant,
              surface: file,
              key,
              message: `Override key "${key}" in variant "${variant}" does not exist in base "${file}"`,
            });
          }
        }
      }
    }
  }

  return issues;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/commands/validate.test.ts`
Expected: 4 tests PASS

**Step 5: Commit**

```bash
git add src/commands/validate.ts tests/commands/validate.test.ts
git commit -m "feat: validate command detects stale keys, parse errors, and extraneous files"
```

---

### Task 11: Wire CLI Commands

Connect all commands to the Commander.js program in `src/cli.ts`.

**Files:**
- Modify: `src/cli.ts`

**Step 1: Update src/cli.ts with all commands**

```typescript
#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { runInit } from "./commands/init.js";
import { runCreate } from "./commands/create.js";
import { runResolve } from "./commands/resolve.js";
import { runStatus } from "./commands/status.js";
import { runDiff } from "./commands/diff.js";
import { runValidate } from "./commands/validate.js";

const program = new Command();

program
  .name("variantform")
  .description("Git-native overlay tool for managing per-client SaaS product variants")
  .version("0.1.0");

program
  .command("init")
  .description("Initialize variantform in the current project")
  .requiredOption(
    "-s, --surface <surface...>",
    "Surface declarations in format path:format[:strategy] (e.g. config/features.json:json:merge)"
  )
  .action(async (opts) => {
    const surfaces = opts.surface.map((s: string) => {
      const parts = s.split(":");
      const [path, format, strategy] = parts;
      if (!path || !format || !["json", "yaml"].includes(format)) {
        console.error(chalk.red(`Invalid surface: "${s}". Use path:format[:strategy]`));
        process.exit(1);
      }
      return {
        path,
        format: format as "json" | "yaml",
        strategy: (strategy as "merge" | "replace") || "merge",
      };
    });

    try {
      await runInit(process.cwd(), surfaces);
      console.log(chalk.green("Variantform initialized."));
      console.log(`  ${surfaces.length} surface(s) configured.`);
      console.log(`  Created ${chalk.bold("variants/")} directory.`);
      console.log(`\n  Next: ${chalk.cyan("variantform create <client-name>")}`);
    } catch (e) {
      console.error(chalk.red(`Error: ${(e as Error).message}`));
      process.exit(1);
    }
  });

program
  .command("create <client-name>")
  .description("Create a new client variant")
  .action(async (clientName: string) => {
    try {
      await runCreate(process.cwd(), clientName);
      console.log(chalk.green(`Variant "${clientName}" created.`));
      console.log(`  Directory: ${chalk.bold(`variants/${clientName}/`)}`);
      console.log(`\n  Add overrides by creating files in that directory.`);
    } catch (e) {
      console.error(chalk.red(`Error: ${(e as Error).message}`));
      process.exit(1);
    }
  });

program
  .command("resolve <client-name> [surface]")
  .description("Output the resolved config for a client (base + overrides)")
  .action(async (clientName: string, surface?: string) => {
    try {
      const results = await runResolve(process.cwd(), clientName, surface);
      for (const r of results) {
        if (results.length > 1) {
          console.log(chalk.dim(`--- ${r.surface} ${r.hasOverride ? "(overridden)" : "(base)"} ---`));
        }
        console.log(r.content);
      }
    } catch (e) {
      console.error(chalk.red(`Error: ${(e as Error).message}`));
      process.exit(1);
    }
  });

program
  .command("status")
  .description("Show all variants and their override state")
  .action(async () => {
    try {
      const statuses = await runStatus(process.cwd());
      if (statuses.length === 0) {
        console.log("No variants found. Create one with: variantform create <client-name>");
        return;
      }
      console.log(`\n${chalk.bold("Variants")} (${statuses.length})\n`);
      for (const s of statuses) {
        const overrides = s.overrideCount > 0 ? `${s.overrideCount} override(s)` : chalk.dim("no overrides");
        const violations = s.violations.length > 0
          ? chalk.red(` [${s.violations.length} violation(s)]`)
          : "";
        console.log(`  ${chalk.bold(s.name.padEnd(20))} ${overrides}${violations}`);
      }
      console.log();
    } catch (e) {
      console.error(chalk.red(`Error: ${(e as Error).message}`));
      process.exit(1);
    }
  });

program
  .command("diff <client-name>")
  .description("Show what a variant overrides compared to base")
  .action(async (clientName: string) => {
    try {
      const results = await runDiff(process.cwd(), clientName);
      if (results.length === 0) {
        console.log(`Variant "${clientName}" has no overrides.`);
        return;
      }
      console.log(`\n${chalk.bold(clientName)} overrides:\n`);
      for (const r of results) {
        console.log(`  ${chalk.cyan(r.surface)}`);
        for (const key of r.overrideKeys) {
          console.log(`    ${chalk.yellow(key)}`);
        }
      }
      console.log();
    } catch (e) {
      console.error(chalk.red(`Error: ${(e as Error).message}`));
      process.exit(1);
    }
  });

program
  .command("validate")
  .description("Check all overrides are valid against current base")
  .action(async () => {
    try {
      const issues = await runValidate(process.cwd());
      if (issues.length === 0) {
        console.log(chalk.green("All variants are valid."));
        return;
      }
      console.log(chalk.red(`\n${issues.length} issue(s) found:\n`));
      for (const issue of issues) {
        const prefix = issue.type === "stale_key"
          ? chalk.yellow("STALE")
          : issue.type === "parse_error"
          ? chalk.red("ERROR")
          : chalk.red("EXTRA");
        console.log(`  ${prefix} [${issue.variant}] ${issue.message}`);
      }
      console.log();
      process.exit(1);
    } catch (e) {
      console.error(chalk.red(`Error: ${(e as Error).message}`));
      process.exit(1);
    }
  });

program.parse();
```

**Step 2: Verify the CLI builds**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Verify help output works**

Run: `npx tsx src/cli.ts --help`
Expected: Shows all commands (init, create, resolve, status, diff, validate)

**Step 4: Commit**

```bash
git add src/cli.ts
git commit -m "feat: wire all commands into CLI entry point"
```

---

### Task 12: End-to-End Integration Test

Full workflow test covering the complete user journey.

**Files:**
- Create: `tests/e2e.test.ts`

**Step 1: Write the test**

```typescript
import { describe, it, expect, afterEach } from "vitest";
import { createTestProject, TestProject } from "./helpers/test-project.js";
import { runInit } from "../src/commands/init.js";
import { runCreate } from "../src/commands/create.js";
import { runResolve } from "../src/commands/resolve.js";
import { runStatus } from "../src/commands/status.js";
import { runDiff } from "../src/commands/diff.js";
import { runValidate } from "../src/commands/validate.js";

describe("end-to-end workflow", () => {
  let project: TestProject;

  afterEach(async () => {
    await project?.cleanup();
  });

  it("full lifecycle: init → create → override → resolve → status → diff → validate", async () => {
    project = await createTestProject();

    // 1. Set up a realistic SaaS project
    await project.writeFile(
      "config/features.json",
      JSON.stringify(
        { kanban: true, gantt: true, time_tracking: false, max_projects: 10, ai_assistant: false },
        null,
        2
      )
    );
    await project.writeFile(
      "config/theme.json",
      JSON.stringify({ color: "blue", font: "inter" }, null, 2)
    );
    await project.writeFile("src/app.ts", "export const app = 'my-saas';");

    // 2. Initialize variantform
    await runInit(project.path, [
      { path: "config/features.json", format: "json", strategy: "merge" },
      { path: "config/theme.json", format: "json", strategy: "replace" },
    ]);

    // 3. Create two variants
    await runCreate(project.path, "acme");
    await runCreate(project.path, "globex");

    // 4. Add overrides for Acme (merge strategy -- only deltas)
    await project.writeFile(
      "variants/acme/config/features.json",
      JSON.stringify({ time_tracking: true, max_projects: 50 }, null, 2)
    );

    // 5. Add overrides for Globex (merge + replace)
    await project.writeFile(
      "variants/globex/config/features.json",
      JSON.stringify({ gantt: false, max_projects: 5 }, null, 2)
    );
    await project.writeFile(
      "variants/globex/config/theme.json",
      JSON.stringify({ color: "dark-green", font: "roboto", logo: "globex.svg" }, null, 2)
    );

    // 6. Resolve Acme's features
    const acmeResults = await runResolve(project.path, "acme", "config/features.json");
    const acmeFeatures = JSON.parse(acmeResults[0].content);
    expect(acmeFeatures).toEqual({
      kanban: true,
      gantt: true,
      time_tracking: true,    // overridden
      max_projects: 50,       // overridden
      ai_assistant: false,    // from base, flows through
    });

    // 7. Resolve Globex's theme (replace strategy)
    const globexTheme = await runResolve(project.path, "globex", "config/theme.json");
    const theme = JSON.parse(globexTheme[0].content);
    // Replace strategy: override completely replaces base
    expect(theme).toEqual({ color: "dark-green", font: "roboto", logo: "globex.svg" });

    // 8. Check status
    const statuses = await runStatus(project.path);
    expect(statuses).toHaveLength(2);
    expect(statuses.find((s) => s.name === "acme")?.overrideCount).toBe(1);
    expect(statuses.find((s) => s.name === "globex")?.overrideCount).toBe(2);

    // 9. Check diff
    const acmeDiff = await runDiff(project.path, "acme");
    expect(acmeDiff).toHaveLength(1);
    expect(acmeDiff[0].overrideKeys).toContain("time_tracking");
    expect(acmeDiff[0].overrideKeys).toContain("max_projects");

    // 10. Validate -- should be clean
    const issues = await runValidate(project.path);
    expect(issues).toEqual([]);

    // 11. Simulate upstream evolution: base adds a new feature
    await project.writeFile(
      "config/features.json",
      JSON.stringify(
        { kanban: true, gantt: true, time_tracking: false, max_projects: 10, ai_assistant: true },
        null,
        2
      )
    );

    // 12. Resolve Acme again -- new feature flows through automatically!
    const acmeAfterUpdate = await runResolve(project.path, "acme", "config/features.json");
    const updatedFeatures = JSON.parse(acmeAfterUpdate[0].content);
    expect(updatedFeatures.ai_assistant).toBe(true); // NEW: from updated base
    expect(updatedFeatures.time_tracking).toBe(true); // STILL: Acme's override
    expect(updatedFeatures.max_projects).toBe(50);    // STILL: Acme's override

    // 13. Simulate base removing a key that an override references
    await project.writeFile(
      "config/features.json",
      JSON.stringify(
        { kanban: true, gantt: true, ai_assistant: true },
        null,
        2
      )
    );
    // base removed time_tracking and max_projects, but Acme overrides them

    // 14. Validate catches stale keys
    const staleIssues = await runValidate(project.path);
    expect(staleIssues.length).toBeGreaterThan(0);
    expect(staleIssues.some((i) => i.type === "stale_key" && i.key === "time_tracking")).toBe(true);
  });
});
```

**Step 2: Run the test**

Run: `npx vitest run tests/e2e.test.ts`
Expected: PASS

**Step 3: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add tests/e2e.test.ts
git commit -m "test: end-to-end integration test covering full variant lifecycle"
```

---

### Task 13: Package for npm and Add README

**Files:**
- Modify: `package.json`
- Create: `README.md`
- Create: `LICENSE`

**Step 1: Update package.json fields**

Add:
```json
{
  "files": ["dist", "README.md", "LICENSE"],
  "keywords": ["saas", "variant", "customization", "git", "multi-tenant", "white-label", "cli", "overlay", "config"],
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
- Quick start: init, create, add overrides, resolve, status, diff, validate
- How it works: base + overlay = resolved config
- Comparison to alternatives (feature flags, branch-per-client, Kustomize)
- License: MIT

Keep it under 150 lines.

**Step 3: Create LICENSE (MIT)**

**Step 4: Build and verify**

Run: `npx tsc`
Expected: `dist/` directory created

Run: `node dist/cli.js --help`
Expected: Shows help with all commands

**Step 5: Run all tests one final time**

Run: `npx vitest run`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add package.json README.md LICENSE
git commit -m "chore: package for npm with README and license"
```

---

## Task Dependency Graph

```
Task 1 (scaffolding)
  └── Task 2 (test helper)
        ├── Task 3 (config module)
        ├── Task 4 (merge engine)
        ├── Task 5 (init command)
        │     └── Task 6 (create command)
        ├── Task 7 (resolve command) ← depends on Tasks 3, 4
        ├── Task 8 (status command) ← depends on Task 3
        ├── Task 9 (diff command) ← depends on Task 3
        └── Task 10 (validate command) ← depends on Task 3

Task 11 (wire CLI) ← depends on Tasks 5-10
Task 12 (e2e test) ← depends on Task 11
Task 13 (packaging) ← depends on all above
```

## Parallel Execution Opportunities

These task groups can be worked on simultaneously after Task 2:
- **Group A**: Tasks 3 (config) + 4 (merge engine) -- no dependencies between them
- **Group B**: Tasks 5 (init) + 6 (create) -- can start after Task 2
- **Group C**: Tasks 7 (resolve) + 8 (status) + 9 (diff) + 10 (validate) -- after Tasks 3 + 4
