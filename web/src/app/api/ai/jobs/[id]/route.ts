import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: job } = await supabase
    .from("vf_jobs")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!job)
    return NextResponse.json({ error: "Job not found" }, { status: 404 });

  return NextResponse.json(job);
}
