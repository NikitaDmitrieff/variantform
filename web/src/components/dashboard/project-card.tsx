"use client";

import Link from "next/link";
import { GitBranch, Trash2 } from "lucide-react";
import type { Project } from "@/lib/types";

interface ProjectCardProps {
  project: Project;
  onDelete: (id: string) => void;
}

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  return (
    <Link
      href={`/dashboard/${project.id}`}
      className="glass-card group relative block p-5 transition-all"
    >
      {/* Delete button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete(project.id);
        }}
        className="absolute right-3 top-3 rounded-lg p-1.5 text-muted opacity-0 transition-all hover:bg-white/[0.06] hover:text-danger group-hover:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      {/* Project name */}
      <h3 className="text-sm font-medium text-fg">{project.name}</h3>

      {/* Repo info */}
      {project.github_repo && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted">
          <GitBranch className="h-3 w-3" />
          <span className="truncate">{project.github_repo}</span>
        </div>
      )}

      {/* Date */}
      <p className="mt-2 text-[11px] text-muted">
        {new Date(project.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </p>
    </Link>
  );
}
