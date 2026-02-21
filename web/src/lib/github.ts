import { App } from "@octokit/app";

let app: App | null = null;

function getApp(): App {
  if (!app) {
    app = new App({
      appId: process.env.GITHUB_APP_ID!,
      privateKey: process.env.GITHUB_APP_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    });
  }
  return app;
}

/** Get an authenticated Octokit instance for a specific installation. */
export async function getInstallationOctokit(installationId: number) {
  const ghApp = getApp();
  return ghApp.getInstallationOctokit(installationId);
}

/** Parse "owner/repo" into components. */
export function parseRepo(fullName: string): { owner: string; repo: string } {
  const [owner, repo] = fullName.split("/");
  if (!owner || !repo) throw new Error(`Invalid repo: "${fullName}"`);
  return { owner, repo };
}
