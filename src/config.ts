import { readFile } from "node:fs/promises";
import { join } from "node:path";
import yaml from "js-yaml";
import { validateSurfacePath } from "./paths.js";

export type SurfaceFormat = "json" | "yaml" | "css" | "code" | "markdown" | "asset" | "template" | "text";
export type MergeStrategy = "merge" | "replace";

export const MERGEABLE_FORMATS: SurfaceFormat[] = ["json", "yaml"];
export const VALID_FORMATS: SurfaceFormat[] = ["json", "yaml", "css", "code", "markdown", "asset", "template", "text"];

export interface Surface {
  path: string;
  format: SurfaceFormat;
  strategy: MergeStrategy;
}

export interface VariantformConfig {
  surfaces: Surface[];
}

export async function loadConfig(repoPath: string): Promise<VariantformConfig> {
  const configPath = join(repoPath, ".variantform.yaml");

  let raw: string;
  try {
    raw = await readFile(configPath, "utf-8");
  } catch {
    throw new Error(".variantform.yaml not found in " + repoPath);
  }

  const parsed = yaml.load(raw) as Record<string, unknown>;

  if (!parsed || !Array.isArray(parsed.surfaces)) {
    throw new Error(".variantform.yaml must contain a 'surfaces' array");
  }

  const surfaces: Surface[] = parsed.surfaces.map((s: unknown) => {
    const surface = s as Record<string, unknown>;
    if (typeof surface.path !== "string" || typeof surface.format !== "string") {
      throw new Error("Each surface must have 'path' (string) and 'format' (string)");
    }

    // Security: reject traversal and absolute paths
    validateSurfacePath(surface.path as string);

    if (!VALID_FORMATS.includes(surface.format as SurfaceFormat)) {
      throw new Error(`Invalid format "${surface.format}". Must be one of: ${VALID_FORMATS.join(", ")}.`);
    }

    // Default strategy: merge for json/yaml, replace for everything else
    const defaultStrategy = MERGEABLE_FORMATS.includes(surface.format as SurfaceFormat) ? "merge" : "replace";
    const strategy = (surface.strategy as string) || defaultStrategy;

    if (!["merge", "replace"].includes(strategy)) {
      throw new Error(`Invalid strategy "${surface.strategy}". Must be "merge" or "replace".`);
    }

    // Merge strategy only allowed for json/yaml
    if (strategy === "merge" && !MERGEABLE_FORMATS.includes(surface.format as SurfaceFormat)) {
      throw new Error(`Format "${surface.format}" does not support merge strategy. Use replace instead.`);
    }

    return {
      path: surface.path,
      format: surface.format as SurfaceFormat,
      strategy: strategy as MergeStrategy,
    };
  });

  return { surfaces };
}
