"use client";

import { useState, useEffect } from "react";

export default function AccountPage() {
  const [profile, setProfile] = useState({ fullName: "", username: "", email: "" });
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileMsg, setProfileMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => {
      setProfile({ fullName: d.fullName ?? "", username: d.username ?? "", email: d.email ?? "" });
      setProfileLoading(false);
    });
  }, []);

  async function handleProfile(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/user/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName: profile.fullName }),
    });
    const data = await res.json();
    setProfileMsg(res.ok ? { type: "ok", text: "Nombre actualizado correctamente" } : { type: "err", text: data.error });
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) {
      setPwMsg({ type: "err", text: "Las contraseñas no coinciden" });
      return;
    }
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
      setPwMsg({ type: "ok", text: "Contraseña actualizada correctamente" });
      setPwForm({ currentPassword: "", newPassword: "", confirm: "" });
    } else {
      setPwMsg({ type: "err", text: data.error });
    }
  }

  const inputClass = "w-full rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50";

  return (
    <div className="max-w-xl space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Mi cuenta</h1>

      {/* Información básica */}
      <section aria-labelledby="profile-heading" className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 space-y-4">
        <h2 id="profile-heading" className="text-base font-semibold text-gray-800 dark:text-slate-200">
          Información personal
        </h2>

        {profileLoading ? (
          <p className="text-sm text-gray-400">Cargando...</p>
        ) : (
          <form onSubmit={handleProfile} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Usuario
              </label>
              <input id="username" type="text" value={profile.username} disabled className={inputClass} aria-readonly="true" />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Correo electrónico
              </label>
              <input id="email" type="email" value={profile.email} disabled className={inputClass} aria-readonly="true" />
              <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">El correo no se puede cambiar desde aquí.</p>
            </div>
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Nombre completo
              </label>
              <input
                id="fullName"
                type="text"
                required
                value={profile.fullName}
                onChange={(e) => setProfile((p) => ({ ...p, fullName: e.target.value }))}
                className={inputClass}
              />
            </div>

            {profileMsg && (
              <p role="alert" className={`text-sm ${profileMsg.type === "ok" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                {profileMsg.text}
              </p>
            )}
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Guardar cambios
            </button>
          </form>
        )}
      </section>

      {/* Cambiar contraseña */}
      <section aria-labelledby="password-heading" className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 space-y-4">
        <h2 id="password-heading" className="text-base font-semibold text-gray-800 dark:text-slate-200">
          Cambiar contraseña
        </h2>
        <form onSubmit={handlePassword} className="space-y-4">
          {(["currentPassword", "newPassword", "confirm"] as const).map((field) => (
            <div key={field}>
              <label htmlFor={field} className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                {field === "currentPassword" ? "Contraseña actual" : field === "newPassword" ? "Nueva contraseña" : "Confirmar nueva contraseña"}
              </label>
              <input
                id={field}
                type="password"
                required
                minLength={field === "currentPassword" ? 1 : 8}
                autoComplete={field === "currentPassword" ? "current-password" : "new-password"}
                value={pwForm[field]}
                onChange={(e) => setPwForm((f) => ({ ...f, [field]: e.target.value }))}
                className={inputClass}
              />
            </div>
          ))}

          {pwMsg && (
            <p role="alert" className={`text-sm ${pwMsg.type === "ok" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              {pwMsg.text}
            </p>
          )}
          <button
            type="submit"
            disabled={pwLoading}
            className="rounded-md bg-gray-800 dark:bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors"
          >
            {pwLoading ? "Actualizando..." : "Actualizar contraseña"}
          </button>
        </form>
      </section>
    </div>
  );
}
