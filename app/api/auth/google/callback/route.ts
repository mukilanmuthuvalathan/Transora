import { NextResponse } from "next/server";
import { hashPassword, setAuthCookie, signUser } from "@/lib/auth";
import { consumeGoogleState, exchangeGoogleCode, fetchGoogleProfile } from "@/lib/google-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") || "";
  const next = await consumeGoogleState(state);

  if (!code || !next) {
    return redirectWithError(url.origin, "Start Google sign-in from the Login page. This callback URL is only for Google to return you to Transora.");
  }

  try {
    const accessToken = await exchangeGoogleCode(code);
    const profile = await fetchGoogleProfile(accessToken);
    const name = profile.name || profile.given_name || profile.email.split("@")[0];

    const existing = await prisma.user.findFirst({
      where: { OR: [{ googleId: profile.sub }, { email: profile.email }] }
    });
    const user = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: { googleId: profile.sub, authProvider: existing.authProvider === "password" ? "password_google" : "google" },
          select: { id: true, name: true, email: true }
        })
      : await prisma.user.create({
          data: {
            name,
            email: profile.email,
            googleId: profile.sub,
            authProvider: "google",
            passwordHash: await hashPassword(crypto.randomUUID()),
            settings: { create: {} }
          },
          select: { id: true, name: true, email: true }
        });

    await setAuthCookie(signUser(user));
    return NextResponse.redirect(new URL(next, url.origin));
  } catch (error) {
    return redirectWithError(url.origin, error instanceof Error ? error.message : "Google sign-in failed.");
  }
}

function redirectWithError(origin: string, message: string) {
  const loginUrl = new URL("/login", origin);
  loginUrl.searchParams.set("error", message);
  return NextResponse.redirect(loginUrl);
}
