import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const COOKIE = "transora_token";

export type AuthUser = { id: string; email: string; name: string };

function jwtSecret() {
  return process.env.JWT_SECRET || "dev-only-change-me";
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signUser(user: AuthUser) {
  return jwt.sign(user, jwtSecret(), { expiresIn: "7d" });
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, jwtSecret()) as AuthUser;
    return prisma.user.findUnique({ where: { id: payload.id }, select: { id: true, email: true, name: true } });
  } catch {
    return null;
  }
}

export async function getGuestUser() {
  return prisma.user.upsert({
    where: { email: "guest@transora.local" },
    create: {
      name: "Guest User",
      email: "guest@transora.local",
      passwordHash: "guest-access",
      authProvider: "guest",
      settings: { create: {} }
    },
    update: {},
    select: { id: true, email: true, name: true }
  });
}

export async function requireUser() {
  const user = await getCurrentUser();
  return user || getGuestUser();
}
