import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, routeGuard } from "@/lib/responses";

export async function GET() {
  return routeGuard(async () => {
    const user = await requireUser();
    const settings = await prisma.setting.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} });
    return ok({ settings });
  });
}

export async function PATCH(request: Request) {
  return routeGuard(async () => {
    const user = await requireUser();
    const body = await request.json();
    const settings = await prisma.setting.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        preferredLanguage: body.preferredLanguage || "en",
        autoGenerateNotes: body.autoGenerateNotes ?? true,
        exportFormat: body.exportFormat || "txt"
      },
      update: {
        preferredLanguage: body.preferredLanguage,
        autoGenerateNotes: body.autoGenerateNotes,
        exportFormat: body.exportFormat
      }
    });
    return ok({ settings });
  });
}
