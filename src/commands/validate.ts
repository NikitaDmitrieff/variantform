import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import fg from "fast-glob";
import { loadConfig } from "../config.js";

export interface ValidationIssue {
  type: "stale_key" | "parse_error" | "extraneous_file";
  variant: string;
  surface?: string;
  key?: string;
  message: string;
}

export async function runValidate(projectPath: string): Promise<ValidationIssue[]> {
  const config = await loadConfig(projectPath);
  const variantsDir = join(projectPath, "variants");
  const surfacePatterns = config.surfaces.map((s) => s.path);

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

    // Find all files in variant
    const allFiles = await fg("**/*", { cwd: variantDir, ignore: [".gitkeep"], dot: false });

    for (const file of allFiles) {
      // Check if file matches a declared surface
      const matchingSurface = config.surfaces.find((s) => {
        if (s.path.includes("*")) {
          return new RegExp(
            "^" + s.path.replace(/\./g, "\\.").replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*") + "$"
          ).test(file);
        }
        return file === s.path;
      });

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

      if (matchingSurface.strategy === "merge" && matchingSurface.format === "json") {
        let overrideObj: Record<string, unknown>;
        try {
          const content = await readFile(overridePath, "utf-8");
          overrideObj = JSON.parse(content);
        } catch {
          issues.push({
            type: "parse_error",
            variant,
            surface: file,
            message: `Cannot parse "${file}" in variant "${variant}" as JSON`,
          });
          continue;
        }

        // Check for stale keys (override references keys not in base)
        let baseObj: Record<string, unknown>;
        try {
          const baseContent = await readFile(basePath, "utf-8");
          baseObj = JSON.parse(baseContent);
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
      }
    }
  }

  return issues;
}
