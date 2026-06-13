"use client";

import { useState } from "react";
import { Send } from "lucide-react";

type VideoOption = { id: string; title: string };
type Message = { question: string; answer: string };

export function ChatWorkspace({ videos, selectedVideoId, initialMessages }: { videos: VideoOption[]; selectedVideoId?: string; initialMessages: Message[] }) {
  const [videoId, setVideoId] = useState(selectedVideoId || videos[0]?.id || "");
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function ask(event: React.FormEvent) {
    event.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setError("");
    const current = question;
    setQuestion("");
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId, question: current })
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error || "Could not answer that question.");
    setMessages((items) => [...items, data.chat]);
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-ink">AI Chat About Video</h2>
        <select className="focus-ring rounded-lg border border-slate-200 px-4 py-2 text-sm" value={videoId} onChange={(event) => setVideoId(event.target.value)}>
          {videos.map((video) => <option key={video.id} value={video.id}>{video.title}</option>)}
        </select>
      </div>
      <div className="min-h-[420px] space-y-4 rounded-lg bg-cloud p-4">
        {messages.length === 0 && <p className="text-sm text-slate-600">Ask anything about the selected transcript.</p>}
        {messages.map((message, index) => (
          <div className="space-y-2" key={index}>
            <p className="ml-auto max-w-2xl rounded-lg bg-ocean px-4 py-3 text-sm font-medium text-white">{message.question}</p>
            <p className="max-w-2xl rounded-lg bg-white px-4 py-3 text-sm leading-6 text-slate-700">{message.answer}</p>
          </div>
        ))}
      </div>
      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-600">{error}</p>}
      <form className="mt-4 flex gap-2" onSubmit={ask}>
        <input className="focus-ring min-w-0 flex-1 rounded-lg border border-slate-200 px-4 py-3" placeholder="Ask a question about the video..." value={question} onChange={(event) => setQuestion(event.target.value)} />
        <button className="focus-ring rounded-lg bg-ocean px-4 py-3 text-white disabled:opacity-60" disabled={loading || !videoId} title="Send">
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
