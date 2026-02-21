import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRepoContext, putFile } from "@/lib/github-repo";
import yaml from "js-yaml";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { project_id, plan } = await request.json();

  const { data: project } = await supabase
    .from("vf_projects")
    .select("*")
    .eq("id", project_id)
    .eq("user_id", user.id)
    .single();

  if (!project)
    return NextResponse.json({ error: "Project not found" }, { status: 404 });

  if (!project.github_repo || !project.github_installation_id) {
    return NextResponse.json(
      { error: "No GitHub connection" },
      { status: 400 }
    );
  }

  // Create job record
  const admin = createAdminClient();
  const { data: job, error: jobErr } = await admin
    .from("vf_jobs")
    .insert({
      project_id,
      user_id: user.id,
      status: "running",
      job_type: "onboarding",
      plan,
    })
    .select()
    .single();

  if (jobErr)
    return NextResponse.json({ error: jobErr.message }, { status: 500 });

  // Execute the plan (MVP: direct GitHub API, no container worker)
  try {
    const ctx = await getRepoContext(
      project.github_installation_id,
      project.github_repo,
      project.default_branch
    );

    // 1. Create .variantform.yaml if plan includes surfaces
    if (plan.surfaces && plan.surfaces.length > 0) {
      const yamlContent = yaml.dump({
        surfaces: plan.surfaces.map((s: any) => ({
          path: s.path,
          format: s.format,
          strategy: s.strategy,
        })),
      });
      await putFile(
        ctx,
        ".variantform.yaml",
        yamlContent,
        "variantform: initialize project configuration"
      );
    }

    // 2. Create variant directories if plan includes them
    if (plan.create_variants && Array.isArray(plan.create_variants)) {
      for (const variantName of plan.create_variants) {
        await putFile(
          ctx,
          `variants/${variantName}/.gitkeep`,
          "",
          `variantform: create variant ${variantName}`
        );
      }
    }

    // Update job as completed
    await admin
      .from("vf_jobs")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", job.id);

    return NextResponse.json({ job_id: job.id, status: "completed" });
  } catch (e) {
    // Update job as failed
    await admin
      .from("vf_jobs")
      .update({
        status: "failed",
        error: e instanceof Error ? e.message : "Unknown error",
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    return NextResponse.json(
      {
        job_id: job.id,
        status: "failed",
        error: e instanceof Error ? e.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
