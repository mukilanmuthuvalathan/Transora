import { execFile } from "child_process";
import { mkdir, readdir, readFile, rm } from "fs/promises";
import path from "path";
import { promisify } from "util";
import { cleanTranscriptSegments } from "@/lib/transcript-cleaner";
import type { Segment } from "@/lib/video-processing";

const execFileAsync = promisify(execFile);

type FastWhisperOutput = {
  duration?: number;
  language?: string;
  segments: Segment[];
};

export async function transcribeYouTubeLocally(videoId: string, url: string, language: string) {
  const dir = path.resolve(process.env.UPLOAD_DIR || "uploads", videoId);
  await mkdir(dir, { recursive: true });
  await cleanup(dir);

  const sourceTemplate = path.join(dir, "source.%(ext)s");
  await run(pythonBin(), [
    "-m",
    "yt_dlp",
    "--js-runtimes",
    "node",
    "--remote-components",
    "ejs:github",
    "--extractor-args",
    "youtube:player_client=web",
    "--no-playlist",
    "-f",
    "bestaudio[ext=m4a]/bestaudio/best",
    "-o",
    sourceTemplate,
    url
  ], 240_000);

  const source = await findDownloadedAudio(dir);
  const result = await transcribeMediaFile(dir, source, language);
  return {
    title: "YouTube Audio Transcript",
    ...result
  };
}

export async function transcribeUploadLocally(videoId: string, filePath: string, title: string, language: string) {
  const dir = path.resolve(process.env.UPLOAD_DIR || "uploads", videoId);
  await mkdir(dir, { recursive: true });
  await cleanup(dir);

  const result = await transcribeMediaFile(dir, filePath, language);
  return {
    title,
    ...result
  };
}

async function cleanup(dir: string) {
  for (const file of await readdir(dir).catch(() => [])) {
    if (/^(source|speech16|fast|whisper)\./.test(file)) {
      await rm(path.join(dir, file), { force: true });
    }
  }
}

async function findDownloadedAudio(dir: string) {
  const files = await readdir(dir);
  const source = files.find((file) => file.startsWith("source.") && !file.endsWith(".part"));
  if (!source) throw new Error("YouTube audio download did not produce an audio file.");
  return path.join(dir, source);
}

async function transcribeMediaFile(dir: string, source: string, language: string) {
  const speech = path.join(dir, "speech16.wav");
  await run(ffmpegBin(), ["-y", "-i", source, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", speech], 120_000);

  const script = path.resolve("scripts", "faster_transcribe.py");
  const task = "transcribe";
  const transcribeLanguage = process.env.LOCAL_WHISPER_LANGUAGE || language || "auto";
  await run(pythonBin(), [script, speech, dir, transcribeLanguage, task], Number(process.env.LOCAL_WHISPER_TIMEOUT_MS || 1_800_000));

  const text = (await readFile(path.join(dir, "fast.txt"), "utf8")).trim();
  const srt = (await readFile(path.join(dir, "fast.srt"), "utf8")).trim();
  const data = JSON.parse(await readFile(path.join(dir, "fast.json"), "utf8")) as FastWhisperOutput;
  const segments = cleanTranscriptSegments(
    data.segments.filter((segment) => segment.text?.trim()),
    language
  );
  if (!segments.length || !text) throw new Error("Local transcription finished without readable text.");

  return {
    text: segments.map((segment) => segment.text).join("\n"),
    srt: toSrt(segments),
    segments,
    language,
    sourceLanguage: data.language || transcribeLanguage || "auto",
    originalSegments: segments,
    durationSec: Math.ceil(data.duration || segments.at(-1)?.end || 0)
  };
}

async function run(command: string, args: string[], timeout: number) {
  try {
    await execFileAsync(command, args, {
      timeout,
      maxBuffer: 1024 * 1024 * 20,
      windowsHide: true,
      env: { ...process.env, PATH: `${path.dirname(ffmpegBin())};${process.env.PATH || ""}` }
    });
  } catch (error) {
    const details = error as Error & { stderr?: string; stdout?: string };
    const raw = [details.stderr, details.stdout, details.message].filter(Boolean).join("\n");
    throw new Error(cleanCommandError(raw, path.basename(command)));
  }
}

function cleanCommandError(raw: string, command: string) {
  if (/not available|video unavailable|private video|removed/i.test(raw)) {
    return "This YouTube video is not available. Please check the URL or try another public video.";
  }
  if (/No supported JavaScript runtime|js-runtimes|EJS/i.test(raw)) {
    return "YouTube audio could not be downloaded because the JavaScript runtime was not found. Please make sure Node.js is installed and restart localhost.";
  }
  if (/ffmpeg/i.test(raw)) {
    return "Audio conversion failed. Please make sure FFmpeg is installed correctly.";
  }
  if (/faster[_-]?whisper|WhisperModel|No module named/i.test(raw)) {
    return "Speech-to-text failed. Please make sure faster-whisper is installed correctly.";
  }
  return `${command} failed while processing this video. Please try another public YouTube video.`;
}

function pythonBin() {
  return process.env.PYTHON_BIN || "python";
}

function ffmpegBin() {
  return process.env.FFMPEG_PATH
    || "C:\\Users\\mukil\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.1-full_build\\bin\\ffmpeg.exe";
}

function toSrt(segments: Segment[]) {
  return segments.map((segment, index) => {
    return `${index + 1}\n${toTimestamp(segment.start)} --> ${toTimestamp(segment.end)}\n${segment.text}`;
  }).join("\n\n");
}

function toTimestamp(seconds: number) {
  const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  const ms = Math.floor((seconds % 1) * 1000).toString().padStart(3, "0");
  return `${h}:${m}:${s},${ms}`;
}
