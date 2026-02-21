import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRepoContext, fetchConfig, fetchFile, listDirectories } from "@/lib/github-repo";
import type { SurfaceFormat } from "@/lib/types";
import yaml from "js-yaml";

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

    const surfaces = await fetchConfig(ctx);
    const variantNames = await listDirectories(ctx, "variants");

    const MERGEABLE: SurfaceFormat[] = ["json", "yaml"];
    const health: Record<string, { status: "healthy" | "warnings" | "errors"; issues: string[] }> = {};

    for (const variant of variantNames) {
      const issues: string[] = [];

      for (const surface of surfaces) {
        const overrideFile = await fetchFile(ctx, `variants/${variant}/${surface.path}`);
        if (!overrideFile) continue;

        if (MERGEABLE.includes(surface.format)) {
          try {
            const parsed = surface.format === "yaml"
              ? yaml.load(overrideFile.content)
              : JSON.parse(overrideFile.content);

            if (surface.strategy === "merge" && typeof parsed !== "object") {
              issues.push(`${surface.path}: override must be an object for merge strategy`);
            }
          } catch {
            issues.push(`${surface.path}: parse error`);
          }
        } else {
          if (overrideFile.content.trim().length === 0) {
            issues.push(`${surface.path}: empty override file`);
          }
        }
      }

      health[variant] = {
        status: issues.length === 0 ? "healthy" : issues.some(i => i.includes("error")) ? "errors" : "warnings",
        issues,
      };
    }

    const summary = {
      total_variants: variantNames.length,
      healthy: Object.values(health).filter(h => h.status === "healthy").length,
      warnings: Object.values(health).filter(h => h.status === "warnings").length,
      errors: Object.values(health).filter(h => h.status === "errors").length,
    };

    return NextResponse.json({ summary, variants: health });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to check health";
    console.error("GET /api/projects/[id]/health error:", message, e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
