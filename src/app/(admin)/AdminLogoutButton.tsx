"use client";

import { useRouter } from "next/navigation";

export default function AdminLogoutButton() {
  const router = useRouter();
  async function handle() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  return (
    <button onClick={handle} className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors">
      Salir
    </button>
  );
}
