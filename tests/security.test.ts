import { describe, it, expect, afterEach } from "vitest";
import { createTestProject, TestProject } from "./helpers/test-project.js";
import { loadConfig } from "../src/config.js";
import { runResolve } from "../src/commands/resolve.js";
import { runDiff } from "../src/commands/diff.js";
import { runCreate } from "../src/commands/create.js";

describe("security: path traversal prevention", () => {
  let project: TestProject;

  afterEach(async () => {
    await project?.cleanup();
  });

  it("rejects surface paths with .. traversal", async () => {
    project = await createTestProject();
    await project.writeFile(
      ".variantform.yaml",
      'surfaces:\n  - path: "../../etc/passwd"\n    format: json\n'
    );

    await expect(loadConfig(project.path)).rejects.toThrow("..");
  });

  it("rejects absolute surface paths", async () => {
    project = await createTestProject();
    await project.writeFile(
      ".variantform.yaml",
      'surfaces:\n  - path: "/etc/passwd"\n    format: json\n'
    );

    await expect(loadConfig(project.path)).rejects.toThrow("absolute");
  });

  it("rejects .. in glob surface patterns", async () => {
    project = await createTestProject();
    await project.writeFile(
      ".variantform.yaml",
      'surfaces:\n  - path: "../**/*.json"\n    format: json\n'
    );

    await expect(loadConfig(project.path)).rejects.toThrow("..");
  });

  it("resolve rejects path-traversing variant names", async () => {
    project = await createTestProject();
    await project.writeFile(
      ".variantform.yaml",
      'surfaces:\n  - path: "config/features.json"\n    format: json\n'
    );
    await project.writeFile("config/features.json", '{"a": 1}');

    await expect(runResolve(project.path, "..")).rejects.toThrow("invalid");
    await expect(runResolve(project.path, "../escape")).rejects.toThrow("invalid");
  });

  it("diff rejects path-traversing variant names", async () => {
    project = await createTestProject();
    await project.writeFile(
      ".variantform.yaml",
      'surfaces:\n  - path: "config/features.json"\n    format: json\n'
    );

    await expect(runDiff(project.path, "..")).rejects.toThrow("invalid");
    await expect(runDiff(project.path, "../escape")).rejects.toThrow("invalid");
  });

  it("create rejects path-traversing variant names", async () => {
    project = await createTestProject();
    await project.writeFile("variants/.gitkeep", "");

    await expect(runCreate(project.path, "..")).rejects.toThrow("invalid");
    await expect(runCreate(project.path, "../escape")).rejects.toThrow("invalid");
    await expect(runCreate(project.path, "acme corp")).rejects.toThrow("invalid");
  });
});
