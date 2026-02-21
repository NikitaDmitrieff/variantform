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
    expect(existsSync(join(project.path, ".variantform.yaml"))).toBe(true);
  });
});
