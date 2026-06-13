import { cookies } from "next/headers";

const STATE_COOKIE = "transora_google_state";

type GoogleTokenResponse = {
  access_token?: string;
  id_token?: string;
  error?: string;
};

type GoogleProfile = {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
};

export function googleConfigured() {
  return Boolean(validGoogleClientId(process.env.GOOGLE_CLIENT_ID) && validCredential(process.env.GOOGLE_CLIENT_SECRET));
}

export function googleRedirectUri() {
  return `${appUrl()}/api/auth/google/callback`;
}

export async function createGoogleState(next: string) {
  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, JSON.stringify({ state, next }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10
  });
  return state;
}

export async function consumeGoogleState(state: string) {
  const cookieStore = await cookies();
  const value = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as { state?: string; next?: string };
    if (parsed.state !== state) return null;
    return parsed.next?.startsWith("/") ? parsed.next : "/dashboard";
  } catch {
    return null;
  }
}

export function googleAuthUrl(state: string) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID || "");
  url.searchParams.set("redirect_uri", googleRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("access_type", "online");
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

export async function exchangeGoogleCode(code: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      code,
      grant_type: "authorization_code",
      redirect_uri: googleRedirectUri()
    })
  });
  const token = await response.json() as GoogleTokenResponse;
  if (!response.ok || !token.access_token) {
    throw new Error(token.error || "Google sign-in failed.");
  }
  return token.access_token;
}

export async function fetchGoogleProfile(accessToken: string) {
  const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) throw new Error("Could not read your Google profile.");

  const profile = await response.json() as GoogleProfile;
  if (!profile.sub || !profile.email || profile.email_verified === false) {
    throw new Error("Google account email could not be verified.");
  }
  return profile;
}

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

function validCredential(value?: string) {
  if (!value) return false;
  const trimmed = value.trim();
  const normalized = trimmed.toLowerCase();
  return Boolean(
    trimmed
    && !normalized.startsWith("your-")
    && !normalized.includes("replace")
    && !normalized.includes("real value")
    && !normalized.includes("@gmail.com")
  );
}

function validGoogleClientId(value?: string) {
  return validCredential(value) && value?.trim().endsWith(".apps.googleusercontent.com");
}
