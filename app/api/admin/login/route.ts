import { NextResponse } from "next/server";
import { isAdminPassword } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { password } = (await request.json().catch(() => ({}))) as { password?: string };
  if (!isAdminPassword(password)) {
    return NextResponse.json({ error: "Invalid admin password." }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
