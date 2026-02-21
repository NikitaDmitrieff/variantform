import { mkdir, access, writeFile } from "node:fs/promises";
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

  // Check variants/ exists (project is initialized)
  try {
    await access(variantsDir);
  } catch {
    throw new Error("not initialized: run 'variantform init' first");
  }

  const variantDir = join(variantsDir, clientName);

  // Check if variant already exists
  try {
    await access(variantDir);
    throw new Error(`variant "${clientName}" already exists`);
  } catch (e) {
    if (e instanceof Error && e.message.includes("already exists")) throw e;
  }

  await mkdir(variantDir, { recursive: true });
  await writeFile(join(variantDir, ".gitkeep"), "");
}
