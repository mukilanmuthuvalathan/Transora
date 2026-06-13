import { NextResponse } from "next/server";
import { getPremiumDevice, redeemPremiumCode } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { deviceId, code } = (await request.json()) as {
      deviceId?: string;
      code?: string;
    };

    if (!deviceId) {
      return NextResponse.json({ error: "Device ID is required." }, { status: 400 });
    }

    if (!code) {
      const premium = await getPremiumDevice(deviceId);
      const active =
        Boolean(premium?.active) &&
        (!premium?.expiresAt || premium.expiresAt.getTime() > Date.now());
      return NextResponse.json({ active });
    }

    const premiumCode = await redeemPremiumCode(code.trim().toUpperCase(), deviceId);
    if (!premiumCode) {
      return NextResponse.json({ error: "Premium code is invalid or already used." }, { status: 400 });
    }

    return NextResponse.json({ active: true });
  } catch {
    return NextResponse.json({ error: "Could not activate premium." }, { status: 500 });
  }
}
