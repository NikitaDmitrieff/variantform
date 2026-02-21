import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRepoContext } from "@/lib/github-repo";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: project } = await supabase
    .from("vf_projects")
    .select("github_repo, github_installation_id, default_branch")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!project?.github_repo || !project.github_installation_id) {
    return NextResponse.json({ error: "Project not connected to GitHub" }, { status: 400 });
  }

  try {
    const ctx = await getRepoContext(
      project.github_installation_id,
      project.github_repo,
      project.default_branch
    );

    // Fetch commits that touch variants/ directory
    const { data: commits } = await ctx.octokit.request(
      "GET /repos/{owner}/{repo}/commits",
      {
        owner: ctx.owner,
        repo: ctx.repo,
        sha: ctx.branch,
        path: "variants",
        per_page: 30,
      }
    );

    const activity = (commits as any[]).map((c: any) => ({
      sha: c.sha.slice(0, 7),
      message: c.commit.message,
      author: c.commit.author?.name || c.author?.login || "unknown",
      date: c.commit.author?.date,
      url: c.html_url,
    }));

    return NextResponse.json({ activity });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch activity";
    console.error("GET /api/projects/[id]/activity error:", message, e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
