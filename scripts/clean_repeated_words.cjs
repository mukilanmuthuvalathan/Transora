const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const videoId = process.argv[2];

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

function stamp(seconds) {
  const totalMs = Math.round(seconds * 1000);
  const hours = String(Math.floor(totalMs / 3_600_000)).padStart(2, "0");
  const minutes = String(Math.floor((totalMs % 3_600_000) / 60_000)).padStart(2, "0");
  const secs = String(Math.floor((totalMs % 60_000) / 1000)).padStart(2, "0");
  const ms = String(totalMs % 1000).padStart(3, "0");
  return `${hours}:${minutes}:${secs},${ms}`;
}

async function main() {
  if (!videoId) throw new Error("Usage: node scripts/clean_repeated_words.cjs <videoId>");
  const transcript = await prisma.transcript.findUnique({ where: { videoId } });
  if (!transcript) throw new Error("Transcript not found");

  const segments = transcript.segments.map((segment) => ({
    ...segment,
    text: clean(segment.text)
  }));
  const text = segments.map((segment) => segment.text).join("\n");
  const srt = segments
    .map((segment, index) => `${index + 1}\n${stamp(segment.start)} --> ${stamp(segment.end)}\n${segment.text}`)
    .join("\n\n");

  await prisma.transcript.update({ where: { videoId }, data: { text, segments, srt } });
  const points = segments.slice(0, 6).map((segment) => segment.text);
  await prisma.summary.update({
    where: { videoId },
    data: {
      summary: points.join(" "),
      keyPoints: points,
      notes: points.map((point, index) => `குறிப்பு ${index + 1}: ${point}`)
    }
  }).catch(() => null);

  console.log(JSON.stringify({ cleaned: true, segments: segments.length, chars: text.length }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
