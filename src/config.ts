import { readFile } from "node:fs/promises";
import { join } from "node:path";
import yaml from "js-yaml";

export type MergeStrategy = "merge" | "replace";

export interface Surface {
  path: string;
  format: "json" | "yaml";
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
    return {
      path: surface.path,
      format: surface.format as Surface["format"],
      strategy: (surface.strategy as MergeStrategy) || "merge",
    };
  });

  return { surfaces };
}
