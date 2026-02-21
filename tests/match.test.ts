import { describe, it, expect } from "vitest";
import { matchesPattern } from "../src/match.js";

describe("matchesPattern (picomatch)", () => {
  it("matches exact paths", () => {
    expect(matchesPattern("config/features.json", "config/features.json")).toBe(true);
    expect(matchesPattern("config/features.json", "config/theme.json")).toBe(false);
  });

  it("matches single-star globs", () => {
    expect(matchesPattern("config/features.json", "config/*.json")).toBe(true);
    expect(matchesPattern("config/theme.json", "config/*.json")).toBe(true);
    expect(matchesPattern("config/deep/file.json", "config/*.json")).toBe(false);
  });

  it("matches double-star globs", () => {
    expect(matchesPattern("config/deep/file.json", "config/**/*.json")).toBe(true);
    expect(matchesPattern("config/features.json", "config/**/*.json")).toBe(true);
    expect(matchesPattern("src/app.ts", "config/**/*.json")).toBe(false);
  });

  it("matches zero-depth ** correctly", () => {
    // **/*.json should match files at any depth including root-relative
    expect(matchesPattern("config/features.json", "**/*.json")).toBe(true);
    expect(matchesPattern("deep/nested/file.json", "**/*.json")).toBe(true);
  });

  it("handles YAML extension patterns", () => {
    expect(matchesPattern("config/workflow.yaml", "config/*.yaml")).toBe(true);
    expect(matchesPattern("config/workflow.yml", "config/*.yaml")).toBe(false);
  });
});
