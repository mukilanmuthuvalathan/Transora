"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LinkIcon, Upload } from "lucide-react";

export function VideoSubmitForm({ initialMode = "url" }: { initialMode?: "url" | "upload" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState(initialMode);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const url = String(formData.get("url") || "").trim();
    const file = formData.get("file");
    if (mode === "url" && !url) {
      setError("Paste a YouTube video link before generating a transcript.");
      return;
    }
    if (mode === "upload" && !(file instanceof File && file.name)) {
      setError("Choose an MP4 video file before generating a transcript.");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/videos", { method: "POST", body: formData });
    const data = await res.json();
    setLoading(false);
    if (res.status === 401) {
      router.push(`/login?next=${encodeURIComponent("/process")}`);
      return;
    }
    if (!res.ok) return setError(data.error || "Could not process this video.");
    router.push(`/transcript?video=${data.video.id}`);
  }

  return (
    <form className="rounded-lg border border-cyan-300/25 bg-white/10 p-5 shadow-soft backdrop-blur" onSubmit={submit}>
      <div className="mb-5 grid grid-cols-2 gap-2 rounded-lg border border-white/10 bg-[#080a0f]/70 p-1">
        <button className={`rounded-md px-4 py-2 text-sm font-bold transition ${mode === "url" ? "bg-[linear-gradient(135deg,#0057d9_0%,#12c7e8_52%,#0b63ff_100%)] text-white shadow" : "text-slate-300 hover:bg-white/10 hover:text-white"}`} onClick={() => setMode("url")} type="button">
          <LinkIcon className="mr-2 inline" size={16} /> URL
        </button>
        <button className={`rounded-md px-4 py-2 text-sm font-bold transition ${mode === "upload" ? "bg-[linear-gradient(135deg,#0057d9_0%,#12c7e8_52%,#0b63ff_100%)] text-white shadow" : "text-slate-300 hover:bg-white/10 hover:text-white"}`} onClick={() => setMode("upload")} type="button">
          <Upload className="mr-2 inline" size={16} /> Upload
        </button>
      </div>
      {mode === "url" ? (
        <label className="block text-sm font-semibold text-slate-200">
          YouTube video link
          <input className="focus-ring mt-2 w-full rounded-lg border border-white/15 bg-white/10 px-4 py-3 text-white placeholder:text-slate-400" name="url" placeholder="https://youtube.com/watch?v=..." />
        </label>
      ) : (
        <label className="block text-sm font-semibold text-slate-200">
          MP4 video file
          <input accept="video/mp4" className="focus-ring mt-2 w-full rounded-lg border border-dashed border-cyan-300/35 bg-white/10 px-4 py-6 text-slate-200 file:mr-4 file:rounded-md file:border-0 file:bg-ocean file:px-3 file:py-2 file:font-semibold file:text-white" name="file" type="file" />
        </label>
      )}
      <label className="mt-4 block text-sm font-semibold text-slate-200">
        Output text language
        <select className="focus-ring mt-2 w-full rounded-lg border border-white/15 bg-[#11151d] px-4 py-3 text-white" name="language" defaultValue="en">
          <option value="en">English</option>
          <option value="ta">Tamil</option>
          <option value="hi">Hindi</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
        </select>
      </label>
      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-600">{error}</p>}
      <button className="focus-ring mt-5 w-full rounded-lg bg-[linear-gradient(135deg,#0057d9_0%,#12c7e8_52%,#0b63ff_100%)] px-5 py-3 font-semibold text-white shadow-soft transition hover:brightness-110 disabled:opacity-60" disabled={loading}>
        {loading ? "Starting processing..." : "Generate Transcript"}
      </button>
    </form>
  );
}
