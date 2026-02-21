import yaml from "js-yaml";
import { isObject } from "./merge";
import type { SurfaceFormat } from "./types";

export type ValidationSeverity = "error" | "warning";

export interface ValidationIssue {
  severity: ValidationSeverity;
  surface: string;
  message: string;
}

/**
 * Validate an override against its base content.
 * Returns a list of issues (parse errors, stale keys, shape mismatches).
 */
export function validateOverride(
  overrideContent: string,
  baseContent: string,
  surfacePath: string,
  format: SurfaceFormat,
  strategy: "merge" | "replace"
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // For non-json/yaml formats, skip parse validation
  if (!["json", "yaml"].includes(format)) {
    if (overrideContent.trim().length === 0) {
      issues.push({
        severity: "warning",
        surface: surfacePath,
        message: "Override file is empty",
      });
    }
    return issues;
  }

  // Parse base
  let baseParsed: unknown;
  try {
    baseParsed =
      format === "yaml" ? yaml.load(baseContent) : JSON.parse(baseContent);
  } catch {
    issues.push({
      severity: "error",
      surface: surfacePath,
      message: "Base content has invalid syntax",
    });
    return issues;
  }

  // Parse override
  let overrideParsed: unknown;
  try {
    overrideParsed =
      format === "yaml"
        ? yaml.load(overrideContent)
        : JSON.parse(overrideContent);
  } catch (e) {
    issues.push({
      severity: "error",
      surface: surfacePath,
      message: `Override parse error: ${e instanceof Error ? e.message : "Invalid syntax"}`,
    });
    return issues;
  }

  // Shape check for merge strategy
  if (strategy === "merge" && !isObject(overrideParsed)) {
    issues.push({
      severity: "error",
      surface: surfacePath,
      message:
        "Override must be an object for merge strategy. Use replace strategy for non-object overrides.",
    });
    return issues;
  }

  // Stale key detection (only for merge strategy with object bases)
  if (strategy === "merge" && isObject(baseParsed) && isObject(overrideParsed)) {
    const baseKeys = collectKeys(baseParsed);
    const overrideKeys = collectKeys(overrideParsed);

    for (const key of overrideKeys) {
      if (!baseKeys.has(key)) {
        issues.push({
          severity: "warning",
          surface: surfacePath,
          message: `Stale key "${key}" — not present in base config`,
        });
      }
    }
  }

  return issues;
}

/** Collect all dot-separated key paths from an object recursively. */
function collectKeys(
  obj: Record<string, unknown>,
  prefix = ""
): Set<string> {
  const keys = new Set<string>();
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    keys.add(path);
    if (isObject(value)) {
      for (const nested of collectKeys(value, path)) {
        keys.add(nested);
      }
    }
  }
  return keys;
}
