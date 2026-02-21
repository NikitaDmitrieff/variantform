import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRepoContext, fetchConfig, fetchFile } from "@/lib/github-repo";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(request.url);
  const variant = url.searchParams.get("variant");
  const compareWith = url.searchParams.get("compare");

  if (!variant) {
    return NextResponse.json({ error: "variant query param required" }, { status: 400 });
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

    const surfaces = await fetchConfig(ctx);

    const diffs: Array<{
      surface: string;
      format: string;
      variant_has_override: boolean;
      compare_has_override?: boolean;
    }> = [];

    for (const surface of surfaces) {
      const variantOverride = await fetchFile(ctx, `variants/${variant}/${surface.path}`);

      if (compareWith) {
        const compareOverride = await fetchFile(ctx, `variants/${compareWith}/${surface.path}`);
        diffs.push({
          surface: surface.path,
          format: surface.format,
          variant_has_override: !!variantOverride,
          compare_has_override: !!compareOverride,
        });
      } else {
        diffs.push({
          surface: surface.path,
          format: surface.format,
          variant_has_override: !!variantOverride,
        });
      }
    }

    return NextResponse.json({ variant, compare: compareWith, diffs });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to compute diff";
    console.error("GET /api/projects/[id]/diff error:", message, e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
