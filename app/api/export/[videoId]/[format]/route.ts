import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { docxBuffer, pdfBuffer } from "@/lib/exports";
import { prisma } from "@/lib/prisma";
import { fail, routeGuard } from "@/lib/responses";

export async function GET(_: Request, { params }: { params: Promise<{ videoId: string; format: string }> }) {
  return routeGuard(async () => {
    const { videoId, format: requestedFormat } = await params;
    const user = await requireUser();
    const transcript = await prisma.transcript.findFirst({
      where: { videoId, video: { userId: user.id } },
      include: { video: true }
    });
    if (!transcript) return fail("Transcript not found.", 404);
    const filename = transcript.video.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    const format = requestedFormat.toLowerCase();

    if (format === "srt") return file(transcript.srt, `${filename}.srt`, "application/x-subrip");
    if (format === "txt") return file(transcript.text, `${filename}.txt`, "text/plain");
    if (format === "pdf") return file(pdfBuffer(transcript.video.title, transcript.text), `${filename}.pdf`, "application/pdf");
    if (format === "docx") return file(await docxBuffer(transcript.video.title, transcript.text), `${filename}.docx`, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    return fail("Unsupported export format.", 400);
  });
}

function file(body: BodyInit, name: string, type: string) {
  const safeName = name || "transora-transcript.txt";
  return new NextResponse(body, {
    headers: {
      "Content-Type": type,
      "Content-Disposition": `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
      "Cache-Control": "no-store"
    }
  });
}
