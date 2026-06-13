import { AppShell } from "@/components/app-shell";
import { ProfileForm } from "@/components/profile-form";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ProfilePage() {
  const user = await requireUser();
  const counts = {
    videos: await prisma.video.count({ where: { userId: user.id } }),
    chats: await prisma.chat.count({ where: { userId: user.id } })
  };

  return (
    <AppShell title="Profile">
      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-bold text-ink">Mukilan Muthuvalathan</h2>
          <p className="mt-2 text-slate-600">CEO & Founder, Transora</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-cloud p-4"><p className="text-2xl font-bold">{counts.videos}</p><p className="text-sm text-slate-500">Videos</p></div>
            <div className="rounded-lg bg-cloud p-4"><p className="text-2xl font-bold">{counts.chats}</p><p className="text-sm text-slate-500">AI chats</p></div>
          </div>
        </section>
        <ProfileForm user={user} />
      </div>
    </AppShell>
  );
}
