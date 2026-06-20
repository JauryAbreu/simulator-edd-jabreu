"use client";

import { useState } from "react";

export default function AdminProfileClient({ initialName }: { initialName: string }) {
  const [editName, setEditName] = useState(initialName);
  const [profileMsg, setProfileMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  const inputCls =
    "w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50";

  async function handleProfile(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/user/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName: editName }),
    });
    const data = await res.json();
    setProfileMsg(res.ok ? { type: "ok", text: "Nombre actualizado" } : { type: "err", text: data.error });
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) { setPwMsg({ type: "err", text: "Las contraseñas no coinciden" }); return; }
    setPwLoading(true);
    setPwMsg(null);
    const res = await fetch("/api/user/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }),
    });
    const data = await res.json();
    setPwLoading(false);
    if (res.ok) {
      setPwMsg({ type: "ok", text: "Contraseña actualizada" });
      setPwForm({ currentPassword: "", newPassword: "", confirm: "" });
    } else {
      setPwMsg({ type: "err", text: data.error });
    }
  }

  return (
    <>
      <section className="rounded-xl border border-slate-700 bg-slate-800 p-5 space-y-4">
        <h2 className="text-base font-semibold text-slate-200">Información personal</h2>
        <form onSubmit={handleProfile} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-400">Nombre completo</label>
            <input type="text" required value={editName} onChange={(e) => setEditName(e.target.value)} className={inputCls} />
          </div>
          {profileMsg && (
            <p role="alert" className={`text-sm ${profileMsg.type === "ok" ? "text-green-400" : "text-red-400"}`}>{profileMsg.text}</p>
          )}
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
            Guardar
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-800 p-5 space-y-4">
        <h2 className="text-base font-semibold text-slate-200">Cambiar contraseña</h2>
        <form onSubmit={handlePassword} className="space-y-3">
          {(["currentPassword", "newPassword", "confirm"] as const).map((field) => (
            <div key={field}>
              <label className="mb-1 block text-sm font-medium text-slate-400">
                {field === "currentPassword" ? "Contraseña actual" : field === "newPassword" ? "Nueva contraseña" : "Confirmar"}
              </label>
              <input
                type="password"
                required
                minLength={field === "currentPassword" ? 1 : 8}
                autoComplete={field === "currentPassword" ? "current-password" : "new-password"}
                value={pwForm[field]}
                onChange={(e) => setPwForm((f) => ({ ...f, [field]: e.target.value }))}
                className={inputCls}
              />
            </div>
          ))}
          {pwMsg && (
            <p role="alert" className={`text-sm ${pwMsg.type === "ok" ? "text-green-400" : "text-red-400"}`}>{pwMsg.text}</p>
          )}
          <button type="submit" disabled={pwLoading} className="rounded-lg bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-500 disabled:opacity-50 transition-colors">
            {pwLoading ? "Actualizando..." : "Actualizar contraseña"}
          </button>
        </form>
      </section>
    </>
  );
}
