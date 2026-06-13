import Link from "next/link";
import { Home, MessageSquareText, Settings, Upload, User, Video } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { PwaInstall } from "@/components/pwa-install";
import { UserProfileMenu } from "@/components/user-profile-menu";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/process", label: "Process", icon: Upload },
  { href: "/transcript", label: "Transcripts", icon: Video },
  { href: "/chat", label: "AI Chat", icon: MessageSquareText },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/profile", label: "Profile", icon: User }
];

export function AppShell({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#080a0f_0%,#11151d_45%,#0c302f_100%)]">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-cyan-300/15 bg-[#080a0f]/95 p-4 backdrop-blur md:block">
        <Link className="mb-8 flex px-2" href="/">
          <BrandLogo compact />
        </Link>
        <nav className="space-y-1">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-mint" href={href} key={href}>
              <Icon size={18} /> {label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="md:pl-64">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-cyan-300/15 bg-[#080a0f]/90 px-5 backdrop-blur">
          <h1 className="text-lg font-bold text-white">{title}</h1>
          <div className="flex items-center gap-2">
            <PwaInstall />
            <UserProfileMenu />
          </div>
        </header>
        <main className="mx-auto max-w-7xl p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}
