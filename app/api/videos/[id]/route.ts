import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, routeGuard } from "@/lib/responses";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  return routeGuard(async () => {
    const { id } = await params;
    const user = await requireUser();
    const video = await prisma.video.findFirst({
      where: { id, userId: user.id },
      include: { transcript: true, summary: true, chats: { orderBy: { createdAt: "asc" } } }
    });
    if (!video) return fail("Video not found.", 404);
    return ok({ video });
  });
}
