import { prisma } from "@/lib/prisma";
import { generateSummary } from "@/lib/ai";
import { transcribeUploadLocally, transcribeYouTubeLocally } from "@/lib/local-transcription";
import { fetchYouTubeTranscript } from "@/lib/youtube";
import type { Prisma } from "@prisma/client";

export type Segment = { start: number; end: number; text: string };
type TranscriptionResult = {
  title?: string;
  text?: string;
  srt?: string;
  durationSec?: number;
  segments: Segment[];
  language?: string;
  sourceLanguage?: string;
  originalSegments?: Segment[];
};

export function limitRepeatedWords(text: string, maxRepeat = 2) {
  const words = text.split(/\s+/).filter(Boolean);
  const cleaned: string[] = [];
  let previous = "";
  let count = 0;

  for (const word of words) {
    const key = word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "").toLocaleLowerCase();
    if (key && key === previous) {
      count += 1;
    } else {
      previous = key;
      count = 1;
    }
    if (count <= maxRepeat) cleaned.push(word);
  }

  return cleaned.join(" ");
}

export function toTimestamp(seconds: number) {
  const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  const ms = Math.floor((seconds % 1) * 1000).toString().padStart(3, "0");
  return `${h}:${m}:${s},${ms}`;
}

export function toSrt(segments: Segment[]) {
  return segments.map((segment, index) => `${index + 1}\n${toTimestamp(segment.start)} --> ${toTimestamp(segment.end)}\n${limitRepeatedWords(segment.text)}`).join("\n\n");
}

export async function processVideo(videoId: string) {
  await prisma.video.update({ where: { id: videoId }, data: { status: "PROCESSING" } });
  try {
    const video = await prisma.video.findUniqueOrThrow({ where: { id: videoId } });
    const cached = await findReusableTranscript(video.id, video.sourceUrl, video.language);
    if (cached?.transcript) {
      const cachedSegments = cached.transcript.segments as Prisma.InputJsonValue;
      const originalSegments = cached.transcript.originalSegments as Prisma.InputJsonValue | null;
      await prisma.transcript.upsert({
        where: { videoId },
        create: {
          videoId,
          text: cached.transcript.text,
          segments: cachedSegments,
          srt: cached.transcript.srt,
          sourceLanguage: cached.transcript.sourceLanguage,
          targetLanguage: cached.transcript.targetLanguage,
          originalText: cached.transcript.originalText,
          originalSegments: originalSegments || undefined
        },
        update: {
          text: cached.transcript.text,
          segments: cachedSegments,
          srt: cached.transcript.srt,
          sourceLanguage: cached.transcript.sourceLanguage,
          targetLanguage: cached.transcript.targetLanguage,
          originalText: cached.transcript.originalText,
          originalSegments: originalSegments || undefined
        }
      });
      if (cached.summary) {
        const keyPoints = cached.summary.keyPoints as Prisma.InputJsonValue;
        const notes = cached.summary.notes as Prisma.InputJsonValue;
        const definitions = cached.summary.definitions as Prisma.InputJsonValue;
        await prisma.summary.upsert({
          where: { videoId },
          create: {
            videoId,
            summary: cached.summary.summary,
            keyPoints,
            notes,
            definitions
          },
          update: {
            summary: cached.summary.summary,
            keyPoints,
            notes,
            definitions
          }
        });
      }
      await prisma.video.update({
        where: { id: videoId },
        data: {
          title: cached.title,
          status: "COMPLETED",
          durationSec: cached.durationSec,
          language: video.language,
          error: null
        }
      });
      return;
    }

    const result = await transcribe(video.id, video.title, video.sourceUrl || video.filePath || "", video.sourceType, video.language);
    const segments = result.segments.map((segment) => ({ ...segment, text: limitRepeatedWords(segment.text) }));
    const text = result.text || segments.map((segment) => segment.text).join(" ");
    validateOutputLanguage(text, result.language || video.language);
    const srt = result.srt || toSrt(segments);
    const originalSegments = (result.originalSegments?.length ? result.originalSegments : segments)
      .map((segment) => ({ ...segment, text: limitRepeatedWords(segment.text) }));
    const originalText = originalSegments.map((segment) => segment.text).join("\n");
    await prisma.transcript.upsert({
      where: { videoId },
      create: {
        videoId,
        text,
        segments,
        srt,
        sourceLanguage: result.sourceLanguage || result.language || video.language,
        targetLanguage: result.language || video.language,
        originalText,
        originalSegments
      },
      update: {
        text,
        segments,
        srt,
        sourceLanguage: result.sourceLanguage || result.language || video.language,
        targetLanguage: result.language || video.language,
        originalText,
        originalSegments
      }
    });
    const summary = await generateSummary(text);
    await prisma.summary.upsert({
      where: { videoId },
      create: {
        videoId,
        summary: summary.summary,
        keyPoints: summary.keyPoints,
        notes: summary.notes,
        definitions: summary.definitions
      },
      update: {
        summary: summary.summary,
        keyPoints: summary.keyPoints,
        notes: summary.notes,
        definitions: summary.definitions
      }
    });
    await prisma.video.update({ where: { id: videoId }, data: { title: result.title || video.title, status: "COMPLETED", durationSec: result.durationSec || Math.ceil(segments.at(-1)?.end || 0), error: null } });
  } catch (error) {
    const existingTranscript = await prisma.transcript.findUnique({ where: { videoId }, select: { id: true } });
    await prisma.video.update({
      where: { id: videoId },
      data: {
        status: existingTranscript ? "COMPLETED" : "FAILED",
        error: error instanceof Error ? error.message : "Processing failed"
      }
    });
  }
}

