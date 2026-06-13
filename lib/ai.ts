export type SummaryResult = {
  summary: string;
  keyPoints: string[];
  notes: string[];
  definitions: { term: string; definition: string }[];
};

export async function generateSummary(transcript: string): Promise<SummaryResult> {
  return fallbackSummary(transcript);
}

export async function answerQuestion(transcript: string, question: string) {
  return `Based on this video's transcript, the best short answer is: ${fallbackAnswer(transcript, question)}`;
}

function fallbackSummary(text: string): SummaryResult {
  const sentences = text.split(/[.!?।。]/).map((s) => s.trim()).filter(Boolean);
  const picked = sentences.slice(0, 4);
  return {
    summary: picked.join(". ") || "This video has been processed and is ready for review.",
    keyPoints: picked.length ? picked : ["Review the transcript to identify the strongest learning points."],
    notes: picked.map((item, index) => `Note ${index + 1}: ${item}`),
    definitions: [
      { term: "Transcript", definition: "A written version of spoken words from the video." },
      { term: "Subtitle", definition: "Timed text that can appear while the video plays." }
    ]
  };
}

function fallbackAnswer(transcript: string, question: string) {
  const stopWords = new Set([
    "what",
    "about",
    "video",
    "this",
    "that",
    "tell",
    "explain",
    "இந்த",
    "வீடியோவில்",
    "பற்றி",
    "என்ன",
    "சொல்கிறார்"
  ]);
  const terms = question.toLocaleLowerCase()
    .match(/[\p{L}\p{M}\p{N}]+/gu)
    ?.filter((word) => word.length > 2 && !stopWords.has(word)) || [];
  const lines = transcript.split(/\r?\n|[.!?।。]/).map((line) => line.trim()).filter(Boolean);
  const ranked = lines.map((line, index) => {
    const normalized = line.toLocaleLowerCase();
    const score = terms.reduce((total, term) => total + (normalized.includes(term) ? term.length : 0), 0);
    return { index, line, score };
  }).sort((a, b) => b.score - a.score);
  const best = ranked.find((item) => item.score > 0);
  const useful = best
    ? lines.slice(Math.max(0, best.index - 1), Math.min(lines.length, best.index + 2)).join(" ")
    : lines.find((line) => line.length > 20) || lines[0];
  return useful
    ? `the transcript says: "${useful}"`
    : "the transcript does not contain a clear direct answer, but the summary and key points may help you locate the topic.";
}
