const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const [videoId, captionFile, language = "ta", sourceLanguage = language] = process.argv.slice(2);

function stamp(seconds) {
  const totalMs = Math.round(seconds * 1000);
  const hours = String(Math.floor(totalMs / 3_600_000)).padStart(2, "0");
  const minutes = String(Math.floor((totalMs % 3_600_000) / 60_000)).padStart(2, "0");
  const secs = String(Math.floor((totalMs % 60_000) / 1000)).padStart(2, "0");
  const ms = String(totalMs % 1000).padStart(3, "0");
  return `${hours}:${minutes}:${secs},${ms}`;
}

function clean(text, maxRepeat = 2) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const out = [];
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
    if (count <= maxRepeat) out.push(word);
  }

  return out.join(" ");
}

function segmentsFromJson3(file) {
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  return (json.events || [])
    .filter((event) => event.segs?.length && typeof event.tStartMs === "number")
    .map((event) => {
      const text = clean(event.segs.map((segment) => segment.utf8 || "").join("").replace(/\s+/g, " ").trim());
      const start = event.tStartMs / 1000;
      const end = (event.tStartMs + (event.dDurationMs || 2500)) / 1000;
      return { start, end, text };
    })
    .filter((segment) => segment.text && !segment.text.startsWith("["));
}

async function main() {
  if (!videoId || !captionFile) {
    throw new Error("Usage: node scripts/save_youtube_caption.cjs <videoId> <caption.json3> [language]");
  }

  const segments = segmentsFromJson3(path.resolve(captionFile));
  if (!segments.length) throw new Error("Caption file did not contain readable text.");

  const text = segments.map((segment) => segment.text).join("\n");
  const srt = segments
    .map((segment, index) => `${index + 1}\n${stamp(segment.start)} --> ${stamp(segment.end)}\n${segment.text}`)
    .join("\n\n");
  const points = segments.slice(0, 6).map((segment) => segment.text);

  await prisma.transcript.upsert({
    where: { videoId },
    create: {
      videoId,
      text,
      segments,
      srt,
      sourceLanguage,
      targetLanguage: language,
      originalText: text,
      originalSegments: segments
    },
    update: {
      text,
      segments,
      srt,
      sourceLanguage,
      targetLanguage: language,
      originalText: text,
      originalSegments: segments
    }
  });
  await prisma.summary.upsert({
    where: { videoId },
    create: {
      videoId,
      summary: points.join(" "),
      keyPoints: points,
      notes: points.map((point, index) => `குறிப்பு ${index + 1}: ${point}`),
      definitions: [
        { term: "வசனம்", definition: "ஒலியுடன் நேரம் பொருந்திய உரை." },
        { term: "தமிழ் வெளியீடு", definition: "பயனர் தேர்ந்தெடுத்த தமிழில் உருவாக்கப்பட்ட உரை மற்றும் subtitle." }
      ]
    },
    update: {
      summary: points.join(" "),
      keyPoints: points,
      notes: points.map((point, index) => `குறிப்பு ${index + 1}: ${point}`),
      definitions: [
        { term: "வசனம்", definition: "ஒலியுடன் நேரம் பொருந்திய உரை." },
        { term: "தமிழ் வெளியீடு", definition: "பயனர் தேர்ந்தெடுத்த தமிழில் உருவாக்கப்பட்ட உரை மற்றும் subtitle." }
      ]
    }
  });
  await prisma.video.update({
    where: { id: videoId },
    data: {
      title: language === "ta" ? "YouTube Captions - Tamil" : "YouTube Captions",
      language,
      status: "COMPLETED",
      durationSec: Math.ceil(segments.at(-1)?.end || 0),
      error: null
    }
  });

  console.log(JSON.stringify({ saved: true, segments: segments.length, chars: text.length, first: segments.slice(0, 4) }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
