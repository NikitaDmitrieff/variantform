"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Github, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  async function handleGitHubLogin() {
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
    if (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass-card w-full max-w-sm p-8">
        {/* Branding */}
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-violet-500">
            <span className="font-display text-lg font-extrabold text-white">
              V
            </span>
          </div>
          <h1 className="text-base font-medium text-fg">Variantform</h1>
          <p className="mt-1 text-xs text-muted">
            Sign in to manage your configuration variants
          </p>
        </div>

        {/* GitHub OAuth */}
        <button
          onClick={handleGitHubLogin}
          disabled={loading}
          className="btn-primary flex w-full items-center justify-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-medium"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Github className="h-4 w-4" />
          )}
          Continue with GitHub
        </button>

        {error && <p className="mt-3 text-center text-xs text-danger">{error}</p>}

        {/* Footer */}
        <p className="mt-6 text-center text-[11px] text-muted">
          By signing in, you agree to let Variantform access your GitHub profile.
        </p>
      </div>
    </div>
  );
}
