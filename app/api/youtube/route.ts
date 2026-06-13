import { NextResponse } from "next/server";
import { createVideo } from "@/lib/store";
import { getUsageStatus, incrementUsage } from "@/lib/usage";
import { fetchYouTubeTranscript } from "@/lib/youtube";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { url, deviceId, language } = (await request.json()) as {
      url?: string;
      deviceId?: string;
      language?: "en" | "ta";
    };
    if (!url || !deviceId) {
      return NextResponse.json({ error: "YouTube URL and device ID are required." }, { status: 400 });
    }

    const usage = await getUsageStatus(deviceId);
    if (!usage.premiumActive && usage.count >= usage.limit) {
      return NextResponse.json(
        { error: "This device has used all 10 free videos for the month." },
        { status: 429 }
      );
    }

    const transcript = await fetchYouTubeTranscript(url, language === "ta" ? "ta" : "en");
    const transcriptText = transcript.segments.map((segment) => {
      const minutes = Math.floor(segment.start / 60).toString().padStart(2, "0");
      const seconds = Math.floor(segment.start % 60).toString().padStart(2, "0");
      return `[${minutes}:${seconds}] ${segment.text}`;
    }).join("\n");

    await createVideo(url, transcriptText);
    const updatedUsage = await incrementUsage(deviceId);

    return new Response(transcriptText, {
      status: 200,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "x-usage-count": String(updatedUsage.count)
      }
    });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Could not create transcript.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
