import { readdir } from "node:fs/promises";
import { join } from "node:path";
import fg from "fast-glob";
import { loadConfig } from "../config.js";

export interface VariantStatus {
  name: string;
  overrideCount: number;
  overrides: string[];
  violations: string[];
}

export async function runStatus(projectPath: string): Promise<VariantStatus[]> {
  const config = await loadConfig(projectPath);
  const variantsDir = join(projectPath, "variants");

  // List variant directories
  let entries: string[];
  try {
    const dirEntries = await readdir(variantsDir, { withFileTypes: true });
    entries = dirEntries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }

  const surfacePatterns = config.surfaces.map((s) => s.path);

  const statuses: VariantStatus[] = [];

  for (const name of entries) {
    const variantDir = join(variantsDir, name);

    // Find all files in this variant directory (excluding .gitkeep)
    const allFiles = await fg("**/*", {
      cwd: variantDir,
      ignore: [".gitkeep"],
      dot: false,
    });

    // Separate into valid overrides and violations
    const overrides: string[] = [];
    const violations: string[] = [];

    for (const file of allFiles) {
      const matchesSurface = surfacePatterns.some((pattern) => {
        if (pattern.includes("*")) {
          return new RegExp(
            "^" + pattern.replace(/\./g, "\\.").replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*") + "$"
          ).test(file);
        }
        return file === pattern;
      });

      if (matchesSurface) {
        overrides.push(file);
      } else {
        violations.push(file);
      }
    }

    statuses.push({
      name,
      overrideCount: overrides.length,
      overrides,
      violations,
    });
  }

  return statuses;
}
