import json
import os
import sys
from pathlib import Path

from faster_whisper import WhisperModel


def limit_repeated_words(text: str, max_repeat: int = 2) -> str:
    words = text.split()
    cleaned = []
    previous = None
    count = 0

    for word in words:
        key = word.strip(".,!?;:\"'()[]{}").casefold()
        if key and key == previous:
            count += 1
        else:
            previous = key
            count = 1
        if count <= max_repeat:
            cleaned.append(word)

    return " ".join(cleaned)


def clean_language_artifacts(text: str, language: str | None) -> str:
    if language != "ta":
        return text
    cleaned = []
    for char in text:
        is_tamil = "\u0b80" <= char <= "\u0bff"
        is_safe = char.isspace() or char.isdigit() or char in ".,!?;:'\"()[]{}-..."
        if is_tamil or is_safe:
            cleaned.append(char)
    return " ".join("".join(cleaned).split())


def stamp(seconds: float) -> str:
    millis = int(round(seconds * 1000))
    hours = millis // 3_600_000
    millis %= 3_600_000
    minutes = millis // 60_000
    millis %= 60_000
    secs = millis // 1000
    millis %= 1000
    return f"{hours:02}:{minutes:02}:{secs:02},{millis:03}"


def main() -> None:
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

    if len(sys.argv) not in (3, 4, 5):
        raise SystemExit("Usage: faster_transcribe.py <audio> <output_dir> [language|auto] [transcribe|translate]")

    audio = Path(sys.argv[1])
    output_dir = Path(sys.argv[2])
    output_dir.mkdir(parents=True, exist_ok=True)

    language_arg = None if len(sys.argv) < 4 or sys.argv[3] == "auto" else sys.argv[3]
    task = "transcribe" if len(sys.argv) < 5 else sys.argv[4]
    language_model = os.environ.get(f"FAST_WHISPER_MODEL_{(language_arg or 'AUTO').upper()}", "").strip()
    model_name = (
        language_model
        or os.environ.get("FAST_WHISPER_MODEL", "").strip()
        or ("small.en" if language_arg == "en" and task == "transcribe" else "medium")
    )
    beam_size = int(os.environ.get("FAST_WHISPER_BEAM_SIZE", "5"))
    compute_type = os.environ.get("FAST_WHISPER_COMPUTE_TYPE", "int8")
    model = WhisperModel(model_name, device="cpu", compute_type=compute_type)
    initial_prompt = None
    if language_arg == "ta":
        initial_prompt = "தமிழ் பேச்சை சரியான தமிழ் எழுத்துகளாக மட்டும் எழுதவும். ஆங்கில வார்த்தைகளை சேர்க்க வேண்டாம்."

    segments_iter, info = model.transcribe(
        str(audio),
        language=language_arg,
        task=task,
        beam_size=beam_size,
        best_of=beam_size,
        temperature=0,
        initial_prompt=initial_prompt,
        vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=350),
        condition_on_previous_text=False,
    )

    segments = []
    for index, segment in enumerate(segments_iter, start=1):
        text = clean_language_artifacts(limit_repeated_words(segment.text.strip()), language_arg or info.language)
        if not text:
            continue
        segments.append({"start": segment.start, "end": segment.end, "text": text})
        print(f"{index}: {stamp(segment.start)} {text}", flush=True)

    text = "\n".join(segment["text"] for segment in segments)
    srt_blocks = [
        f"{index}\n{stamp(segment['start'])} --> {stamp(segment['end'])}\n{segment['text']}"
        for index, segment in enumerate(segments, start=1)
    ]

    (output_dir / "fast.txt").write_text(text, encoding="utf-8")
    (output_dir / "fast.srt").write_text("\n\n".join(srt_blocks), encoding="utf-8")
    (output_dir / "fast.json").write_text(
        json.dumps({"language": info.language, "duration": info.duration, "segments": segments}, indent=2),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
