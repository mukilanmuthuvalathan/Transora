import { requireUser } from "@/lib/auth";
import { generateSummary } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { fail, ok, routeGuard } from "@/lib/responses";

export async function POST(_: Request, { params }: { params: Promise<{ videoId: string }> }) {
  return routeGuard(async () => {
    const { videoId } = await params;
    const user = await requireUser();
    const transcript = await prisma.transcript.findFirst({ where: { videoId, video: { userId: user.id } } });
    if (!transcript) return fail("Transcript not found.", 404);
    const result = await generateSummary(transcript.text);
    const summary = await prisma.summary.upsert({
      where: { videoId },
      create: { videoId, summary: result.summary, keyPoints: result.keyPoints, notes: result.notes, definitions: result.definitions },
      update: { summary: result.summary, keyPoints: result.keyPoints, notes: result.notes, definitions: result.definitions }
    });
    return ok({ summary });
  });
}
