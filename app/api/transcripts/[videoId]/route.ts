import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, routeGuard } from "@/lib/responses";

export async function GET(_: Request, { params }: { params: Promise<{ videoId: string }> }) {
  return routeGuard(async () => {
    const { videoId } = await params;
    const user = await requireUser();
    const transcript = await prisma.transcript.findFirst({
      where: { videoId, video: { userId: user.id } },
      include: { video: true }
    });
    if (!transcript) return fail("Transcript not found yet.", 404);
    return ok({ transcript });
  });
}
