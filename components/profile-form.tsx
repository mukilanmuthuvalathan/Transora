"use client";

import { useState } from "react";

export function ProfileForm({ user }: { user?: { name: string; email: string } | null }) {
  const [name, setName] = useState(user?.name || "");
  const [message, setMessage] = useState("");

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    setMessage(res.ok ? "Profile updated." : "Could not update profile.");
  }

  return (
    <form className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft" onSubmit={save}>
      <label className="block text-sm font-semibold text-slate-700">
        Name
        <input className="focus-ring mt-2 w-full rounded-lg border border-slate-200 px-4 py-3" value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label className="mt-4 block text-sm font-semibold text-slate-700">
        Email
        <input className="mt-2 w-full rounded-lg border border-slate-200 bg-cloud px-4 py-3" value={user?.email || ""} disabled />
      </label>
      <button className="focus-ring mt-5 rounded-lg bg-ocean px-5 py-3 font-semibold text-white">Save Profile</button>
      {message && <p className="mt-4 text-sm font-semibold text-ocean">{message}</p>}
    </form>
  );
}
