"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SurfacesPanel } from "@/components/dashboard/surfaces-panel";
import { VariantsPanel } from "@/components/dashboard/variants-panel";
import { validateOverride } from "@/lib/validate";
import type { Surface, Variant, Override } from "@/lib/types";
import type { ValidationIssue } from "@/lib/validate";

export default function ProjectOverviewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const supabase = useMemo(() => createClient(), []);

  const [projectName, setProjectName] = useState("");
  const [surfaces, setSurfaces] = useState<Surface[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const [projectRes, surfacesRes, variantsRes, overridesRes] =
      await Promise.all([
        supabase.from("vf_projects").select("name").eq("id", projectId).single(),
        supabase.from("vf_surfaces").select("*").eq("project_id", projectId),
        supabase.from("vf_variants").select("*").eq("project_id", projectId),
        supabase
          .from("vf_overrides")
          .select("*, vf_variants!inner(project_id)")
          .eq("vf_variants.project_id", projectId),
      ]);

    if (projectRes.data) setProjectName(projectRes.data.name);
    setSurfaces(surfacesRes.data ?? []);

    const ovs = (overridesRes.data ?? []) as Override[];
    setOverrides(ovs);

    // Enrich variants with override counts
    const rawVariants = (variantsRes.data ?? []) as Variant[];
    const enriched = rawVariants.map((v) => ({
      ...v,
      override_count: ovs.filter((o) => o.variant_id === v.id).length,
    }));
    setVariants(enriched);
    setLoading(false);
  }, [supabase, projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Compute validation per variant
  const validationMap: Record<string, ValidationIssue[]> = useMemo(() => {
    const map: Record<string, ValidationIssue[]> = {};
    for (const v of variants) {
      const issues: ValidationIssue[] = [];
      const variantOverrides = overrides.filter((o) => o.variant_id === v.id);
      for (const o of variantOverrides) {
        const surface = surfaces.find((s) => s.id === o.surface_id);
        if (!surface) continue;
        issues.push(
          ...validateOverride(
            o.content,
            surface.base_content,
            surface.path,
            surface.format,
            surface.strategy
          )
        );
      }
      map[v.id] = issues;
    }
    return map;
  }, [variants, overrides, surfaces]);

  async function handleAddSurface(s: {
    path: string;
    format: "json" | "yaml";
    strategy: "merge" | "replace";
    base_content: string;
  }) {
    const { error } = await supabase
      .from("vf_surfaces")
      .insert({ project_id: projectId, ...s });
    if (error) throw new Error(error.message);
    await fetchData();
  }

  async function handleDeleteSurface(id: string) {
    await supabase.from("vf_surfaces").delete().eq("id", id);
    await fetchData();
  }

  async function handleAddVariant(name: string) {
    const { error } = await supabase
      .from("vf_variants")
      .insert({ project_id: projectId, name });
    if (error) throw new Error(error.message);
    await fetchData();
  }

  async function handleDeleteVariant(id: string) {
    await supabase.from("vf_variants").delete().eq("id", id);
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

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg font-medium text-fg">{projectName}</h1>
        <p className="mt-0.5 text-xs text-muted">
          {surfaces.length} surfaces &middot; {variants.length} variants
        </p>
      </div>

      {/* Stats */}
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
            {overrides.length}
          </p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SurfacesPanel
          surfaces={surfaces}
          onAdd={handleAddSurface}
          onDelete={handleDeleteSurface}
        />
        <VariantsPanel
          projectId={projectId}
          variants={variants}
          validationMap={validationMap}
          onAdd={handleAddVariant}
          onDelete={handleDeleteVariant}
        />
      </div>
    </div>
  );
}
