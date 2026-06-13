"use client";

import { useState } from "react";
import { Download } from "lucide-react";

const formats = ["txt", "pdf", "docx", "srt"] as const;
type ReadyFile = { url: string; filename: string; format: string };

export function ExportActions({ videoId }: { videoId: string }) {
  const [active, setActive] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState<ReadyFile | null>(null);

  async function download(format: string) {
    setActive(format);
    setError("");

    try {
      const response = await fetch(`/api/export/${videoId}/${format}`);
      if (!response.ok) {
        const message = await response.json().then((data) => data.error).catch(() => "");
        throw new Error(message || "Download is not ready yet.");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      const filename = filenameFromHeader(disposition) || `transora-transcript.${format}`;
      const url = URL.createObjectURL(blob);
      if (ready?.url) URL.revokeObjectURL(ready.url);
      setReady({ url, filename, format });

      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Download failed.");
    } finally {
      setActive(null);
    }
  }

  return (
    <>
      {formats.map((format) => (
        <button
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"
          disabled={Boolean(active)}
          key={format}
          onClick={() => download(format)}
          type="button"
        >
          <Download size={16} /> {active === format ? "Saving..." : format.toUpperCase()}
        </button>
      ))}
      {ready && (
        <p className="w-full rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
          File ready:{" "}
          <a className="underline" href={ready.url} rel="noreferrer" target="_blank">
            Open {ready.filename}
          </a>
        </p>
      )}
      {error && <p className="w-full rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-600">{error}</p>}
    </>
  );
}

function filenameFromHeader(header: string) {
  const encoded = header.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) return decodeURIComponent(encoded);
  return header.match(/filename="([^"]+)"/i)?.[1] || "";
}
