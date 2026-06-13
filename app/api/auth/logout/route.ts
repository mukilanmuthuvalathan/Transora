import { clearAuthCookie } from "@/lib/auth";
import { ok } from "@/lib/responses";

export async function POST() {
  await clearAuthCookie();
  return ok({ success: true });
}
