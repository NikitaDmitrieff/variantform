import { mkdtemp, writeFile, mkdir, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";

export interface TestProject {
  path: string;
  /** Write a file relative to project root */
  writeFile(relativePath: string, content: string): Promise<void>;
  /** Read a file relative to project root */
  readFile(relativePath: string): Promise<string>;
  /** Clean up the temp directory */
  cleanup(): Promise<void>;
}

export async function createTestProject(): Promise<TestProject> {
  const path = await mkdtemp(join(tmpdir(), "variantform-test-"));

  const project: TestProject = {
    path,
    async writeFile(relativePath: string, content: string) {
      const fullPath = join(path, relativePath);
      await mkdir(dirname(fullPath), { recursive: true });
      await writeFile(fullPath, content);
    },
    async readFile(relativePath: string): Promise<string> {
      return readFile(join(path, relativePath), "utf-8");
    },
    async cleanup() {
      await rm(path, { recursive: true, force: true });
    },
  };

  return project;
}
