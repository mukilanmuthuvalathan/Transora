import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin";
import { currentMonthKey } from "@/lib/usage";
import { listCurrentDevices, upsertPremiumDevice } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const month = currentMonthKey();
  const { usageRows, premiumRows } = await listCurrentDevices(month);

  const devices = new Map<
    string,
    { deviceId: string; premiumActive: boolean; expiresAt: string | null; usageCount: number }
  >();

  for (const row of usageRows) {
    devices.set(row.deviceId, {
      deviceId: row.deviceId,
      premiumActive: false,
      expiresAt: null,
      usageCount: row.count
    });
  }

  for (const premium of premiumRows) {
    const premiumActive =
      premium.active && (!premium.expiresAt || premium.expiresAt.getTime() > Date.now());
    const existing = devices.get(premium.deviceId);
    devices.set(premium.deviceId, {
      deviceId: premium.deviceId,
      premiumActive,
      expiresAt: premium.expiresAt?.toISOString() ?? null,
      usageCount: existing?.usageCount ?? 0
    });
  }

  return NextResponse.json([...devices.values()]);
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { deviceId, active, expiresAt } = (await request.json()) as {
    deviceId?: string;
    active?: boolean;
    expiresAt?: string;
  };

  if (!deviceId || typeof active !== "boolean") {
    return NextResponse.json({ error: "Device ID and active status are required." }, { status: 400 });
  }

  const parsedExpiresAt = expiresAt ? new Date(expiresAt) : null;
  await upsertPremiumDevice(deviceId, active, parsedExpiresAt);

  return NextResponse.json({ ok: true });
}
