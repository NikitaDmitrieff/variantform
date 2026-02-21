"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { OverrideEditor } from "@/components/dashboard/override-editor";
import { ArrowLeft } from "lucide-react";
import type { Surface, Override } from "@/lib/types";

export default function VariantEditorPage() {
  const { projectId, variantId } = useParams<{
    projectId: string;
    variantId: string;
  }>();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [variantName, setVariantName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [surfaces, setSurfaces] = useState<Surface[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const [projectRes, variantRes, surfacesRes, overridesRes] =
      await Promise.all([
        supabase
          .from("vf_projects")
          .select("name")
          .eq("id", projectId)
          .single(),
        supabase
          .from("vf_variants")
          .select("name")
          .eq("id", variantId)
          .single(),
        supabase.from("vf_surfaces").select("*").eq("project_id", projectId),
        supabase
          .from("vf_overrides")
          .select("*")
          .eq("variant_id", variantId),
      ]);

    if (projectRes.data) setProjectName(projectRes.data.name);
    if (variantRes.data) setVariantName(variantRes.data.name);
    setSurfaces(surfacesRes.data ?? []);
    setOverrides((overridesRes.data ?? []) as Override[]);
    setLoading(false);
  }, [supabase, projectId, variantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSave(surfaceId: string, content: string) {
    const existing = overrides.find((o) => o.surface_id === surfaceId);

    if (existing) {
      await supabase
        .from("vf_overrides")
        .update({ content, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await supabase.from("vf_overrides").insert({
        variant_id: variantId,
        surface_id: surfaceId,
        content,
      });
    }

    await fetchData();
  }

  async function handleDelete(surfaceId: string) {
    const existing = overrides.find((o) => o.surface_id === surfaceId);
    if (existing) {
      await supabase.from("vf_overrides").delete().eq("id", existing.id);
      await fetchData();
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="skeleton h-8 w-64" />
        <div className="skeleton h-96" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push(`/dashboard/${projectId}`)}
          className="mb-2 flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to {projectName}
        </button>
        <h1 className="text-lg font-medium text-fg">
          Variant: <span className="text-accent">{variantName}</span>
        </h1>
        <p className="mt-0.5 text-xs text-muted">
          Edit overrides for each surface. Changes are previewed live using RFC
          7396 JSON Merge Patch.
        </p>
      </div>

      {/* Surface editors */}
      {surfaces.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-16">
          <p className="text-sm text-muted">
            No surfaces declared in this project
          </p>
          <button
            onClick={() => router.push(`/dashboard/${projectId}`)}
            className="mt-3 text-xs text-accent transition-colors hover:text-fg"
          >
            Add surfaces first
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {surfaces.map((surface) => {
            const override =
              overrides.find((o) => o.surface_id === surface.id) ?? null;
            return (
              <OverrideEditor
                key={surface.id}
                surface={surface}
                override={override}
                onSave={handleSave}
                onDelete={handleDelete}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
