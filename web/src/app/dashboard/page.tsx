"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus } from "lucide-react";
import { ProjectCard } from "@/components/dashboard/project-card";
import { CreateProjectModal } from "@/components/dashboard/create-project-modal";
import type { Project } from "@/lib/types";

export default function DashboardPage() {
  const supabase = useMemo(() => createClient(), []);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchProjects = useCallback(async () => {
    const { data } = await supabase
      .from("vf_projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (!data) {
      setProjects([]);
      setLoading(false);
      return;
    }

    // Get counts for each project
    const enriched = await Promise.all(
      data.map(async (p) => {
        const [surfaces, variants] = await Promise.all([
          supabase
            .from("vf_surfaces")
            .select("id", { count: "exact", head: true })
            .eq("project_id", p.id),
          supabase
            .from("vf_variants")
            .select("id", { count: "exact", head: true })
            .eq("project_id", p.id),
        ]);
        return {
          ...p,
          surface_count: surfaces.count ?? 0,
          variant_count: variants.count ?? 0,
        };
      })
    );

    setProjects(enriched);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  async function handleCreate(name: string) {
    const { error } = await supabase.from("vf_projects").insert({ name });
    if (error) throw new Error(error.message);
    await fetchProjects();
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("vf_projects").delete().eq("id", id);
    if (error) return;
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-fg">Projects</h1>
          <p className="mt-0.5 text-xs text-muted">
            Manage your configuration variant projects
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="btn-primary flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium"
        >
          <Plus className="h-3.5 w-3.5" />
          New Project
        </button>
      </div>

      {/* Project grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-32" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-16">
          <p className="text-sm text-muted">No projects yet</p>
          <button
            onClick={() => setModalOpen(true)}
            className="mt-3 text-xs text-accent transition-colors hover:text-fg"
          >
            Create your first project
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <CreateProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}
