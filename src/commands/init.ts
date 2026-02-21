import { writeFile, mkdir, stat } from "node:fs/promises";
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
  const exists = await stat(configPath).then(() => true, () => false);
  if (exists) {
    throw new Error("already initialized: .variantform.yaml exists");
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
