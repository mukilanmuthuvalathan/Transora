import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin";
import { currentMonthKey } from "@/lib/usage";
import { listUsageRecords, setUsageCount } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const usage = await listUsageRecords();
  return NextResponse.json(usage);
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { deviceId, count, month } = (await request.json()) as {
    deviceId?: string;
    count?: number;
    month?: string;
  };

  if (!deviceId || typeof count !== "number" || count < 0) {
    return NextResponse.json({ error: "Device ID and count are required." }, { status: 400 });
  }

  const usage = await setUsageCount(deviceId, month ?? currentMonthKey(), Math.floor(count));
  return NextResponse.json(usage);
}