async function findReusableTranscript(videoId: string, sourceUrl: string | null, language: string) {
  if (!sourceUrl) return null;
  return prisma.video.findFirst({
    where: {
      id: { not: videoId },
      sourceUrl,
      language,
      status: "COMPLETED",
      transcript: { is: { targetLanguage: language } }
    },
    orderBy: { updatedAt: "desc" },
    select: {
      title: true,
      durationSec: true,
      transcript: { select: { text: true, segments: true, srt: true, sourceLanguage: true, targetLanguage: true, originalText: true, originalSegments: true } },
      summary: { select: { summary: true, keyPoints: true, notes: true, definitions: true } }
    }
  });
}

async function transcribe(videoId: string, title: string, source: string, sourceType: string, language: string): Promise<TranscriptionResult> {
  if (sourceType === "YOUTUBE" && source) {
    try {
      const captionResult = await fetchYouTubeTranscript(source, language);
      if (captionResult.language !== language) {
        throw new Error(`Requested ${language} output is not available in free mode for this video. Use a YouTube video with reliable ${language} captions, or choose the video's original caption language.`);
      }
      return {
        ...captionResult,
        text: captionResult.segments.map((segment) => segment.text).join(" "),
        srt: toSrt(captionResult.segments)
      };
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Requested ")) throw error;
      if (process.env.USE_LOCAL_TRANSCRIPTION !== "false") {
        const local = await transcribeYouTubeLocally(videoId, source, language);
        if (language !== "en" && local.sourceLanguage && local.sourceLanguage !== language) {
          throw new Error(`Full ${language} output needs a matching ${language} caption or speech source. Use a video with reliable ${language} captions, or choose the detected audio language.`);
        }
        if ((local.language || language) !== language && language !== "en") {
          throw new Error(`Full ${language} output could not be produced in free mode because the detected audio language is ${local.language || "different"}. Use matching ${language} speech or captions.`);
        }
        return local;
      }
      if (process.env.ALLOW_DEMO_TRANSCRIPTS === "false") throw error;
      const message = error instanceof Error ? error.message : "YouTube transcript fetch failed.";
      return demoTranscript(title, `YouTube captions could not be fetched right now: ${message}`);
    }
  }

  if (sourceType === "UPLOAD" && source) {
    if (process.env.USE_LOCAL_TRANSCRIPTION === "false") {
      throw new Error("Uploaded MP4 transcription needs local transcription enabled.");
    }
    const local = await transcribeUploadLocally(videoId, source, title, language);
    if (language !== "en" && local.sourceLanguage && local.sourceLanguage !== language) {
      throw new Error(`Full ${language} output needs matching ${language} speech in the uploaded MP4. Choose the detected audio language or upload a ${language} video.`);
    }
    if ((local.language || language) !== language && language !== "en") {
      throw new Error(`Full ${language} output could not be produced in free mode because the detected audio language is ${local.language || "different"}. Use matching ${language} speech.`);
    }
    return local;
  }

  return demoTranscript(title);
}

function validateOutputLanguage(text: string, language: string) {
  if (language !== "ta") return;
  const tamilChars = text.match(/[\u0B80-\u0BFF]/g)?.length || 0;
  const latinChars = text.match(/[A-Za-z]/g)?.length || 0;
  const otherAsianChars = text.match(/[\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/g)?.length || 0;
  const totalLetters = tamilChars + latinChars + otherAsianChars;
  const tamilRatio = totalLetters ? tamilChars / totalLetters : 0;

  if (tamilChars < 40 || tamilRatio < 0.85 || otherAsianChars > 0) {
    throw new Error("Full Tamil output could not be produced cleanly in free mode for this video. Use a YouTube video with reliable Tamil captions or Tamil speech.");
  }
}

function demoTranscript(title: string, reason = "No speech-to-text provider is configured yet.") {
  const base = [
    `Welcome to ${title || "this video"}. Transora has created a demo transcript because no speech-to-text provider is configured yet.`,
    "The production pipeline is ready to connect to YouTube download, audio extraction, and transcription services.",
    "Students and creators can use the transcript, subtitles, summary, notes, and chat tools to understand the video faster.",
    `Add a reliable caption or speech-to-text provider to replace this demo transcript with real speech recognition output. ${reason}`
  ];
  return { title, segments: base.map((text, index) => ({ start: index * 8, end: index * 8 + 7.5, text })) };
}
