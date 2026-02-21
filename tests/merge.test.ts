import { describe, it, expect } from "vitest";
import { applyOverride, applyMergePatch, applyYamlOverride } from "../src/merge.js";

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

describe("applyMergePatch (RFC 7396 full compliance)", () => {
  it("replaces target entirely when patch is not an object", () => {
    expect(applyMergePatch({ a: 1 }, "replacement")).toBe("replacement");
    expect(applyMergePatch({ a: 1 }, 42)).toBe(42);
    expect(applyMergePatch({ a: 1 }, true)).toBe(true);
    expect(applyMergePatch({ a: 1 }, null)).toBe(null);
  });

  it("replaces target with array when patch is an array", () => {
    const result = applyMergePatch({ a: 1, b: 2 }, ["x", "y"]);
    expect(result).toEqual(["x", "y"]);
  });

  it("creates object from scratch when target is not an object", () => {
    const result = applyMergePatch("not an object", { a: 1 });
    expect(result).toEqual({ a: 1 });
  });

  it("handles the RFC 7396 spec example", () => {
    const target = { a: "b", c: { d: "e", f: "g" } };
    const patch = { a: "z", c: { f: null } };
    const result = applyMergePatch(target, patch);
    expect(result).toEqual({ a: "z", c: { d: "e" } });
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

  it("throws when base YAML is not an object", () => {
    expect(() => applyYamlOverride("- a\n- b\n", "x: 1\n")).toThrow("mapping");
  });

  it("throws when override YAML is not an object", () => {
    expect(() => applyYamlOverride("a: 1\n", "- x\n- y\n")).toThrow("mapping");
  });
});
