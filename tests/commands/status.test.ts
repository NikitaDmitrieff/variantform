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
