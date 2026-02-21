import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const installationId = searchParams.get("installation_id");
  const setupAction = searchParams.get("setup_action"); // "install" | "update"

  if (!installationId) {
    return NextResponse.redirect(`${origin}/dashboard?error=missing_installation`);
  }

  // Store installation_id in the session/cookie for use during project creation
  const response = NextResponse.redirect(
    `${origin}/dashboard?installation_id=${installationId}&setup_action=${setupAction ?? "install"}`
  );

  return response;
}
