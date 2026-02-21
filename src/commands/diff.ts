import { readFile, access } from "node:fs/promises";
import { join } from "node:path";
import yaml from "js-yaml";
import { loadConfig, Surface } from "../config.js";
import { isObject } from "../merge.js";
import { validateVariantName, validateGlobPattern } from "../paths.js";
import fg from "fast-glob";

export interface DiffResult {
  surface: string;
  overrideKeys: string[];
}

export async function runDiff(
  projectPath: string,
  variantName: string
): Promise<DiffResult[]> {
  validateVariantName(variantName);

  const config = await loadConfig(projectPath);
  const variantDir = join(projectPath, "variants", variantName);

  try {
    await access(variantDir);
  } catch {
    throw new Error(`variant "${variantName}" not found`);
  }

  // Expand glob patterns (same as resolve)
  const expandedSurfaces = await expandSurfaces(projectPath, config.surfaces);

  const results: DiffResult[] = [];

  for (const surface of expandedSurfaces) {
    const overridePath = join(variantDir, surface.path);

    let overrideContent: string;
    try {
      overrideContent = await readFile(overridePath, "utf-8");
    } catch {
      continue; // No override for this surface
    }

    let overrideObj: unknown;
    if (surface.format === "yaml") {
      overrideObj = yaml.load(overrideContent);
    } else {
      overrideObj = JSON.parse(overrideContent);
    }

    if (!isObject(overrideObj)) {
      // Non-object override: report as a single key indicating full replacement
      results.push({ surface: surface.path, overrideKeys: ["(entire file)"] });
      continue;
    }

    const overrideKeys = Object.keys(overrideObj);

    if (overrideKeys.length > 0) {
      results.push({ surface: surface.path, overrideKeys });
    }
  }

  return results;
}

async function expandSurfaces(
  projectPath: string,
  surfaces: Surface[]
): Promise<Surface[]> {
  const expanded: Surface[] = [];

  for (const surface of surfaces) {
    if (surface.path.includes("*")) {
      validateGlobPattern(surface.path);

      const matches = await fg(surface.path, {
        cwd: projectPath,
        followSymbolicLinks: false,
        deep: 10,
      });
      for (const match of matches.sort()) {
        expanded.push({ ...surface, path: match });
      }
    } else {
      expanded.push(surface);
    }
  }

  return expanded;
}
