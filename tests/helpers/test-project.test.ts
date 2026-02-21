import { describe, it, expect, afterEach } from "vitest";
import { createTestProject, TestProject } from "./test-project.js";

describe("createTestProject", () => {
  let project: TestProject;

  afterEach(async () => {
    await project?.cleanup();
  });

  it("creates a temp directory and allows writing/reading files", async () => {
    project = await createTestProject();
    await project.writeFile("config/features.json", '{"a": 1}');
    const content = await project.readFile("config/features.json");
    expect(JSON.parse(content)).toEqual({ a: 1 });
  });

  it("creates nested directories automatically", async () => {
    project = await createTestProject();
    await project.writeFile("variants/acme/config/features.json", '{"b": 2}');
    const content = await project.readFile("variants/acme/config/features.json");
    expect(JSON.parse(content)).toEqual({ b: 2 });
  });
});
