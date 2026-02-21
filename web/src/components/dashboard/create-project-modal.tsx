"use client";

import { useState, useEffect } from "react";
import { X, Loader2, GitBranch } from "lucide-react";

interface CreateProjectModalProps {
  open: boolean;
  installationId: string | null;
  onClose: () => void;
  onCreate: (repo: string, installationId: number, defaultBranch: string) => Promise<void>;
}

interface Repo {
  full_name: string;
  default_branch: string;
  private: boolean;
}

const GITHUB_APP_SLUG = "variantform"; // Update after app registration

export function CreateProjectModal({
  open,
  installationId,
  onClose,
  onCreate,
}: CreateProjectModalProps) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !installationId) return;
    setLoading(true);
    fetch(`/api/github/repos?installation_id=${installationId}`)
      .then((r) => r.json())
      .then((data) => setRepos(data.repos ?? []))
      .catch(() => setError("Failed to load repos"))
      .finally(() => setLoading(false));
  }, [open, installationId]);

  if (!open) return null;

  async function handleSelect(repo: Repo) {
    setCreating(true);
    setError(null);
    try {
      await onCreate(repo.full_name, Number(installationId), repo.default_branch);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <div className="slide-over-backdrop" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="glass-card w-full max-w-md p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium text-fg">Connect Repository</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-muted transition-colors hover:bg-white/[0.06] hover:text-fg"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {!installationId ? (
            <div className="space-y-4">
              <p className="text-xs text-muted">
                Install the Variantform GitHub App on your repository first.
                The repo must have <code className="text-accent">.variantform.yaml</code> (run{" "}
                <code className="text-accent">variantform init</code> first).
              </p>
              <a
                href={`https://github.com/apps/${GITHUB_APP_SLUG}/installations/new`}
                className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium"
              >
                <GitBranch className="h-4 w-4" />
                Install GitHub App
              </a>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted" />
            </div>
          ) : repos.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted">
              No repositories found. Make sure you granted access to at least one repo.
            </p>
          ) : (
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {repos.map((repo) => (
                <button
                  key={repo.full_name}
                  onClick={() => handleSelect(repo)}
                  disabled={creating}
                  className="glass-card flex w-full items-center gap-3 p-3 text-left transition-all hover:border-accent/30"
                >
                  <GitBranch className="h-4 w-4 shrink-0 text-accent" />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-fg">
                      {repo.full_name}
                    </p>
                    <p className="text-[11px] text-muted">
                      {repo.default_branch} &middot; {repo.private ? "private" : "public"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {error && <p className="mt-3 text-xs text-danger">{error}</p>}
        </div>
      </div>
    </>
  );
}
