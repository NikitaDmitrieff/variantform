import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRepoContext, fetchConfig, fetchFile } from "@/lib/github-repo";

export async function GET(
  _request: Request,
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

    const surfaceDefs = await fetchConfig(ctx);

    // Fetch base content for each surface
    const surfaces = await Promise.all(
      surfaceDefs.map(async (s) => {
        const file = await fetchFile(ctx, s.path);
        return {
          ...s,
          base_content: file?.content ?? "",
        };
      })
    );

    return NextResponse.json({ surfaces });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to read repo" },
      { status: 500 }
    );
  }
}
