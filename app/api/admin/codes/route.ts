import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin";
import { premiumExpiresAt } from "@/lib/premium";
import { createPremiumCode, listPremiumCodes } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function createCode() {
  return `TR-${randomBytes(6).toString("hex").toUpperCase()}`;
}

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const codes = await listPremiumCodes();
  return NextResponse.json(codes);
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { expiresAt } = (await request.json().catch(() => ({}))) as { expiresAt?: string };
  const code = await createPremiumCode(createCode(), expiresAt ? new Date(expiresAt) : premiumExpiresAt());

  return NextResponse.json(code, { status: 201 });
}
