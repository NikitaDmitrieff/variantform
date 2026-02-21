import { readdir } from "node:fs/promises";
import { join } from "node:path";
import fg from "fast-glob";
import { loadConfig } from "../config.js";
import { matchesPattern } from "../match.js";

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

    // Find all files in this variant directory (dot: true to catch dotfile violations)
    const allFiles = await fg("**/*", {
      cwd: variantDir,
      ignore: [".gitkeep"],
      dot: true,
    });

    // Separate into valid overrides and violations
    const overrides: string[] = [];
    const violations: string[] = [];

    for (const file of allFiles) {
      if (surfacePatterns.some((pattern) => matchesPattern(file, pattern))) {
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
