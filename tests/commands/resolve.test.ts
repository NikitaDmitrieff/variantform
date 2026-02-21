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

  it("throws a clear error when base file is missing", async () => {
    project = await createTestProject();
    await project.writeFile(
      ".variantform.yaml",
      'surfaces:\n  - path: "config/missing.json"\n    format: json\n'
    );
    // No base file created
    await project.writeFile("variants/acme/.gitkeep", "");

    await expect(runResolve(project.path, "acme")).rejects.toThrow("Base file not found");
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
