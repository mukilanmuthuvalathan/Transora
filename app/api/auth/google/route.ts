import { NextResponse } from "next/server";
import { createGoogleState, googleAuthUrl, googleConfigured } from "@/lib/google-auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next")?.startsWith("/") ? url.searchParams.get("next") || "/dashboard" : "/dashboard";

  if (!googleConfigured()) {
    const registerUrl = new URL("/register", url.origin);
    registerUrl.searchParams.set("next", next);
    return NextResponse.redirect(registerUrl);
  }

  const state = await createGoogleState(next);
  return NextResponse.redirect(googleAuthUrl(state));
}
