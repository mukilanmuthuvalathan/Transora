import { AppShell } from "@/components/app-shell";
import { TranscriptWorkspace } from "@/components/transcript-workspace";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function TranscriptPage({ searchParams }: { searchParams: Promise<{ video?: string }> }) {
  const query = await searchParams;
  const user = await requireUser();
  const video = query.video ? await prisma.video.findFirst({
    where: { id: query.video, userId: user.id },
    include: { transcript: true, summary: true }
  }) : null;

  return (
    <AppShell title="Transcript Viewer">
      <TranscriptWorkspace video={video as never} />
    </AppShell>
  );
}
