import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type DashboardVideo = Awaited<ReturnType<typeof prisma.video.findMany>>[number];

export default async function DashboardPage() {
  const user = await requireUser();
  const videos = await prisma.video.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 8, include: { transcript: true } });
  const completed = videos.filter((video: DashboardVideo) => video.status === "COMPLETED").length;

  return (
    <AppShell title="Dashboard">
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Recent Videos" value={videos.length} />
        <Stat label="Completed Transcripts" value={completed} />
        <Stat label="Exports Ready" value={completed * 4} />
      </div>
      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Transcript History</h2>
          <Link className="rounded-lg bg-ocean px-4 py-2 text-sm font-semibold text-white" href="/process">New Video</Link>
        </div>
        <div className="space-y-3">
          {videos.length === 0 && <p className="rounded-lg bg-cloud p-4 text-sm text-slate-600">No videos yet. Upload or paste a link to begin.</p>}
          {videos.map((video: DashboardVideo) => (
            <Link className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-4 hover:bg-cloud" href={`/transcript?video=${video.id}`} key={video.id}>
              <div>
                <h3 className="font-semibold text-ink">{video.title}</h3>
                <p className="text-sm text-slate-500">{video.sourceType} · {new Date(video.createdAt).toLocaleDateString()}</p>
              </div>
              <StatusBadge status={video.status} />
            </Link>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-ink">{value}</p>
    </article>
  );
}
