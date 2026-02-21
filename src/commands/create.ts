import { mkdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { validateVariantName } from "../paths.js";

export async function runCreate(
  projectPath: string,
  clientName: string
): Promise<void> {
  validateVariantName(clientName);

  const variantsDir = join(projectPath, "variants");

  // Check variants/ exists and is a directory (project is initialized)
  const variantsStat = await stat(variantsDir).catch(() => null);
  if (!variantsStat?.isDirectory()) {
    throw new Error("not initialized: run 'variantform init' first");
  }

  const variantDir = join(variantsDir, clientName);

  // Check if variant already exists
  const variantExists = await stat(variantDir).then(() => true, () => false);
  if (variantExists) {
    throw new Error(`variant "${clientName}" already exists`);
  }

  await mkdir(variantDir, { recursive: true });
  await writeFile(join(variantDir, ".gitkeep"), "");
}
