import { getCurrentUser, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, routeGuard } from "@/lib/responses";

export async function GET() {
  return routeGuard(async () => {
    const user = await getCurrentUser();
    return ok({ user });
  });
}

export async function PATCH(request: Request) {
  return routeGuard(async () => {
    const user = await requireUser();
    const body = await request.json();
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { name: String(body.name || user.name) },
      select: { id: true, name: true, email: true }
    });
    return ok({ user: updated });
  });
}
