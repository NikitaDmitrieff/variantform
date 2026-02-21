import { readFile, access } from "node:fs/promises";
import { join } from "node:path";
import yaml from "js-yaml";
import { loadConfig } from "../config.js";

export interface DiffResult {
  surface: string;
  overrideKeys: string[];
}

export async function runDiff(
  projectPath: string,
  variantName: string
): Promise<DiffResult[]> {
  const config = await loadConfig(projectPath);
  const variantDir = join(projectPath, "variants", variantName);

  try {
    await access(variantDir);
  } catch {
    throw new Error(`variant "${variantName}" not found`);
  }

  const results: DiffResult[] = [];

  for (const surface of config.surfaces) {
    const overridePath = join(variantDir, surface.path);

    let overrideContent: string;
    try {
      overrideContent = await readFile(overridePath, "utf-8");
    } catch {
      continue; // No override for this surface
    }

    let overrideObj: Record<string, unknown>;
    if (surface.format === "yaml") {
      overrideObj = yaml.load(overrideContent) as Record<string, unknown>;
    } else {
      overrideObj = JSON.parse(overrideContent);
    }

    const overrideKeys = Object.keys(overrideObj);

    if (overrideKeys.length > 0) {
      results.push({ surface: surface.path, overrideKeys });
    }
  }

  return results;
}
