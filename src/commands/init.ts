import { writeFile, mkdir, access } from "node:fs/promises";
import { join } from "node:path";
import yaml from "js-yaml";
import { Surface } from "../config.js";

export async function runInit(
  projectPath: string,
  surfaces: Surface[]
): Promise<void> {
  const configPath = join(projectPath, ".variantform.yaml");
  const variantsDir = join(projectPath, "variants");

  // Check if already initialized
  try {
    await access(configPath);
    throw new Error("already initialized: .variantform.yaml exists");
  } catch (e) {
    if (e instanceof Error && e.message.includes("already initialized")) throw e;
  }

  // Write .variantform.yaml
  const config = {
    surfaces: surfaces.map((s) => ({
      path: s.path,
      format: s.format,
      strategy: s.strategy,
    })),
  };
  await writeFile(configPath, yaml.dump(config, { indent: 2 }));

  // Create variants/ directory with .gitkeep
  await mkdir(variantsDir, { recursive: true });
  await writeFile(join(variantsDir, ".gitkeep"), "");
}
