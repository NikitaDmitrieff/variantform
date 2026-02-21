import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import yaml from "js-yaml";
import fg from "fast-glob";
import { loadConfig } from "../config.js";
import { isObject } from "../merge.js";
import { matchesPattern } from "../match.js";

export interface ValidationIssue {
  type: "stale_key" | "parse_error" | "extraneous_file" | "invalid_shape";
  variant: string;
  surface?: string;
  key?: string;
  message: string;
}

export async function runValidate(projectPath: string): Promise<ValidationIssue[]> {
  const config = await loadConfig(projectPath);
  const variantsDir = join(projectPath, "variants");

  const issues: ValidationIssue[] = [];

  // List variant directories
  let variantNames: string[];
  try {
    const entries = await readdir(variantsDir, { withFileTypes: true });
    variantNames = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }

  for (const variant of variantNames) {
    const variantDir = join(variantsDir, variant);

    // Find all files in variant (dot: true to catch dotfile violations)
    const allFiles = await fg("**/*", { cwd: variantDir, ignore: [".gitkeep"], dot: true });

    for (const file of allFiles) {
      // Check if file matches a declared surface
      const matchingSurface = config.surfaces.find((s) => matchesPattern(file, s.path));

      if (!matchingSurface) {
        issues.push({
          type: "extraneous_file",
          variant,
          message: `File "${file}" in variant "${variant}" does not match any declared surface`,
        });
        continue;
      }

      // Validate the override file
      const overridePath = join(variantDir, file);
      const basePath = join(projectPath, file);

      if (matchingSurface.strategy === "merge") {
        let parsed: unknown;
        try {
          const content = await readFile(overridePath, "utf-8");
          parsed = matchingSurface.format === "yaml"
            ? yaml.load(content)
            : JSON.parse(content);
        } catch {
          issues.push({
            type: "parse_error",
            variant,
            surface: file,
            message: `Cannot parse "${file}" in variant "${variant}" as ${matchingSurface.format.toUpperCase()}`,
          });
          continue;
        }

        // Validate shape: merge overrides must be objects
        if (!isObject(parsed)) {
          issues.push({
            type: "invalid_shape",
            variant,
            surface: file,
            message: `Override "${file}" in variant "${variant}" must be an object for merge strategy, got ${Array.isArray(parsed) ? "array" : typeof parsed}`,
          });
          continue;
        }

        const overrideObj = parsed;

        // Check for stale keys (override references keys not in base)
        let baseObj: Record<string, unknown>;
        try {
          const baseContent = await readFile(basePath, "utf-8");
          const baseParsed = matchingSurface.format === "yaml"
            ? yaml.load(baseContent)
            : JSON.parse(baseContent);
          if (!isObject(baseParsed)) continue;
          baseObj = baseParsed;
        } catch {
          continue; // If base doesn't exist, we can't validate keys
        }

        for (const key of Object.keys(overrideObj)) {
          if (!(key in baseObj)) {
            issues.push({
              type: "stale_key",
              variant,
              surface: file,
              key,
              message: `Override key "${key}" in variant "${variant}" does not exist in base "${file}"`,
            });
          }
        }
      } else {
        // Replace strategy: still validate the file can be parsed
        try {
          const content = await readFile(overridePath, "utf-8");
          if (matchingSurface.format === "yaml") {
            yaml.load(content);
          } else {
            JSON.parse(content);
          }
        } catch {
          issues.push({
            type: "parse_error",
            variant,
            surface: file,
            message: `Cannot parse "${file}" in variant "${variant}" as ${matchingSurface.format.toUpperCase()}`,
          });
        }
      }
    }
  }

  return issues;
}
