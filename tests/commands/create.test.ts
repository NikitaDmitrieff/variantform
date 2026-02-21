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
