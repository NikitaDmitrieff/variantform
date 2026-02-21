import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getRepoContext,
  fetchConfig,
  listDirectories,
  fetchFile,
  putFile,
} from "@/lib/github-repo";

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
    const variantNames = await listDirectories(ctx, "variants");

    // For each variant, count overrides and collect override paths
    const variants = await Promise.all(
      variantNames.map(async (name) => {
        const overrides: string[] = [];
        for (const s of surfaceDefs) {
          const file = await fetchFile(ctx, `variants/${name}/${s.path}`);
          if (file) overrides.push(s.path);
        }
        return { name, override_count: overrides.length, overrides };
      })
    );

    return NextResponse.json({ variants });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to read repo";
    console.error("GET /api/projects/[id]/variants error:", message, e);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await request.json();
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
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

    // Create a .gitkeep file in the variant directory
    await putFile(
      ctx,
      `variants/${name}/.gitkeep`,
      "",
      `variantform: create variant "${name}"`
    );

    return NextResponse.json({ name }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create variant" },
      { status: 500 }
    );
  }
}
