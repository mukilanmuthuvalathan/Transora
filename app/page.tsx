"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Download, Loader2, Send, Sparkles } from "lucide-react";
import { InstallAppButton } from "@/components/InstallAppButton";
import { TransoraLogo } from "@/components/TransoraLogo";

type UsageStatus = {
  count: number;
  limit: number;
  premiumActive: boolean;
};

const DEVICE_KEY = "transora_device_id";

function createDeviceId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function HomePage() {
  const router = useRouter();
  const [deviceId, setDeviceId] = useState("");
  const [url, setUrl] = useState("");
  const [language, setLanguage] = useState<"en" | "ta">("en");
  const [code, setCode] = useState("");
  const [usage, setUsage] = useState<UsageStatus>({ count: 0, limit: 10, premiumActive: false });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const limitReached = !usage.premiumActive && usage.count >= usage.limit;
  const telegramUrl = process.env.NEXT_PUBLIC_TELEGRAM_URL || "https://t.me/transora_official";
  const qrUrl = useMemo(
    () => `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(telegramUrl)}`,
    [telegramUrl]
  );

  useEffect(() => {
    let saved = localStorage.getItem(DEVICE_KEY);
    if (!saved) {
      saved = createDeviceId();
      localStorage.setItem(DEVICE_KEY, saved);
    }
    setDeviceId(saved);
  }, []);

  const refreshUsage = useCallback(async (id = deviceId) => {
    if (!id) return;
    const response = await fetch("/api/usage", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ deviceId: id })
    });
    if (response.ok) setUsage(await response.json());
  }, [deviceId]);

  useEffect(() => {
    if (!deviceId) return;
    void refreshUsage(deviceId);
  }, [deviceId, refreshUsage]);

  async function createTranscript(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!url.trim()) {
      setError("Paste a YouTube URL first.");
      return;
    }
    if (limitReached) {
      setError("Free limit reached. Activate premium to create more transcripts.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    const response = await fetch("/api/youtube", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: url.trim(), deviceId, language })
    });

    const text = await response.text();
    setLoading(false);

    if (!response.ok) {
      try {
        const data = JSON.parse(text) as { error?: string };
        setError(data.error || "Transcript failed. Please try another YouTube video.");
      } catch {
        setError(text || "Transcript failed. Please try another YouTube video.");
      }
      setMessage("");
      await refreshUsage();
      return;
    }

    sessionStorage.setItem("transora_last_transcript", text);
    setMessage("");
    await refreshUsage();
    router.push("/result");
  }

  async function activatePremium() {
    if (!deviceId) return;
    setError("");
    setMessage("");

    const response = await fetch("/api/premium/activate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ deviceId, code: code.trim() })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "Premium code is invalid.");
      return;
    }
    setCode("");
    setMessage("Premium access activated for this device.");
    await refreshUsage();
  }

  async function copyDeviceId() {
    if (!deviceId) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(deviceId);
      } else {
        fallbackCopy(deviceId);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      fallbackCopy(deviceId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f3ec] text-ink">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 pb-5">
          <TransoraLogo size="md" showTagline />
          <div className="flex items-center gap-2">
            <InstallAppButton />
            <a
              href="/admin"
              className="rounded-md border border-ink/15 px-3 py-2 text-sm font-semibold transition hover:border-moss hover:text-moss"
            >
              Admin
            </a>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[1fr_0.75fr] lg:py-12">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-moss/25 bg-white px-4 py-2 text-sm font-semibold text-moss shadow-sm">
              <Sparkles size={16} /> YouTube audio to clean transcript
            </p>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight text-ink sm:text-5xl">
              From video to clarity in seconds.
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-ink/68">
              Paste a YouTube URL, choose English or Tamil, and Transora creates a timestamped plain-text transcript.
            </p>
          </div>

          <form onSubmit={createTranscript} className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm sm:p-6">
            <label className="block text-sm font-semibold" htmlFor="youtube-url">
              YouTube URL
            </label>
            <input
              id="youtube-url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="mt-2 w-full rounded-md border border-ink/15 px-4 py-4 text-base outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/15"
            />

            <label className="mt-5 block text-sm font-semibold" htmlFor="language">
              Transcript language
            </label>
            <select
              id="language"
              value={language}
              onChange={(event) => setLanguage(event.target.value === "ta" ? "ta" : "en")}
              className="mt-2 w-full rounded-md border border-ink/15 bg-white px-4 py-4 text-base outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/15"
            >
              <option value="en">English</option>
              <option value="ta">Tamil</option>
            </select>

            {!limitReached && (
              <button
                type="submit"
                disabled={loading || !deviceId}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-ink px-5 py-4 text-base font-semibold text-white transition hover:bg-moss disabled:cursor-not-allowed disabled:bg-ink/40"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={19} />}
                {loading ? "Creating transcript..." : "Create transcript"}
              </button>
            )}

            {message && <p className="mt-4 rounded-md bg-skywash px-4 py-3 text-sm leading-6 text-ink">{message}</p>}
            {error && <p className="mt-4 rounded-md bg-rust/10 px-4 py-3 text-sm leading-6 text-rust">{error}</p>}

            <div className="mt-5 rounded-md bg-skywash px-4 py-3 text-sm font-medium">
              {usage.premiumActive ? "Premium active on this device." : `${usage.count}/${usage.limit} free videos used this month.`}
            </div>

            <div className="mt-5 rounded-md border border-ink/10 p-4">
              <div className="mb-2 text-sm font-semibold">Your device ID</div>
              <div className="flex gap-2">
                <input readOnly value={deviceId} className="min-w-0 flex-1 rounded-md bg-[#f6f3ec] px-3 py-2 text-sm" />
                <button type="button" onClick={copyDeviceId} className="rounded-md border border-ink/15 px-3 py-2 text-sm font-semibold hover:border-moss hover:text-moss">
                  <Copy size={16} className="inline" /> {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            <div className="mt-5 border-t border-ink/10 pt-5">
              <label className="block text-sm font-semibold" htmlFor="premium-code">
                Premium code
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  id="premium-code"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="TR-..."
                  className="min-w-0 flex-1 rounded-md border border-ink/15 px-4 py-3 outline-none focus:border-moss focus:ring-4 focus:ring-moss/15"
                />
                <button type="button" onClick={activatePremium} className="rounded-md bg-moss px-4 py-3 font-semibold text-white hover:bg-ink">
                  Activate
                </button>
              </div>
            </div>

            {limitReached && (
              <div className="mt-5 rounded-md border border-moss/20 bg-[#eef9f6] p-4 text-center">
                <p className="font-semibold">Free limit reached. Contact us on Telegram for premium access.</p>
                <Image src={qrUrl} alt="Telegram QR code" width={160} height={160} className="mx-auto mt-4 rounded-md bg-white p-2" unoptimized />
                <a href={telegramUrl} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-moss" target="_blank" rel="noreferrer">
                  Open Telegram <Download size={16} />
                </a>
              </div>
            )}
          </form>
        </section>

        <footer className="border-t border-ink/10 py-5 text-sm leading-6 text-ink/62">
          <div className="font-semibold text-ink">Mukilan Muthuvalathan</div>
          <div>Founder &amp; CEO, TransOra</div>
        </footer>
      </div>
    </main>
  );
}

function fallbackCopy(value: string) {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}
