import { getInstallationOctokit, parseRepo } from "./github";
import yaml from "js-yaml";
import type { Octokit } from "@octokit/rest";

interface RepoContext {
  octokit: Octokit;
  owner: string;
  repo: string;
  branch: string;
}

export async function getRepoContext(
  installationId: number,
  githubRepo: string,
  branch: string
): Promise<RepoContext> {
  const octokit = await getInstallationOctokit(installationId);
  const { owner, repo } = parseRepo(githubRepo);
  return { octokit, owner, repo, branch };
}

/** Fetch and parse .variantform.yaml from the repo. */
export async function fetchConfig(ctx: RepoContext) {
  const { data } = await ctx.octokit.repos.getContent({
    owner: ctx.owner,
    repo: ctx.repo,
    path: ".variantform.yaml",
    ref: ctx.branch,
  });

  if (Array.isArray(data) || data.type !== "file") {
    throw new Error(".variantform.yaml is not a file");
  }

  const content = Buffer.from(data.content, "base64").toString("utf-8");
  const parsed = yaml.load(content) as { surfaces?: unknown[] };

  if (!parsed?.surfaces || !Array.isArray(parsed.surfaces)) {
    throw new Error(".variantform.yaml must contain a 'surfaces' array");
  }

  return parsed.surfaces.map((s: any) => ({
    path: s.path as string,
    format: s.format as "json" | "yaml",
    strategy: (s.strategy || "merge") as "merge" | "replace",
  }));
}

/** Fetch a single file's content from the repo. Returns content + SHA. */
export async function fetchFile(
  ctx: RepoContext,
  path: string
): Promise<{ content: string; sha: string } | null> {
  try {
    const { data } = await ctx.octokit.repos.getContent({
      owner: ctx.owner,
      repo: ctx.repo,
      path,
      ref: ctx.branch,
    });

    if (Array.isArray(data) || data.type !== "file") return null;

    return {
      content: Buffer.from(data.content, "base64").toString("utf-8"),
      sha: data.sha,
    };
  } catch (e: any) {
    if (e.status === 404) return null;
    throw e;
  }
}

/** List subdirectories under a path (e.g., variants/). */
export async function listDirectories(
  ctx: RepoContext,
  path: string
): Promise<string[]> {
  try {
    const { data } = await ctx.octokit.repos.getContent({
      owner: ctx.owner,
      repo: ctx.repo,
      path,
      ref: ctx.branch,
    });

    if (!Array.isArray(data)) return [];
    return data.filter((d) => d.type === "dir").map((d) => d.name);
  } catch (e: any) {
    if (e.status === 404) return [];
    throw e;
  }
}

/** Create or update a file in the repo. */
export async function putFile(
  ctx: RepoContext,
  path: string,
  content: string,
  message: string,
  existingSha?: string
): Promise<void> {
  await ctx.octokit.repos.createOrUpdateFileContents({
    owner: ctx.owner,
    repo: ctx.repo,
    path,
    message,
    content: Buffer.from(content).toString("base64"),
    branch: ctx.branch,
    ...(existingSha ? { sha: existingSha } : {}),
  });
}

/** Delete a file from the repo. */
export async function deleteFile(
  ctx: RepoContext,
  path: string,
  sha: string,
  message: string
): Promise<void> {
  await ctx.octokit.repos.deleteFile({
    owner: ctx.owner,
    repo: ctx.repo,
    path,
    message,
    sha,
    branch: ctx.branch,
  });
}
