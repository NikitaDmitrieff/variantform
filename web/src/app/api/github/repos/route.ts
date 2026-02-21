import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getInstallationOctokit } from "@/lib/github";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const installationId = searchParams.get("installation_id");
  if (!installationId) {
    return NextResponse.json({ error: "installation_id required" }, { status: 400 });
  }

  try {
    const octokit = await getInstallationOctokit(Number(installationId));
    const { data } = await octokit.request("GET /installation/repositories", {
      per_page: 100,
    });

    const repos = data.repositories.map((r: any) => ({
      full_name: r.full_name,
      default_branch: r.default_branch,
      private: r.private,
    }));

    return NextResponse.json({ repos });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to list repos";
    console.error("Failed to list repos:", message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
