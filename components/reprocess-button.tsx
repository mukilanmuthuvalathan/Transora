"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ReprocessButton({ videoId }: { videoId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function reprocess() {
    setLoading(true);
    await fetch(`/api/videos/${videoId}/reprocess`, { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  return (
    <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60" disabled={loading} onClick={reprocess}>
      <RefreshCw className={loading ? "animate-spin" : ""} size={16} />
      {loading ? "Reprocessing" : "Reprocess"}
    </button>
  );
}
