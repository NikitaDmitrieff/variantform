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

  it("validates YAML surfaces for parse errors", async () => {
    project = await createTestProject();
    await project.writeFile(
      ".variantform.yaml",
      'surfaces:\n  - path: "config/workflow.yaml"\n    format: yaml\n    strategy: merge\n'
    );
    await project.writeFile("config/workflow.yaml", "auto_assign: false\n");
    await project.writeFile("variants/acme/config/workflow.yaml", "not: valid: yaml: [[[");

    const issues = await runValidate(project.path);

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].type).toBe("parse_error");
  });

  it("detects stale keys in YAML overrides", async () => {
    project = await createTestProject();
    await project.writeFile(
      ".variantform.yaml",
      'surfaces:\n  - path: "config/workflow.yaml"\n    format: yaml\n    strategy: merge\n'
    );
    await project.writeFile("config/workflow.yaml", "auto_assign: false\n");
    await project.writeFile("variants/acme/config/workflow.yaml", "auto_assign: true\nremoved_field: yes\n");

    const issues = await runValidate(project.path);

    expect(issues.some((i) => i.type === "stale_key" && i.key === "removed_field")).toBe(true);
  });

  it("detects invalid shape: array override with merge strategy", async () => {
    project = await createTestProject();
    await project.writeFile(
      ".variantform.yaml",
      'surfaces:\n  - path: "config/features.json"\n    format: json\n    strategy: merge\n'
    );
    await project.writeFile("config/features.json", '{"a": 1}');
    await project.writeFile("variants/acme/config/features.json", '["not", "an", "object"]');

    const issues = await runValidate(project.path);

    expect(issues.some((i) => i.type === "invalid_shape")).toBe(true);
  });

  it("detects invalid shape: scalar override with merge strategy", async () => {
    project = await createTestProject();
    await project.writeFile(
      ".variantform.yaml",
      'surfaces:\n  - path: "config/features.json"\n    format: json\n    strategy: merge\n'
    );
    await project.writeFile("config/features.json", '{"a": 1}');
    await project.writeFile("variants/acme/config/features.json", '"just a string"');

    const issues = await runValidate(project.path);

    expect(issues.some((i) => i.type === "invalid_shape")).toBe(true);
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

  it("validates replace-strategy files exist and are not empty", async () => {
    project = await createTestProject();
    await project.writeFile(
      ".variantform.yaml",
      'surfaces:\n  - path: "styles/brand.css"\n    format: css\n    strategy: replace\n'
    );
    await project.writeFile("styles/brand.css", ":root { --color: blue; }");
    await project.writeFile("variants/acme/styles/brand.css", "");

    const issues = await runValidate(project.path);
    expect(issues).toContainEqual(
      expect.objectContaining({ type: "empty_file", variant: "acme" })
    );
  });

  it("passes validation for valid replace-strategy override files", async () => {
    project = await createTestProject();
    await project.writeFile(
      ".variantform.yaml",
      'surfaces:\n  - path: "styles/brand.css"\n    format: css\n    strategy: replace\n'
    );
    await project.writeFile("styles/brand.css", ":root { --color: blue; }");
    await project.writeFile("variants/acme/styles/brand.css", ":root { --color: red; }");

    const issues = await runValidate(project.path);
    expect(issues).toHaveLength(0);
  });

  it("skips parse validation for non-json/yaml formats", async () => {
    project = await createTestProject();
    await project.writeFile(
      ".variantform.yaml",
      'surfaces:\n  - path: "src/Hero.tsx"\n    format: code\n    strategy: replace\n'
    );
    await project.writeFile("src/Hero.tsx", "export default function Hero() { return <div/>; }");
    await project.writeFile("variants/acme/src/Hero.tsx", "export default function Hero() { return <h1>Acme</h1>; }");

    const issues = await runValidate(project.path);
    expect(issues).toHaveLength(0);
  });
});
