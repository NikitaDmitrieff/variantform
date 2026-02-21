"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Plus } from "lucide-react";
import { ProjectCard } from "@/components/dashboard/project-card";
import { CreateProjectModal } from "@/components/dashboard/create-project-modal";
import type { Project } from "@/lib/types";

export default function DashboardPage() {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();
  const installationId = searchParams.get("installation_id");

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Auto-open modal if returning from GitHub App installation
  useEffect(() => {
    if (installationId) setModalOpen(true);
  }, [installationId]);

  const fetchProjects = useCallback(async () => {
    const { data } = await supabase
      .from("vf_projects")
      .select("*")
      .order("created_at", { ascending: false });

    setProjects((data ?? []) as Project[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  async function handleCreate(
    repo: string,
    ghInstallationId: number,
    defaultBranch: string
  ) {
    const name = repo.split("/")[1] || repo;
    const { error } = await supabase.from("vf_projects").insert({
      name,
      github_repo: repo,
      github_installation_id: ghInstallationId,
      default_branch: defaultBranch,
    });
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
          Connect Repo
        </button>
      </div>

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
            Connect your first repository
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
        installationId={installationId}
        onClose={() => setModalOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}
