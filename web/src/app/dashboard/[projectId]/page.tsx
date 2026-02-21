"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SurfacesPanel } from "@/components/dashboard/surfaces-panel";
import { VariantsPanel } from "@/components/dashboard/variants-panel";
import type { Surface, Variant, Project } from "@/lib/types";

export default function ProjectOverviewPage() {
  const { projectId } = useParams<{ projectId: string }>();

  const [project, setProject] = useState<Project | null>(null);
  const [surfaces, setSurfaces] = useState<Surface[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      // Fetch project metadata from Supabase
      const supabase = createClient();
      const { data: proj } = await supabase
        .from("vf_projects")
        .select("*")
        .eq("id", projectId)
        .single();
      setProject(proj as Project);

      // Fetch surfaces and variants from GitHub via API
      const [surfacesRes, variantsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/surfaces`),
        fetch(`/api/projects/${projectId}/variants`),
      ]);

      if (!surfacesRes.ok) {
        const err = await surfacesRes.json().catch(() => ({}));
        throw new Error(`Surfaces: ${err.error || surfacesRes.statusText}`);
      }
      if (!variantsRes.ok) {
        const err = await variantsRes.json().catch(() => ({}));
        throw new Error(`Variants: ${err.error || variantsRes.statusText}`);
      }

      const surfacesData = await surfacesRes.json();
      const variantsData = await variantsRes.json();

      setSurfaces(surfacesData.surfaces ?? []);
      setVariants(variantsData.variants ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load project");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleAddVariant(name: string) {
    const res = await fetch(`/api/projects/${projectId}/variants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to create variant");
    }
    await fetchData();
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="skeleton h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="skeleton h-64" />
          <div className="skeleton h-64" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="glass-card p-8 text-center">
          <p className="text-sm text-danger">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-lg font-medium text-fg">{project?.name}</h1>
        <p className="mt-0.5 text-xs text-muted">
          {project?.github_repo} &middot; {surfaces.length} surfaces &middot;{" "}
          {variants.length} variants
        </p>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="stat-card">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
            Surfaces
          </span>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums text-fg">
            {surfaces.length}
          </p>
        </div>
        <div className="stat-card">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
            Variants
          </span>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums text-fg">
            {variants.length}
          </p>
        </div>
        <div className="stat-card">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
            Overrides
          </span>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums text-fg">
            {variants.reduce((sum, v) => sum + v.override_count, 0)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SurfacesPanel surfaces={surfaces} />
        <VariantsPanel
          projectId={projectId}
          variants={variants}
          onAdd={handleAddVariant}
        />
      </div>
    </div>
  );
}
