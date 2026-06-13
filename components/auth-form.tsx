"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";

export function AuthForm({
  mode,
  redirectTo = "/dashboard",
  initialError = "",
  googleEnabled = false
}: {
  mode: "login" | "register";
  redirectTo?: string;
  initialError?: string;
  googleEnabled?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form);
    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error || "Something went wrong.");
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {googleEnabled ? (
        <a
          className="focus-ring flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-300/25 bg-white/10 px-5 py-3 font-semibold text-white shadow-soft backdrop-blur transition hover:bg-white/15"
          href={`/api/auth/google?next=${encodeURIComponent(redirectTo)}`}
        >
          <Mail size={18} /> Continue with Google
        </a>
      ) : (
        <div className="rounded-lg border border-cyan-300/25 bg-cyan-300/10 p-3 text-sm font-semibold leading-6 text-cyan-100">
          Google login needs setup. Use your Gmail below now, or add Google credentials to enable one-click login.
        </div>
      )}
      <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
        <span className="h-px flex-1 bg-white/15" />
        Email
        <span className="h-px flex-1 bg-white/15" />
      </div>
      <form className="space-y-4" onSubmit={submit}>
        {mode === "register" && (
          <label className="block text-sm font-semibold text-slate-200">
            Name
            <input className="focus-ring mt-2 w-full rounded-lg border border-white/15 bg-white/10 px-4 py-3 text-white placeholder:text-slate-400" name="name" placeholder="Mukilan" required />
          </label>
        )}
        <label className="block text-sm font-semibold text-slate-200">
          Email or Gmail
          <input className="focus-ring mt-2 w-full rounded-lg border border-white/15 bg-white/10 px-4 py-3 text-white placeholder:text-slate-400" name="email" placeholder="you@gmail.com" type="email" required />
        </label>
        <label className="block text-sm font-semibold text-slate-200">
          Password
          <input className="focus-ring mt-2 w-full rounded-lg border border-white/15 bg-white/10 px-4 py-3 text-white placeholder:text-slate-400" name="password" type="password" minLength={mode === "register" ? 8 : 1} required />
        </label>
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-600">{error}</p>}
        <button className="focus-ring w-full rounded-lg bg-[linear-gradient(135deg,#0057d9_0%,#12c7e8_52%,#0b63ff_100%)] px-5 py-3 font-semibold text-white shadow-soft transition hover:brightness-110 disabled:opacity-60" disabled={loading}>
          {loading ? "Please wait..." : mode === "login" ? "Login" : "Create Account"}
        </button>
      </form>
    </div>
  );
}
