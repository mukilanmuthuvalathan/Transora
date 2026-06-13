import { AppShell } from "@/components/app-shell";
import { ChatWorkspace } from "@/components/chat-workspace";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ChatPage({ searchParams }: { searchParams: Promise<{ video?: string }> }) {
  const query = await searchParams;
  const user = await requireUser();
  const videos = await prisma.video.findMany({ where: { userId: user.id, status: "COMPLETED" }, orderBy: { createdAt: "desc" }, select: { id: true, title: true } });
  const selected = query.video || videos[0]?.id;
  const messages = selected ? await prisma.chat.findMany({ where: { userId: user.id, videoId: selected }, orderBy: { createdAt: "asc" }, select: { question: true, answer: true } }) : [];

  return (
    <AppShell title="AI Chat">
      <ChatWorkspace videos={videos} selectedVideoId={selected} initialMessages={messages} />
    </AppShell>
  );
}
