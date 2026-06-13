"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileText, MessageSquareText, Search } from "lucide-react";
import { AutoRefresh } from "@/components/auto-refresh";
import { ExportActions } from "@/components/export-actions";
import { ReprocessButton } from "@/components/reprocess-button";
import { StatusBadge } from "@/components/status-badge";

type Segment = { start: number; end: number; text: string };
type VideoData = {
  id: string;
  title: string;
  status: string;
  error?: string | null;
  language?: string;
  transcript?: { text: string; segments: Segment[]; srt: string; sourceLanguage?: string | null; targetLanguage?: string | null } | null;
  summary?: { summary: string; keyPoints: string[]; notes: string[]; definitions: { term: string; definition: string }[] } | null;
};

export function TranscriptWorkspace({ video }: { video?: VideoData | null }) {
  const [query, setQuery] = useState("");
  const segments = useMemo(() => video?.transcript?.segments || [], [video?.transcript?.segments]);
  const filtered = useMemo(() => segments.filter((s) => s.text.toLowerCase().includes(query.toLowerCase())), [segments, query]);

  if (!video) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-bold text-ink">Choose a video</h2>
        <p className="mt-2 text-slate-600">Open a completed video from your dashboard or process a new one.</p>
        <Link className="mt-5 inline-flex rounded-lg bg-ocean px-5 py-3 font-semibold text-white" href="/process">Process Video</Link>
      </div>
    );
  }

  const transcriptReady = video.status === "COMPLETED" && Boolean(video.transcript);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <AutoRefresh active={video.status === "QUEUED" || video.status === "PROCESSING"} />
      <section className="space-y-5">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-ink">{video.title}</h2>
              <p className="text-sm text-slate-500">Transcript viewer and subtitle timeline</p>
            </div>
            <StatusBadge status={video.status} />
          </div>
          {video.transcript && (
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
              <span className="rounded-md bg-cloud px-3 py-2 text-slate-600">
                Audio language: {languageName(video.transcript.sourceLanguage || video.language)}
              </span>
              <span className="rounded-md bg-ocean/10 px-3 py-2 text-ocean">
                Output language: {languageName(video.transcript.targetLanguage || video.language)}
              </span>
            </div>
          )}
          {video.error && (
            <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-semibold leading-6 text-red-600">
              {video.error}
            </p>
          )}
          {(video.status === "QUEUED" || video.status === "PROCESSING") && (
            <p className="mt-4 rounded-lg bg-ocean/10 p-3 text-sm font-semibold leading-6 text-ocean">
              Processing is running. This page refreshes automatically every few seconds.
            </p>
          )}
          <div className="mt-5 aspect-video rounded-lg bg-ink p-5 text-white">
            <div className="flex h-full items-center justify-center rounded-md border border-white/10 bg-white/5 text-center">
              <div>
                <FileText className="mx-auto mb-3" />
                <p className="font-semibold">Video Player</p>
                <p className="text-sm text-white/70">Connect storage playback for uploaded files in production.</p>
              </div>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {transcriptReady && <ExportActions videoId={video.id} />}
            <ReprocessButton videoId={video.id} />
            {transcriptReady && (
              <Link className="inline-flex items-center gap-2 rounded-lg bg-ocean px-4 py-2 text-sm font-semibold text-white" href={`/chat?video=${video.id}`}>
                <MessageSquareText size={16} /> Ask AI
              </Link>
            )}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <label className="relative block">
            <Search className="absolute left-3 top-3 text-slate-400" size={18} />
            <input className="focus-ring w-full rounded-lg border border-slate-200 py-3 pl-10 pr-4" placeholder="Search inside transcript..." value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <div className="mt-4 max-h-[520px] space-y-3 overflow-auto pr-1">
            {(!transcriptReady || filtered.length === 0) && <p className="rounded-lg bg-cloud p-4 text-sm text-slate-600">Transcript is not ready yet or no results match your search.</p>}
            {transcriptReady && filtered.map((segment, index) => (
              <article className="rounded-lg bg-cloud p-4" key={`${segment.start}-${index}`}>
                <p className="mb-2 text-xs font-bold text-ocean">{formatTime(segment.start)} - {formatTime(segment.end)}</p>
                <p className="leading-7 text-slate-700">{segment.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <aside className="space-y-5">
        <Card title="Summary">{transcriptReady ? video.summary?.summary || "Summary will appear when processing completes." : "Summary will appear when processing completes."}</Card>
        <ListCard title="Key Points" items={transcriptReady ? video.summary?.keyPoints || [] : []} />
        <ListCard title="Notes" items={transcriptReady ? video.summary?.notes || [] : []} />
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h3 className="font-bold text-ink">Definitions</h3>
          <div className="mt-3 space-y-3">
            {(transcriptReady ? video.summary?.definitions || [] : []).map((item) => (
              <div className="rounded-lg bg-cloud p-3" key={item.term}>
                <p className="font-semibold text-ocean">{item.term}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{item.definition}</p>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="font-bold text-ink">{title}</h3>
      <p className="mt-3 leading-7 text-slate-600">{children}</p>
    </div>
  );
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="font-bold text-ink">{title}</h3>
      <ul className="mt-3 space-y-2">
        {(items.length ? items : ["Content will appear after processing."]).map((item) => (
          <li className="rounded-lg bg-cloud p-3 text-sm leading-6 text-slate-700" key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function formatTime(seconds: number) {
  const min = Math.floor(seconds / 60).toString().padStart(2, "0");
  const sec = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${min}:${sec}`;
}

function languageName(language?: string | null) {
  const names: Record<string, string> = {
    en: "English",
    ta: "Tamil",
    hi: "Hindi",
    es: "Spanish",
    fr: "French",
    auto: "Auto detected"
  };
  return names[language || ""] || language || "Auto detected";
}
