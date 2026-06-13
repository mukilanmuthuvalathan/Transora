import argparse
import re
from pathlib import Path

from faster_whisper import WhisperModel


def timestamp(seconds: float) -> str:
    total = max(0, int(seconds))
    hours = total // 3600
    minutes = (total % 3600) // 60
    secs = total % 60
    if hours:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"
    return f"{minutes:02d}:{secs:02d}"


def clean_text(text: str, language: str) -> str:
    text = " ".join(text.split()).strip()
    if language == "ta":
        text = re.sub(r"[A-Za-zÀ-žЀ-ӿ一-龯ぁ-んァ-ン가-힣]+", " ", text)
        text = re.sub(r"\s+", " ", text).strip()
    return text


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--language", required=True)
    parser.add_argument("--model", default="tiny")
    args = parser.parse_args()

    model = WhisperModel(args.model, device="cpu", compute_type="int8", cpu_threads=4)
    segments, _ = model.transcribe(
        args.audio,
        language=args.language,
        beam_size=1,
        best_of=1,
        vad_filter=True,
        condition_on_previous_text=False,
    )

    lines = []
    for segment in segments:
        text = clean_text(segment.text, args.language)
        if text:
            lines.append(f"[{timestamp(segment.start)}] {text}")

    Path(args.output).write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    main()
