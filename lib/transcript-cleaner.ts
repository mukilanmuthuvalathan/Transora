type TranscriptSegment = {
  start: number;
  end: number;
  text: string;
};

const ENGLISH_FILLERS = [
  "um",
  "uh",
  "erm",
  "ah",
  "hmm",
  "like",
  "you know",
  "i mean"
];

const ENGLISH_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bi\b/g, "I"],
  [/\bim\b/gi, "I'm"],
  [/\bi'm\b/gi, "I'm"],
  [/\bdont\b/gi, "don't"],
  [/\bdoesnt\b/gi, "doesn't"],
  [/\bdidnt\b/gi, "didn't"],
  [/\bcant\b/gi, "can't"],
  [/\bwont\b/gi, "won't"],
  [/\bisnt\b/gi, "isn't"],
  [/\barent\b/gi, "aren't"],
  [/\bwasnt\b/gi, "wasn't"],
  [/\bwerent\b/gi, "weren't"],
  [/\bthats\b/gi, "that's"],
  [/\bwhats\b/gi, "what's"],
  [/\blets\b/gi, "let's"],
  [/\byoure\b/gi, "you're"],
  [/\btheyre\b/gi, "they're"],
  [/\bwere\b/gi, "we're"],
  [/\bive\b/gi, "I've"],
  [/\byoutube\b/gi, "YouTube"],
  [/\btransora\b/gi, "Transora"]
];

const TAMIL_FILLERS = [
  "அம்",
  "உம்",
  "ம்ம்ம்",
  "ஆ",
  "ஏ"
];

export function cleanTranscriptSegments(segments: TranscriptSegment[], language: string) {
  return segments
    .map((segment) => ({
      ...segment,
      text: cleanTranscriptText(segment.text, language)
    }))
    .filter((segment) => segment.text);
}

export function cleanTranscriptText(text: string, language: string) {
  const normalizedLanguage = language.split("-")[0];
  return normalizedLanguage === "ta" ? cleanTamilText(text) : cleanEnglishText(text);
}

function cleanEnglishText(text: string) {
  let cleaned = normalizeSpacing(text);
  cleaned = removeFillers(cleaned, ENGLISH_FILLERS);
  cleaned = removeRepeatedWords(cleaned);

  for (const [pattern, replacement] of ENGLISH_REPLACEMENTS) {
    cleaned = cleaned.replace(pattern, replacement);
  }

  cleaned = cleaned
    .replace(/\s+([.,!?;:])/g, "$1")
    .replace(/([.!?])([A-Za-z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();

  cleaned = capitalizeSentences(cleaned);
  return finishSentence(cleaned);
}

function cleanTamilText(text: string) {
  let cleaned = normalizeSpacing(text);
  cleaned = removeNonTamilNoise(cleaned);
  cleaned = removeFillers(cleaned, TAMIL_FILLERS);
  cleaned = removeRepeatedWords(cleaned);
  cleaned = cleaned
    .replace(/\s+([.,!?;:])/g, "$1")
    .replace(/([.!?])([^\s])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();

  return finishSentence(cleaned);
}

function normalizeSpacing(text: string) {
  return text
    .replace(/[“”]/g, "\"")
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function removeFillers(text: string, fillers: string[]) {
  let cleaned = ` ${text} `;
  for (const filler of fillers) {
    const escaped = escapeRegex(filler);
    cleaned = cleaned.replace(new RegExp(`\\s+${escaped}[,\\s]+`, "giu"), " ");
  }
  return cleaned.trim();
}

function removeRepeatedWords(text: string, maxRepeat = 1) {
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

function removeNonTamilNoise(text: string) {
  const tamilLetters = text.match(/[\u0B80-\u0BFF]/g)?.length || 0;
  const latinLetters = text.match(/[A-Za-z]/g)?.length || 0;
  const shouldStripLatin = tamilLetters > 0 && tamilLetters >= latinLetters;
  if (!shouldStripLatin) return text;

  return text
    .replace(/[A-Za-zÀ-žЀ-ӿ一-龯ぁ-んァ-ン가-힣]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function capitalizeSentences(text: string) {
  let capitalizeNext = true;
  let result = "";

  for (const char of text) {
    if (capitalizeNext && /[a-z]/.test(char)) {
      result += char.toUpperCase();
      capitalizeNext = false;
      continue;
    }
    result += char;
    if (/[.!?]/.test(char)) capitalizeNext = true;
    if (/[A-Z0-9]/.test(char)) capitalizeNext = false;
  }

  return result;
}

function finishSentence(text: string) {
  if (!text) return "";
  if (/[.!?]$/.test(text)) return text;
  return `${text}.`;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
