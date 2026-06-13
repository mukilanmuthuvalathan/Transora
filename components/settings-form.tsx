"use client";

import { useState } from "react";

type Settings = { preferredLanguage: string; autoGenerateNotes: boolean; exportFormat: string };

export function SettingsForm({ settings }: { settings: Settings }) {
  const [form, setForm] = useState(settings);
  const [message, setMessage] = useState("");

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    setMessage(res.ok ? "Settings saved." : "Could not save settings.");
  }

  return (
    <form className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft" onSubmit={save}>
      <label className="block text-sm font-semibold text-slate-700">
        Preferred language
        <select className="focus-ring mt-2 w-full rounded-lg border border-slate-200 px-4 py-3" value={form.preferredLanguage} onChange={(event) => setForm({ ...form, preferredLanguage: event.target.value })}>
          <option value="en">English</option>
          <option value="ta">Tamil</option>
          <option value="hi">Hindi</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
        </select>
      </label>
      <label className="mt-4 flex items-center justify-between rounded-lg border border-slate-200 p-4 text-sm font-semibold text-slate-700">
        Auto-generate notes
        <input checked={form.autoGenerateNotes} onChange={(event) => setForm({ ...form, autoGenerateNotes: event.target.checked })} type="checkbox" />
      </label>
      <label className="mt-4 block text-sm font-semibold text-slate-700">
        Default export
        <select className="focus-ring mt-2 w-full rounded-lg border border-slate-200 px-4 py-3" value={form.exportFormat} onChange={(event) => setForm({ ...form, exportFormat: event.target.value })}>
          <option value="txt">TXT</option>
          <option value="pdf">PDF</option>
          <option value="docx">DOCX</option>
          <option value="srt">SRT</option>
        </select>
      </label>
      <button className="focus-ring mt-5 rounded-lg bg-ocean px-5 py-3 font-semibold text-white">Save Settings</button>
      {message && <p className="mt-4 text-sm font-semibold text-ocean">{message}</p>}
    </form>
  );
}
