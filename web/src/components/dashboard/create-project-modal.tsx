"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}

export function CreateProjectModal({
  open,
  onClose,
  onCreate,
}: CreateProjectModalProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await onCreate(name.trim());
      setName("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="slide-over-backdrop" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="glass-card w-full max-w-md p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium text-fg">New Project</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-muted transition-colors hover:bg-white/[0.06] hover:text-fg"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs text-muted">
                Project name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="my-saas-app"
                className="input-field"
                autoFocus
              />
            </div>

            {error && <p className="text-xs text-danger">{error}</p>}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="btn rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm text-muted transition-colors hover:bg-white/[0.06] hover:text-fg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="btn-primary flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium"
              >
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Create
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
