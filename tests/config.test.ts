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
