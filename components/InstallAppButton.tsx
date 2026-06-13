"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallAppButton() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    const promptHandler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const installedHandler = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", promptHandler);
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", promptHandler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setInstallPrompt(null);
  }

  return (
    <button
      type="button"
      onClick={installApp}
      disabled={!installPrompt || installed}
      className="rounded-md border border-ink/15 px-3 py-2 text-sm font-semibold text-ink transition hover:border-moss hover:text-moss disabled:cursor-not-allowed disabled:opacity-55"
      title={installPrompt ? "Install Transora on this device" : "Open the browser menu to install when available"}
    >
      {installed ? "App installed" : "Download app"}
    </button>
  );
}
