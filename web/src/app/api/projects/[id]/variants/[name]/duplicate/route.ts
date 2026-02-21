import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRepoContext, fetchFile, putFile } from "@/lib/github-repo";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; name: string }> }
) {
  const { id, name: sourceName } = await params;
  const { target_name } = await request.json();

  if (!target_name || typeof target_name !== "string") {
    return NextResponse.json({ error: "target_name required" }, { status: 400 });
  }

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

    // List all files in source variant
    let sourceFiles: any[];
    try {
      const { data: tree } = await ctx.octokit.request(
        "GET /repos/{owner}/{repo}/git/trees/{tree_sha}",
        {
          owner: ctx.owner,
          repo: ctx.repo,
          tree_sha: `${ctx.branch}:variants/${sourceName}`,
          recursive: "1",
        }
      );
      sourceFiles = (tree.tree as any[]).filter((t: any) => t.type === "blob");
    } catch {
      return NextResponse.json({ error: `Source variant "${sourceName}" not found` }, { status: 404 });
    }

    // Copy each file to the target variant
    let copied = 0;
    for (const file of sourceFiles) {
      const sourcePath = `variants/${sourceName}/${file.path}`;
      const targetPath = `variants/${target_name}/${file.path}`;
      const fileData = await fetchFile(ctx, sourcePath);
      if (fileData) {
        await putFile(ctx, targetPath, fileData.content, `variantform: duplicate ${sourceName} to ${target_name}`);
        copied++;
      }
    }

    return NextResponse.json({ ok: true, name: target_name, copied }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to duplicate variant";
    console.error("POST /api/projects/[id]/variants/[name]/duplicate error:", message, e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
