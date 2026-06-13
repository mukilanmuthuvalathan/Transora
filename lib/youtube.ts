import { execFile } from "child_process";
import { mkdir, readdir, readFile, rm } from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";
import { transcribeYouTubeLocally } from "@/lib/local-transcription";
import type { Segment } from "@/lib/video-processing";

const execFileAsync = promisify(execFile);

type CaptionTrack = {
  baseUrl: string;
  languageCode?: string;
  name?: { simpleText?: string; runs?: Array<{ text: string }> };
};

type CaptionEvent = {
  segs?: Array<{ utf8?: string }>;
  tStartMs?: number;
  dDurationMs?: number;
};

export type YouTubeTranscriptResult = {
  title: string;
  segments: Segment[];
  language: string;
  sourceLanguage: string;
  originalSegments?: Segment[];
};

export function extractYouTubeId(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) return parsed.pathname.replace("/", "");
    if (parsed.searchParams.get("v")) return parsed.searchParams.get("v");
    const shorts = parsed.pathname.match(/\/shorts\/([^/?]+)/);
    if (shorts) return shorts[1];
  } catch {
    return null;
  }
  return null;
}

export async function fetchYouTubeTranscript(url: string, preferredLanguage = "en"): Promise<YouTubeTranscriptResult> {
  const videoId = extractYouTubeId(url);
  if (!videoId) throw new Error("Invalid YouTube URL.");
  const language = preferredLanguage === "ta" ? "ta" : "en";

  if (process.env.YOUTUBE_CAPTION_FIRST !== "false") {
    const captionResult = await fetchCaptionTranscript(url, videoId, language).catch(() => null);
    if (captionResult?.segments.length) return captionResult;
  }

  try {
    const local = await transcribeYouTubeLocally(videoId, url, language);
    if (!local.segments.length) throw new Error("Whisper finished without readable transcript text.");

    return {
      title: local.title || "YouTube Audio Transcript",
      segments: local.segments,
      language,
      sourceLanguage: local.sourceLanguage || language,
      originalSegments: local.originalSegments?.length ? local.originalSegments : local.segments
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Local audio transcription failed.";
    throw new Error(`Audio transcription failed. ${message}`);
  }
}

async function fetchCaptionTranscript(url: string, videoId: string, preferredLanguage: string): Promise<YouTubeTranscriptResult> {
  const signal = AbortSignal.timeout(Number(process.env.YOUTUBE_FETCH_TIMEOUT_MS || 3500));

  try {
    const watch = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent": "Mozilla/5.0 Transora/1.0"
      },
      cache: "no-store",
      signal
    });
    if (!watch.ok) throw new Error("Could not open the YouTube video page.");

    const html = await watch.text();
    const title = decodeHtml(html.match(/<title>(.*?)<\/title>/i)?.[1]?.replace(" - YouTube", "") || "YouTube video");
    const response = extractPlayerResponse(html);
    const tracks = response?.captions?.playerCaptionsTracklistRenderer?.captionTracks as CaptionTrack[] | undefined;
    const selected = tracks?.length ? pickPreferredTrack(tracks, preferredLanguage) : null;
    if (!selected) throw new Error("No matching captions.");

    const captionUrl = new URL(selected.baseUrl);
    captionUrl.searchParams.set("fmt", "json3");
    const captions = await fetch(captionUrl.toString(), { cache: "no-store", signal });
    if (!captions.ok) throw new Error("Could not download captions.");

    const segments = await parseCaptionText(await captions.text(), selected.baseUrl, signal);
    if (!segments.length) throw new Error("No readable captions.");

    return {
      title,
      segments,
      language: normalizeLanguage(selected.languageCode || preferredLanguage),
      sourceLanguage: normalizeLanguage(selected.languageCode || preferredLanguage),
      originalSegments: segments
    };
  } catch {
    return fetchYouTubeTranscriptWithYtDlp(url, preferredLanguage);
  }
}

async function parseCaptionText(captionText: string, baseUrl: string, signal: AbortSignal) {
  let segments: Segment[] = [];

  if (captionText.trim().startsWith("{")) {
    const json = JSON.parse(captionText);
    segments = jsonToSegments(json);
  }

  if (!segments.length) {
    const vttUrl = new URL(baseUrl);
    vttUrl.searchParams.set("fmt", "vtt");
    const vtt = await fetch(vttUrl.toString(), { cache: "no-store", signal });
    if (vtt.ok) {
      const vttText = await vtt.text();
      segments = vttToSegments(vttText);
      if (!segments.length) segments = xmlToSegments(vttText);
    }
  }

  if (!segments.length) segments = xmlToSegments(captionText);
  return segments;
}

