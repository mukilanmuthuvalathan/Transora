"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TransoraLogo } from "@/components/TransoraLogo";

export default function ResultPage() {
  const router = useRouter();
  const [transcript, setTranscript] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem("transora_last_transcript") ?? "";
    setTranscript(saved);
  }, []);

  function downloadTxt() {
    const blob = new Blob([transcript], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "transora-transcript.txt";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function copyText() {
    await navigator.clipboard.writeText(transcript);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <main className="min-h-screen bg-[#f6f3ec] text-ink">
      <div className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 pb-5">
        <Link href="/">
          <TransoraLogo size="sm" />
        </Link>
        <button
          onClick={() => router.push("/")}
          className="rounded-md border border-ink/15 px-4 py-2 text-sm font-semibold hover:border-moss hover:text-moss"
        >
          New transcript
        </button>
      </header>

      <section className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">Clean transcript with time</h1>
        <div className="flex gap-2">
          <button
            onClick={copyText}
            disabled={!transcript}
            className="rounded-md bg-moss px-4 py-2 text-sm font-semibold text-white hover:bg-ink disabled:bg-ink/35"
          >
            {copied ? "Copied" : "Copy text"}
          </button>
          <button
            onClick={downloadTxt}
            disabled={!transcript}
            className="rounded-md bg-rust px-4 py-2 text-sm font-semibold text-white hover:bg-ink disabled:bg-ink/35"
          >
            Download TXT
          </button>
        </div>
      </section>

      <article className="min-h-[60vh] whitespace-pre-wrap rounded-lg border border-ink/10 bg-white p-5 text-base leading-8 text-ink shadow-sm">
        {transcript || "No transcript found. Create one from the home page first."}
      </article>
      </div>
    </main>
  );
}
