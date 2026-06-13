"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { TransoraLogo } from "@/components/TransoraLogo";

type DeviceRow = {
  deviceId: string;
  premiumActive: boolean;
  expiresAt: string | null;
  usageCount: number;
};

type CodeRow = {
  id: string;
  code: string;
  active: boolean;
  expiresAt: string | null;
  usedByDeviceId: string | null;
  createdAt: string;
};

type UsageRow = {
  id: string;
  deviceId: string;
  month: string;
  count: number;
};

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [codes, setCodes] = useState<CodeRow[]>([]);
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function adminFetch(path: string, init?: RequestInit) {
    const response = await fetch(path, {
      ...init,
      headers: {
        "content-type": "application/json",
        "x-admin-password": password,
        ...(init?.headers ?? {})
      }
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error ?? "Admin request failed.");
    }
    return response;
  }

  const loadDashboard = useCallback(async (adminPassword = password) => {
    setError("");
    const headers = { "x-admin-password": adminPassword };
    const [deviceResponse, codeResponse, usageResponse] = await Promise.all([
      fetch("/api/admin/devices", { headers }),
      fetch("/api/admin/codes", { headers }),
      fetch("/api/admin/usage", { headers })
    ]);

    if (!deviceResponse.ok || !codeResponse.ok || !usageResponse.ok) {
      throw new Error("Could not load the admin dashboard.");
    }

    setDevices(await deviceResponse.json());
    setCodes(await codeResponse.json());
    setUsage(await usageResponse.json());
  }, [password]);

  useEffect(() => {
    const saved = sessionStorage.getItem("transora_admin_password");
    if (saved) {
      setPassword(saved);
      setAuthorized(true);
    }
  }, []);

  useEffect(() => {
    if (!authorized || !password) return;
    void loadDashboard(password).catch((caught) => {
      sessionStorage.removeItem("transora_admin_password");
      setAuthorized(false);
      setError(caught instanceof Error ? caught.message : "Please log in again.");
    });
  }, [authorized, loadDashboard, password]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password })
      });
      if (!response.ok) throw new Error("Incorrect admin password.");
      sessionStorage.setItem("transora_admin_password", password);
      setAuthorized(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Login failed.");
    }
  }

  async function createCode() {
    setMessage("");
    setError("");
    try {
      await adminFetch("/api/admin/codes", { method: "POST", body: JSON.stringify({}) });
      setMessage("Premium code created.");
      await loadDashboard();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Code creation failed.");
    }
  }

  async function setPremium(active: boolean) {
    setMessage("");
    setError("");
    try {
      await adminFetch("/api/admin/devices", {
        method: "POST",
        body: JSON.stringify({ deviceId, active })
      });
      setMessage(active ? "Device activated." : "Device deactivated.");
      setDeviceId("");
      await loadDashboard();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Device update failed.");
    }
  }

  if (!authorized) {
    return (
      <main className="min-h-screen bg-[#f6f3ec] text-ink">
        <div className="mx-auto grid min-h-screen w-full max-w-md content-center px-5">
        <form onSubmit={login} className="rounded-lg border border-ink/10 bg-white p-6 shadow-sm">
          <h1 className="mb-5 text-3xl font-semibold">Admin login</h1>
          <label className="text-sm font-semibold" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            className="mt-2 w-full rounded-md border border-ink/15 px-3 py-3 outline-none focus:border-moss focus:ring-4 focus:ring-moss/15"
            required
          />
          <button className="mt-4 w-full rounded-md bg-ink px-4 py-3 font-semibold text-white hover:bg-moss">
            Login
          </button>
          {error && <p className="mt-4 text-sm text-rust">{error}</p>}
        </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f3ec] text-ink">
      <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 pb-5">
        <Link className="flex items-center gap-3" href="/">
          <TransoraLogo size="sm" />
          <span className="text-sm font-semibold uppercase tracking-[0.14em] text-ink/55">Admin</span>
        </Link>
        <button
          onClick={() => {
            sessionStorage.removeItem("transora_admin_password");
            setAuthorized(false);
          }}
          className="rounded-md border border-ink/15 px-4 py-2 text-sm font-semibold hover:border-rust hover:text-rust"
        >
          Logout
        </button>
      </header>

      {(message || error) && (
        <div
          className={`mb-5 rounded-md p-3 text-sm ${
            error ? "bg-rust/10 text-rust" : "bg-skywash/80 text-ink"
          }`}
        >
          {error || message}
        </div>
      )}

      <section className="mb-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-ink/10 bg-white p-4">
          <div className="text-sm text-ink/62">Devices</div>
          <div className="mt-2 text-3xl font-semibold">{devices.length}</div>
        </div>
        <div className="rounded-lg border border-ink/10 bg-white p-4">
          <div className="text-sm text-ink/62">Active premium</div>
          <div className="mt-2 text-3xl font-semibold">
            {devices.filter((device) => device.premiumActive).length}
          </div>
        </div>
        <div className="rounded-lg border border-ink/10 bg-white p-4">
          <div className="text-sm text-ink/62">Total videos</div>
          <div className="mt-2 text-3xl font-semibold">
            {usage.reduce((sum, row) => sum + row.count, 0)}
          </div>
        </div>
      </section>

      <section className="mb-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-ink/10 bg-white p-5">
          <h2 className="mb-4 text-xl font-semibold">Premium codes</h2>
          <button
            onClick={createCode}
            className="mb-4 rounded-md bg-moss px-4 py-2 text-sm font-semibold text-white hover:bg-ink"
          >
            Create code
          </button>
          <div className="max-h-80 overflow-auto text-sm">
            {codes.map((code) => (
              <div key={code.id} className="border-t border-ink/10 py-3">
                <div className="font-mono font-semibold">{code.code}</div>
                <div className="text-ink/64">
                  {code.active ? "Active" : "Inactive"}
                  {code.usedByDeviceId ? ` · Used by ${code.usedByDeviceId}` : ""}
                  {code.expiresAt ? ` · Expires ${new Date(code.expiresAt).toLocaleDateString()}` : ""}
                </div>
              </div>
            ))}
            {codes.length === 0 && <div className="text-ink/64">No codes yet.</div>}
          </div>
        </div>

        <div className="rounded-lg border border-ink/10 bg-white p-5">
          <h2 className="mb-4 text-xl font-semibold">Device activation</h2>
          <input
            value={deviceId}
            onChange={(event) => setDeviceId(event.target.value)}
            placeholder="Device ID"
            className="w-full rounded-md border border-ink/15 px-3 py-3 outline-none focus:border-moss focus:ring-4 focus:ring-moss/15"
          />
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setPremium(true)}
              disabled={!deviceId}
              className="rounded-md bg-moss px-4 py-2 text-sm font-semibold text-white hover:bg-ink disabled:bg-ink/35"
            >
              Activate
            </button>
            <button
              onClick={() => setPremium(false)}
              disabled={!deviceId}
              className="rounded-md bg-rust px-4 py-2 text-sm font-semibold text-white hover:bg-ink disabled:bg-ink/35"
            >
              Deactivate
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-ink/10 bg-white p-5">
        <h2 className="mb-4 text-xl font-semibold">Submitted devices</h2>
        <div className="overflow-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-ink/12">
                <th className="py-3 pr-4">Device ID</th>
                <th className="py-3 pr-4">Premium</th>
                <th className="py-3 pr-4">This month</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => (
                <tr key={device.deviceId} className="border-b border-ink/8">
                  <td className="py-3 pr-4 font-mono">{device.deviceId}</td>
                  <td className="py-3 pr-4">{device.premiumActive ? "Active" : "Inactive"}</td>
                  <td className="py-3 pr-4">{device.usageCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {devices.length === 0 && <div className="py-6 text-sm text-ink/64">No devices yet.</div>}
        </div>
      </section>
      </div>
    </main>
  );
}
