"use client";

import { LogOut, UserCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export function UserProfileMenu() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }
  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-sm font-medium text-slate-600 sm:inline">Mukilan</span>
      <UserCircle className="text-ocean" />
      <button className="rounded-lg p-2 text-slate-600 hover:bg-cloud" onClick={logout} title="Logout">
        <LogOut size={18} />
      </button>
    </div>
  );
}
