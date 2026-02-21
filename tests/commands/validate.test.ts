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
