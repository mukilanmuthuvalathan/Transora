import { AppShell } from "@/components/app-shell";
import { SettingsForm } from "@/components/settings-form";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function SettingsPage() {
  const user = await requireUser();
  const settings = await prisma.setting.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} });

  return (
    <AppShell title="Settings">
      <div className="max-w-2xl">
        <h2 className="mb-4 text-2xl font-bold text-ink">Workspace preferences</h2>
        <SettingsForm settings={settings} />
      </div>
    </AppShell>
  );
}
