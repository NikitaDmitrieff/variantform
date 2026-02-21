"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { OverrideEditor } from "@/components/dashboard/override-editor";
import { ArrowLeft } from "lucide-react";
import type { Surface, Override } from "@/lib/types";

interface SurfaceWithOverride extends Surface {
  override: Override | null;
}

export default function VariantEditorPage() {
  const { projectId, variantId: variantName } = useParams<{
    projectId: string;
    variantId: string;
  }>();
  const router = useRouter();

  const [projectName, setProjectName] = useState("");
  const [surfaces, setSurfaces] = useState<SurfaceWithOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: proj } = await supabase
        .from("vf_projects")
        .select("name")
        .eq("id", projectId)
        .single();
      if (proj) setProjectName(proj.name);

      const res = await fetch(
        `/api/projects/${projectId}/variants/${encodeURIComponent(variantName)}`
      );
      if (!res.ok) throw new Error("Failed to load variant data");

      const data = await res.json();
      setSurfaces(data.surfaces ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load variant");
    } finally {
      setLoading(false);
    }
  }, [projectId, variantName]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSave(surfacePath: string, content: string, sha?: string) {
    const res = await fetch(
      `/api/projects/${projectId}/variants/${encodeURIComponent(variantName)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surface_path: surfacePath, content, sha }),
      }
    );
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to save");
    }
    await fetchData();
  }

  async function handleDelete(surfacePath: string, sha: string) {
    const res = await fetch(
      `/api/projects/${projectId}/variants/${encodeURIComponent(variantName)}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surface_path: surfacePath, sha }),
      }
    );
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to delete");
    }
    await fetchData();
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="skeleton h-8 w-64" />
        <div className="skeleton h-96" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="glass-card p-8 text-center">
          <p className="text-sm text-danger">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <button
          onClick={() => router.push(`/dashboard/${projectId}`)}
          className="mb-2 flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to {projectName}
        </button>
        <h1 className="text-lg font-medium text-fg">
          Variant: <span className="text-accent">{decodeURIComponent(variantName)}</span>
        </h1>
        <p className="mt-0.5 text-xs text-muted">
          Edit overrides for each surface. Changes are committed directly to the repo.
        </p>
      </div>

      {surfaces.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-16">
          <p className="text-sm text-muted">
            No surfaces declared in .variantform.yaml
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {surfaces.map((surface) => (
            <OverrideEditor
              key={surface.path}
              surface={surface}
              override={surface.override}
              onSave={handleSave}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
