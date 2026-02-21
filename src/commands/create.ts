import { mkdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

const VALID_NAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

export async function runCreate(
  projectPath: string,
  clientName: string
): Promise<void> {
  if (!VALID_NAME.test(clientName)) {
    throw new Error(
      `invalid variant name: "${clientName}". Use alphanumeric, dots, hyphens, underscores.`
    );
  }

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
