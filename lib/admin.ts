import { NextRequest } from "next/server";

export function isAdminPassword(value: unknown) {
  const configured = process.env.ADMIN_PASSWORD;
  return typeof value === "string" && Boolean(configured) && value === configured;
}

export function isAdminRequest(request: NextRequest) {
  return isAdminPassword(request.headers.get("x-admin-password"));
}
