import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { answerQuestion } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { fail, ok, routeGuard } from "@/lib/responses";

const schema = z.object({ videoId: z.string(), question: z.string().min(2) });

export async function POST(request: Request) {
  return routeGuard(async () => {
    const user = await requireUser();
    const body = schema.safeParse(await request.json());
    if (!body.success) return fail("Choose a video and enter a question.");
    const transcript = await prisma.transcript.findFirst({ where: { videoId: body.data.videoId, video: { userId: user.id } } });
    if (!transcript) return fail("Transcript not found for this video.", 404);
    const answer = await answerQuestion(transcript.text, body.data.question);
    const chat = await prisma.chat.create({ data: { userId: user.id, videoId: body.data.videoId, question: body.data.question, answer } });
    return ok({ chat });
  });
}