async function fetchYouTubeTranscriptWithYtDlp(url: string, preferredLanguage: string) {
  const dir = await makeCaptionDir();
  try {
    const subLangs = captionLanguageCandidates(preferredLanguage).join(",");
    await execFileAsync(pythonBin(), [
      "-m",
      "yt_dlp",
      "--skip-download",
      "--write-subs",
      "--write-auto-subs",
      "--sub-langs",
      subLangs,
      "--sub-format",
      "json3",
      "-o",
      path.join(dir, "caption.%(ext)s"),
      url
    ], {
      timeout: Number(process.env.YTDLP_CAPTION_TIMEOUT_MS || 60_000),
      maxBuffer: 1024 * 1024 * 20,
      windowsHide: true
    }).catch(() => null);

    const files = (await readdir(dir)).filter((file) => file.endsWith(".json3"));
    const original = pickOriginalCaptionFile(files);
    const selected = pickCaptionFile(files, preferredLanguage, original);
    if (!selected) {
      return {
        title: "YouTube video",
        segments: [],
        language: normalizeLanguage(preferredLanguage),
        sourceLanguage: "auto",
        originalSegments: []
      };
    }

    const json = JSON.parse(await readFile(path.join(dir, selected), "utf8"));
    const originalJson = original ? JSON.parse(await readFile(path.join(dir, original), "utf8")) : json;
    const language = languageFromCaptionFile(selected) || preferredLanguage;
    const sourceLanguage = languageFromCaptionFile(original || selected) || language;
    return {
      title: "YouTube video",
      segments: jsonToSegments(json),
      language,
      sourceLanguage,
      originalSegments: jsonToSegments(originalJson)
    };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => null);
  }
}

async function makeCaptionDir() {
  const dir = path.join(os.tmpdir(), `transora-captions-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(dir, { recursive: true });
  return dir;
}

function captionLanguageCandidates(language: string) {
  const base = language.split("-")[0] || "en";
  return Array.from(new Set([
    ".*-orig",
    `${base}-orig`,
    language,
    base,
    `${base}-en`,
    `${base}-ta`,
    `${base}-hi`,
    `${base}-.*`,
    "en",
    "ta",
    "hi",
    "es",
    "fr"
  ]));
}

function pickCaptionFile(files: string[], preferredLanguage: string, original?: string) {
  const candidates = captionLanguageCandidates(preferredLanguage);
  return candidates.flatMap((language) => [
    files.find((file) => file.includes(`.${language}.`)),
    files.find((file) => file.includes(`.${language}-`))
  ]).find(Boolean) || original || files[0];
}

function pickOriginalCaptionFile(files: string[]) {
  return files.find((file) => file.includes("-orig.")) || files[0];
}

function languageFromCaptionFile(file: string) {
  const match = file.match(/\.([a-z]{2,3}(?:-[A-Za-z]+)?)\.json3$/);
  return match ? normalizeLanguage(match[1]) : null;
}

function normalizeLanguage(language: string) {
  return language.replace("-orig", "").split("-")[0] || "auto";
}

function pythonBin() {
  return process.env.PYTHON_BIN || "python";
}

function jsonToSegments(json: { events?: CaptionEvent[] }) {
  return (json.events || [])
    .filter((event): event is CaptionEvent & { segs: Array<{ utf8?: string }>; tStartMs: number } => Boolean(event.segs?.length && typeof event.tStartMs === "number"))
    .map((event) => {
      const text = event.segs.map((seg) => seg.utf8 || "").join("").replace(/\s+/g, " ").trim();
      const start = event.tStartMs / 1000;
      const duration = (event.dDurationMs || 2500) / 1000;
      return { start, end: start + duration, text };
    })
    .filter((segment: Segment) => segment.text);
}

function vttToSegments(vtt: string) {
  const blocks = vtt.split(/\n\s*\n/);
  const segments: Segment[] = [];

  for (const block of blocks) {
    const lines = block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const timeLine = lines.find((line) => line.includes("-->"));
    if (!timeLine) continue;
    const [startRaw, endRaw] = timeLine.split("-->").map((value) => value.trim().split(" ")[0]);
    const text = lines
      .filter((line) => !line.includes("-->") && !line.startsWith("WEBVTT") && !/^\d+$/.test(line))
      .join(" ")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) continue;
    segments.push({ start: parseTime(startRaw), end: parseTime(endRaw), text });
  }

  return segments;
}

function parseTime(value: string) {
  const parts = value.replace(",", ".").split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number(value) || 0;
}

function xmlToSegments(xml: string) {
  const segments: Segment[] = [];
  const textPattern = /<text\b([^>]*)>([\s\S]*?)<\/text>/g;
  let match: RegExpExecArray | null;

  while ((match = textPattern.exec(xml)) !== null) {
    const attrs = match[1];
    const start = Number(attrs.match(/\bstart="([^"]+)"/)?.[1] || 0);
    const duration = Number(attrs.match(/\bdur="([^"]+)"/)?.[1] || 2.5);
    const text = decodeHtml(match[2])
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (text) segments.push({ start, end: start + duration, text });
  }

  return segments;
}

function pickPreferredTrack(tracks: CaptionTrack[], preferredLanguage: string) {
  return tracks.find((track) => track.languageCode === preferredLanguage)
    || tracks.find((track) => track.languageCode?.startsWith(preferredLanguage.split("-")[0]));
}

function pickOriginalTrack(tracks: CaptionTrack[]) {
  return tracks.find((track) => track.languageCode?.endsWith("-orig"))
    || tracks.find((track) => {
      const label = track.name?.simpleText || track.name?.runs?.map((run) => run.text).join("") || "";
      return /original/i.test(label);
    })
    || tracks[0];
}

function extractPlayerResponse(html: string) {
  const marker = "ytInitialPlayerResponse = ";
  const start = html.indexOf(marker);
  if (start === -1) return null;
  const jsonStart = start + marker.length;
  const jsonEnd = findJsonEnd(html, jsonStart);
  if (jsonEnd === -1) return null;
  try {
    return JSON.parse(html.slice(jsonStart, jsonEnd + 1));
  } catch {
    return null;
  }
}

function findJsonEnd(input: string, start: number) {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < input.length; index += 1) {
    const char = input[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === "\"") {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return -1;
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
