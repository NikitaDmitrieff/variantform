import { describe, it, expect } from "vitest";
import { applyOverride, applyYamlOverride } from "../src/merge.js";

describe("applyOverride (JSON)", () => {
  it("deep merges override on top of base", () => {
    const base = { kanban: true, gantt: true, time_tracking: false, max_projects: 10 };
    const override = { time_tracking: true, max_projects: 50 };

    const result = applyOverride(base, override);

    expect(result).toEqual({
      kanban: true,
      gantt: true,
      time_tracking: true,
      max_projects: 50,
    });
  });

  it("preserves base keys not in override", () => {
    const base = { a: 1, b: 2, c: 3 };
    const override = { b: 99 };

    const result = applyOverride(base, override);
    expect(result).toEqual({ a: 1, b: 99, c: 3 });
  });

  it("adds new keys from override", () => {
    const base = { a: 1 };
    const override = { b: 2 };

    const result = applyOverride(base, override);
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it("handles nested objects", () => {
    const base = { ui: { sidebar: true, footer: false }, limits: { storage: 10 } };
    const override = { ui: { sidebar: false }, limits: { storage: 50 } };

    const result = applyOverride(base, override);
    expect(result).toEqual({
      ui: { sidebar: false, footer: false },
      limits: { storage: 50 },
    });
  });

  it("removes keys when override sets them to null (RFC 7396)", () => {
    const base = { a: 1, b: 2, c: 3 };
    const override = { b: null };

    const result = applyOverride(base, override);
    expect(result).toEqual({ a: 1, c: 3 });
  });

  it("replaces arrays entirely (RFC 7396 behavior)", () => {
    const base = { tags: ["a", "b", "c"] };
    const override = { tags: ["x", "y"] };

    const result = applyOverride(base, override);
    expect(result).toEqual({ tags: ["x", "y"] });
  });

  it("handles empty override (returns base as-is)", () => {
    const base = { a: 1, b: 2 };
    const override = {};

    const result = applyOverride(base, override);
    expect(result).toEqual({ a: 1, b: 2 });
  });
});

describe("applyYamlOverride", () => {
  it("merges YAML strings using JSON merge logic", () => {
    const base = "auto_assign: false\nnotifications: true\n";
    const override = "auto_assign: true\n";

    const result = applyYamlOverride(base, override);
    expect(result).toContain("auto_assign: true");
    expect(result).toContain("notifications: true");
  });
});
