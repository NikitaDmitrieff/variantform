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

  it("handles YAML surfaces", async () => {
    project = await createTestProject();
    await project.writeFile(
      ".variantform.yaml",
      'surfaces:\n  - path: "config/workflow.yaml"\n    format: yaml\n    strategy: merge\n'
    );
    await project.writeFile("config/workflow.yaml", "auto_assign: false\nnotifications: true\n");
    await project.writeFile("variants/acme/config/workflow.yaml", "auto_assign: true\n");

    const result = await runDiff(project.path, "acme");

    expect(result).toHaveLength(1);
    expect(result[0].surface).toBe("config/workflow.yaml");
    expect(result[0].overrideKeys).toContain("auto_assign");
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
