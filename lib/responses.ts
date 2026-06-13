import { NextResponse } from "next/server";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function routeGuard<T>(handler: () => Promise<T>) {
  try {
    return await handler();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return fail(message, message === "Unauthorized" ? 401 : 500);
  }
}
