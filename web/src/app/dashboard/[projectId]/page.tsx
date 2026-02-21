"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { SurfaceMap } from "@/components/dashboard/surface-map";
import { HealthBar } from "@/components/dashboard/health-bar";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { VariantsPanel } from "@/components/dashboard/variants-panel";
import type { Surface, Variant, Project } from "@/lib/types";
import { Sparkles } from "lucide-react";

interface VariantWithOverrides extends Variant {
  overrides: string[];
}

interface HealthSummary {
  total_variants: number;
  healthy: number;
  warnings: number;
  errors: number;
}

interface ActivityItem {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

export default function ProjectOverviewPage() {
  const { projectId } = useParams<{ projectId: string }>();

  const [project, setProject] = useState<Project | null>(null);
  const [surfaces, setSurfaces] = useState<Surface[]>([]);
  const [variants, setVariants] = useState<VariantWithOverrides[]>([]);
  const [health, setHealth] = useState<HealthSummary | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [healthLoading, setHealthLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
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

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/health`);
      if (res.ok) {
        const data = await res.json();
        setHealth(data.summary);
      }
    } catch {
      // Health is non-critical — fail silently
    } finally {
      setHealthLoading(false);
    }
  }, [projectId]);

  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/activity`);
      if (res.ok) {
        const data = await res.json();
        setActivity(data.activity ?? []);
      }
    } catch {
      // Activity is non-critical — fail silently
    } finally {
      setActivityLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
    fetchHealth();
    fetchActivity();
  }, [fetchData, fetchHealth, fetchActivity]);

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
    fetchHealth();
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-12 w-full" />
        <div className="skeleton h-64" />
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

  const totalOverrides = variants.reduce((sum, v) => sum + v.override_count, 0);

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-lg font-medium text-fg">{project?.name}</h1>
          <p className="mt-0.5 text-xs text-muted">
            {project?.github_repo} &middot; {surfaces.length} surfaces &middot;{" "}
            {variants.length} variants
          </p>
        </div>
        <Link
          href={`/dashboard/${projectId}/chat`}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-muted transition-colors hover:bg-white/[0.08] hover:text-fg"
        >
          <Sparkles className="h-3 w-3" />
          AI Assistant
        </Link>
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-3 gap-3">
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
            {totalOverrides}
          </p>
        </div>
      </div>

      {/* Health Bar */}
      <div className="mb-4">
        <HealthBar summary={health} loading={healthLoading} />
      </div>

      {/* No surfaces CTA */}
      {surfaces.length === 0 && (
        <div className="mb-6 glass-card p-8 text-center">
          <h2 className="text-sm font-medium text-fg">Set up customization</h2>
          <p className="mt-1 text-xs text-muted">
            Use the AI assistant to analyze your repo and declare what&apos;s customizable.
          </p>
          <Link
            href={`/dashboard/${projectId}/chat`}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-accent/90"
          >
            <Sparkles className="h-3 w-3" />
            Start AI Setup
          </Link>
        </div>
      )}

      {/* Surface Map */}
      {surfaces.length > 0 && variants.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
            Customization Map
          </h2>
          <SurfaceMap surfaces={surfaces} variants={variants} />
        </div>
      )}

      {/* Two-column: Variants + Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
            Variants
          </h2>
          <VariantsPanel
            projectId={projectId}
            variants={variants}
            onAdd={handleAddVariant}
          />
        </div>
        <div>
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
            Recent Activity
          </h2>
          <ActivityFeed activity={activity} loading={activityLoading} />
        </div>
      </div>
    </div>
  );
}
