import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { PwaInstall } from "@/components/pwa-install";

export function Navbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-cyan-300/15 bg-[#080a0f]/95 backdrop-blur">
      <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 md:px-8">
        <Link className="flex items-center" href="/">
          <BrandLogo />
        </Link>
        <div className="hidden items-center gap-6 text-sm font-medium text-white/70 md:flex">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/process">Process</Link>
          <Link href="/profile">Profile</Link>
        </div>
        <div className="flex items-center gap-2">
          <PwaInstall />
          <Link className="rounded-lg px-4 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/10" href="/login">Login</Link>
          <Link className="rounded-lg bg-[linear-gradient(135deg,#0057d9_0%,#12c7e8_52%,#0b63ff_100%)] px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:brightness-110" href="/register">Register</Link>
        </div>
      </nav>
    </header>
  );
}
