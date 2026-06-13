import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, routeGuard } from "@/lib/responses";
import { processVideo } from "@/lib/video-processing";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  return routeGuard(async () => {
    const { id } = await params;
    const user = await requireUser();
    const video = await prisma.video.findFirst({ where: { id, userId: user.id } });
    if (!video) return fail("Video not found.", 404);
    await prisma.video.update({ where: { id: video.id }, data: { status: "QUEUED", error: null } });
    processVideo(video.id).catch(console.error);
    return ok({ success: true });
  });
}
