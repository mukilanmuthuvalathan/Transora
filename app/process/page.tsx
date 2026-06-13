import { AppShell } from "@/components/app-shell";
import { VideoSubmitForm } from "@/components/video-submit-form";

export default async function ProcessPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const query = await searchParams;
  const mode = query.mode === "upload" ? "upload" : "url";

  return (
    <AppShell title="Video Processing">
      <div className="grid gap-6 lg:grid-cols-[0.85fr_1fr]">
        <section>
          <p className="mb-4 inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100">
            Free mode processing
          </p>
          <h2 className="text-2xl font-bold text-white">Paste a link or upload MP4</h2>
          <p className="mt-2 leading-7 text-slate-300">Transora creates subtitles, summaries, and searchable text from available captions or local transcription.</p>
        </section>
        <VideoSubmitForm initialMode={mode} />
      </div>
    </AppShell>
  );
}
