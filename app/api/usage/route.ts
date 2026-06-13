import { NextResponse } from "next/server";
import { getUsageStatus } from "@/lib/usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { deviceId } = (await request.json()) as { deviceId?: string };
    if (!deviceId) {
      return NextResponse.json({ error: "Device ID is required." }, { status: 400 });
    }

    return NextResponse.json(await getUsageStatus(deviceId));
  } catch {
    return NextResponse.json({ error: "Could not load usage." }, { status: 500 });
  }
}
