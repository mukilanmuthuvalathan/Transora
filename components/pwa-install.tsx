"use client";

import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaInstall() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!promptEvent) {
      setShowHelp(true);
      return;
    }
    await promptEvent.prompt();
    await promptEvent.userChoice;
    setPromptEvent(null);
  }

  if (installed) return null;

  return (
    <>
      <button
        className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/25 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/15 sm:px-4"
        onClick={install}
        type="button"
      >
        <Download size={16} /> <span className="hidden sm:inline">Install App</span><span className="sm:hidden">Install</span>
      </button>
      {showHelp && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 px-4">
          <section className="w-full max-w-md rounded-lg border border-cyan-300/25 bg-[#080a0f] p-5 text-white shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">Install Transora</h2>
                <p className="mt-1 text-sm leading-6 text-slate-300">Use your browser install option to add Transora to your mobile or laptop.</p>
              </div>
              <button className="rounded-lg p-2 text-slate-300 hover:bg-white/10" onClick={() => setShowHelp(false)} type="button">
                <X size={18} />
              </button>
            </div>
            <div className="mt-5 space-y-3 text-sm leading-6 text-slate-200">
              <p><strong className="text-mint">Android Chrome:</strong> tap the three-dot menu, then choose <span className="font-semibold text-white">Install app</span> or <span className="font-semibold text-white">Add to Home screen</span>.</p>
              <p><strong className="text-mint">Laptop Chrome/Edge:</strong> click the install icon in the address bar, or open the browser menu and choose <span className="font-semibold text-white">Install Transora</span>.</p>
              <p className="rounded-lg bg-white/10 p-3 text-xs text-slate-300">If the install option is missing, refresh once and wait a few seconds. Some browsers show install only after the app is loaded over localhost or HTTPS.</p>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
