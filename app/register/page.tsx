import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { BrandLogo } from "@/components/brand-logo";
import { googleConfigured } from "@/lib/google-auth";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const query = await searchParams;
  const redirectTo = query.next?.startsWith("/") ? query.next : "/dashboard";

  return (
    <main className="grid min-h-screen place-items-center bg-[linear-gradient(135deg,#080a0f_0%,#11151d_42%,#0c302f_74%,#2b2112_100%)] px-5">
      <section className="w-full max-w-md rounded-lg border border-cyan-300/25 bg-white/10 p-6 shadow-soft backdrop-blur">
        <div className="mb-5 flex justify-center">
          <BrandLogo />
        </div>
        <h1 className="text-2xl font-bold text-white">Try Transora Free</h1>
        <p className="mt-2 text-sm text-slate-300">Create your workspace for transcripts, subtitles, notes, and transcript chat.</p>
        <div className="mt-6"><AuthForm mode="register" redirectTo={redirectTo} initialError={query.error || ""} googleEnabled={googleConfigured()} /></div>
        <p className="mt-5 text-center text-sm text-slate-300">Already have an account? <Link className="font-semibold text-mint" href={`/login?next=${encodeURIComponent(redirectTo)}`}>Login</Link></p>
      </section>
    </main>
  );
}
