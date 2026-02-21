import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getRepoContext,
  fetchConfig,
  fetchFile,
  putFile,
  deleteFile,
} from "@/lib/github-repo";

export async function GET(
  _request: Request,
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

    const surfaceDefs = await fetchConfig(ctx);

    // Fetch surfaces with base content + overrides
    const surfaces = await Promise.all(
      surfaceDefs.map(async (s) => {
        const [base, override] = await Promise.all([
          fetchFile(ctx, s.path),
          fetchFile(ctx, `variants/${name}/${s.path}`),
        ]);
        return {
          ...s,
          base_content: base?.content ?? "",
          override: override
            ? { surface_path: s.path, content: override.content, sha: override.sha }
            : null,
        };
      })
    );

    return NextResponse.json({ surfaces });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to read variant" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; name: string }> }
) {
  const { id, name } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { surface_path, content, sha } = await request.json();
  if (!surface_path || typeof content !== "string") {
    return NextResponse.json({ error: "surface_path and content required" }, { status: 400 });
  }

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

    const filePath = `variants/${name}/${surface_path}`;
    await putFile(
      ctx,
      filePath,
      content,
      `variantform: update ${name}/${surface_path}`,
      sha || undefined
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to save override" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; name: string }> }
) {
  const { id, name } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { surface_path, sha } = await request.json();
  if (!surface_path || !sha) {
    return NextResponse.json({ error: "surface_path and sha required" }, { status: 400 });
  }

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

    await deleteFile(
      ctx,
      `variants/${name}/${surface_path}`,
      sha,
      `variantform: remove ${name}/${surface_path}`
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to delete override" },
      { status: 500 }
    );
  }
}
