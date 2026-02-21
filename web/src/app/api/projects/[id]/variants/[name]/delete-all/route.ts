import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRepoContext, fetchFile, deleteFile } from "@/lib/github-repo";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; name: string }> }
) {
  const { id, name } = await params;
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

    // Use GitHub Trees API to list all files in the variant directory
    const { data: tree } = await ctx.octokit.request(
      "GET /repos/{owner}/{repo}/git/trees/{tree_sha}",
      {
        owner: ctx.owner,
        repo: ctx.repo,
        tree_sha: `${ctx.branch}:variants/${name}`,
        recursive: "1",
      }
    );

    const files = (tree.tree as any[]).filter((t: any) => t.type === "blob");

    // Delete each file (GitHub Contents API requires deleting one at a time)
    for (const file of files) {
      const filePath = `variants/${name}/${file.path}`;
      const fileData = await fetchFile(ctx, filePath);
      if (fileData) {
        await deleteFile(ctx, filePath, fileData.sha, `variantform: delete variant ${name}`);
      }
    }

    return NextResponse.json({ ok: true, deleted: files.length });
  } catch (e: any) {
    if (e.status === 404) {
      return NextResponse.json({ error: `Variant "${name}" not found` }, { status: 404 });
    }
    const message = e instanceof Error ? e.message : "Failed to delete variant";
    console.error("POST /api/projects/[id]/variants/[name]/delete-all error:", message, e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
