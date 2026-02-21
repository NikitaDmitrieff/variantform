import { readFile, access } from "node:fs/promises";
import { join } from "node:path";
import { loadConfig, Surface } from "../config.js";
import { applyOverride, applyYamlOverride, isObject } from "../merge.js";
import { validateVariantName, validateGlobPattern } from "../paths.js";
import fg from "fast-glob";

export interface ResolveResult {
  surface: string;
  content: string;
  hasOverride: boolean;
}

export async function runResolve(
  projectPath: string,
  variantName: string,
  surfaceFilter?: string
): Promise<ResolveResult[]> {
  validateVariantName(variantName);

  const config = await loadConfig(projectPath);
  const variantDir = join(projectPath, "variants", variantName);

  // Check variant exists
  try {
    await access(variantDir);
  } catch {
    throw new Error(`variant "${variantName}" not found`);
  }

  // Expand glob patterns in surfaces (with safety checks)
  const expandedSurfaces = await expandSurfaces(projectPath, config.surfaces);

  // Filter to specific surface if requested
  const surfaces = surfaceFilter
    ? expandedSurfaces.filter((s) => s.path === surfaceFilter)
    : expandedSurfaces;

  const results: ResolveResult[] = [];

  for (const surface of surfaces) {
    const basePath = join(projectPath, surface.path);
    const overridePath = join(variantDir, surface.path);

    let baseContent: string;
    try {
      baseContent = await readFile(basePath, "utf-8");
    } catch {
      throw new Error(`Base file not found for surface: ${surface.path}`);
    }

    let hasOverride = false;
    let overrideContent: string | null = null;
    try {
      overrideContent = await readFile(overridePath, "utf-8");
      hasOverride = true;
    } catch {
      // No override -- use base as-is
    }

    let content: string;

    if (!hasOverride || !overrideContent) {
      content = baseContent;
    } else if (surface.strategy === "replace") {
      content = overrideContent;
    } else if (surface.format === "json") {
      const base = JSON.parse(baseContent);
      const override = JSON.parse(overrideContent);
      if (!isObject(override)) {
        throw new Error(
          `Override for "${surface.path}" in variant "${variantName}" must be a JSON object for merge strategy. Use replace strategy for non-object overrides.`
        );
      }
      const merged = applyOverride(base, override);
      content = JSON.stringify(merged, null, 2);
    } else if (surface.format === "yaml") {
      content = applyYamlOverride(baseContent, overrideContent);
    } else {
      content = baseContent;
    }

    results.push({ surface: surface.path, content, hasOverride });
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
      // Validate glob pattern doesn't escape project root
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
