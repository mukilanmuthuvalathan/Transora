import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, routeGuard } from "@/lib/responses";
import { processVideo } from "@/lib/video-processing";

export async function GET() {
  return routeGuard(async () => {
    const user = await requireUser();
    const videos = await prisma.video.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { transcript: true, summary: true }
    });
    return ok({ videos });
  });
}

export async function POST(request: Request) {
  return routeGuard(async () => {
    const user = await requireUser();
    const form = await request.formData();
    const url = String(form.get("url") || "").trim();
    const language = String(form.get("language") || "en");
    const file = form.get("file");
    if (!url && !(file instanceof File)) return fail("Paste a YouTube link or upload an MP4 file.");

    let filePath: string | undefined;
    let title = url ? "YouTube video" : "Uploaded video";
    if (file instanceof File) {
      if (!file.type.includes("mp4") && !file.name.toLowerCase().endsWith(".mp4")) return fail("Only MP4 uploads are supported.");
      const uploadDir = path.resolve(process.env.UPLOAD_DIR || "uploads");
      await mkdir(uploadDir, { recursive: true });
      filePath = path.join(uploadDir, `${Date.now()}-${file.name.replace(/[^a-z0-9.-]/gi, "_")}`);
      await writeFile(filePath, Buffer.from(await file.arrayBuffer()));
      title = file.name;
    }

    const video = await prisma.video.create({
      data: {
        userId: user.id,
        title,
        sourceType: url ? "YOUTUBE" : "UPLOAD",
        sourceUrl: url || undefined,
        filePath,
        language,
        status: "QUEUED"
      }
    });

    processVideo(video.id).catch(console.error);
    return ok({ video }, { status: 201 });
  });
}
