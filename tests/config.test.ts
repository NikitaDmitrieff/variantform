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

  it("accepts css format with replace strategy", async () => {
    project = await createTestProject();
    await project.writeFile(
      ".variantform.yaml",
      `surfaces:
  - path: "styles/brand.css"
    format: css
    strategy: replace
`
    );
    const config = await loadConfig(project.path);
    expect(config.surfaces[0]).toEqual({
      path: "styles/brand.css",
      format: "css",
      strategy: "replace",
    });
  });

  it("accepts code format with replace strategy", async () => {
    project = await createTestProject();
    await project.writeFile(
      ".variantform.yaml",
      `surfaces:
  - path: "src/components/Hero.tsx"
    format: code
    strategy: replace
`
    );
    const config = await loadConfig(project.path);
    expect(config.surfaces[0].format).toBe("code");
    expect(config.surfaces[0].strategy).toBe("replace");
  });

  it("accepts asset format", async () => {
    project = await createTestProject();
    await project.writeFile(
      ".variantform.yaml",
      `surfaces:
  - path: "public/logo.svg"
    format: asset
    strategy: replace
`
    );
    const config = await loadConfig(project.path);
    expect(config.surfaces[0].format).toBe("asset");
  });

  it("accepts markdown format", async () => {
    project = await createTestProject();
    await project.writeFile(
      ".variantform.yaml",
      `surfaces:
  - path: "content/landing.md"
    format: markdown
    strategy: replace
`
    );
    const config = await loadConfig(project.path);
    expect(config.surfaces[0].format).toBe("markdown");
  });

  it("accepts template format", async () => {
    project = await createTestProject();
    await project.writeFile(
      ".variantform.yaml",
      `surfaces:
  - path: "templates/welcome.html"
    format: template
    strategy: replace
`
    );
    const config = await loadConfig(project.path);
    expect(config.surfaces[0].format).toBe("template");
  });

  it("accepts text format", async () => {
    project = await createTestProject();
    await project.writeFile(
      ".variantform.yaml",
      `surfaces:
  - path: ".env.example"
    format: text
    strategy: replace
`
    );
    const config = await loadConfig(project.path);
    expect(config.surfaces[0].format).toBe("text");
  });

  it("rejects merge strategy for non-json/yaml formats", async () => {
    project = await createTestProject();
    await project.writeFile(
      ".variantform.yaml",
      `surfaces:
  - path: "styles/brand.css"
    format: css
    strategy: merge
`
    );
    await expect(loadConfig(project.path)).rejects.toThrow("merge strategy");
  });

  it("defaults strategy to replace for non-json/yaml formats", async () => {
    project = await createTestProject();
    await project.writeFile(
      ".variantform.yaml",
      `surfaces:
  - path: "public/logo.svg"
    format: asset
`
    );
    const config = await loadConfig(project.path);
    expect(config.surfaces[0].strategy).toBe("replace");
  });
});
