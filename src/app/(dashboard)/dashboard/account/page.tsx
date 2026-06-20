"use client";

import { useState, useEffect } from "react";
import { Avatar } from "@/components/Avatar";

interface MeData {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  role: "USER" | "ADMIN";
  createdAt: string;
  updatedAt: string;
  _count: { attempts: number };
}

interface AttemptStats {
  totalAttempts: number;
  avgPct: number;
  bestPct: number;
}

export default function AccountPage() {
  const [me, setMe] = useState<MeData | null>(null);
  const [stats, setStats] = useState<AttemptStats | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [editName, setEditName] = useState("");
  const [profileMsg, setProfileMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/user/stats").then((r) => r.ok ? r.json() : null),
    ]).then(([meData, statsData]) => {
      setMe(meData);
      setEditName(meData.fullName ?? "");
      if (statsData) setStats(statsData);
      setProfileLoading(false);
    });
  }, []);

  async function handleProfile(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/user/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName: editName }),
    });
    const data = await res.json();
    if (res.ok) {
      setMe((prev) => prev ? { ...prev, fullName: editName } : prev);
      setProfileMsg({ type: "ok", text: "Nombre actualizado correctamente" });
    } else {
      setProfileMsg({ type: "err", text: data.error });
    }
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
      setPwMsg({ type: "ok", text: "Contraseña actualizada" });
      setPwForm({ currentPassword: "", newPassword: "", confirm: "" });
    } else {
      setPwMsg({ type: "err", text: data.error });
    }
  }

  const inputCls =
    "w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
    + " " + "border-gray-200 bg-white text-gray-900 dark:border-slate-700";

  if (profileLoading) {
    return (
      <div className="max-w-xl mx-auto space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-slate-800" />
        ))}
      </div>
    );
  }

  const memberSince = me ? new Date(me.createdAt).toLocaleDateString("es-DO", { day: "2-digit", month: "long", year: "numeric" }) : "";
  const lastActive  = me ? new Date(me.updatedAt).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" }) : "";

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Mi perfil</h1>

      {/* Avatar header card */}
      {me && (
        <div className="flex items-center gap-4 rounded-xl border bg-white p-5 dark:bg-slate-900"
          style={{ borderColor: "var(--border-color)" }}>
          <Avatar name={me.fullName || me.username} size="xl" />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold truncate" style={{ color: "var(--text-primary)" }}>{me.fullName}</h2>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>@{me.username}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${me.role === "ADMIN" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"}`}>
                {me.role}
              </span>
              <span className="text-xs" style={{ color: "var(--text-subtle)" }}>Miembro desde {memberSince}</span>
              <span className="text-xs" style={{ color: "var(--text-subtle)" }}>Activo {lastActive}</span>
            </div>
          </div>
        </div>
      )}

      {/* Activity stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Intentos", value: me?._count.attempts ?? 0 },
          { label: "Promedio", value: stats ? `${stats.avgPct}%` : "—" },
          { label: "Mejor",    value: stats ? `${stats.bestPct}%` : "—" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-white p-4 text-center dark:bg-slate-900"
            style={{ borderColor: "var(--border-color)" }}>
            <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{s.value}</p>
            <p className="mt-0.5 text-xs" style={{ color: "var(--text-secondary)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Edit name */}
      <section className="rounded-xl border bg-white p-5 space-y-4 dark:bg-slate-900"
        style={{ borderColor: "var(--border-color)" }}>
        <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Información personal</h2>
        <form onSubmit={handleProfile} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Usuario</label>
            <input type="text" value={me?.username ?? ""} disabled className={inputCls} aria-readonly="true" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Correo</label>
            <input type="email" value={me?.email ?? ""} disabled className={inputCls} aria-readonly="true" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Nombre completo</label>
            <input type="text" required value={editName} onChange={(e) => setEditName(e.target.value)} className={inputCls} />
          </div>
          {profileMsg && (
            <p role="alert" className={`text-sm ${profileMsg.type === "ok" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              {profileMsg.text}
            </p>
          )}
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
            Guardar cambios
          </button>
        </form>
      </section>

      {/* Change password */}
      <section className="rounded-xl border bg-white p-5 space-y-4 dark:bg-slate-900"
        style={{ borderColor: "var(--border-color)" }}>
        <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Cambiar contraseña</h2>
        <form onSubmit={handlePassword} className="space-y-3">
          {(["currentPassword", "newPassword", "confirm"] as const).map((field) => (
            <div key={field}>
              <label className="mb-1 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
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
                className={inputCls}
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
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 transition-colors dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            {pwLoading ? "Actualizando..." : "Actualizar contraseña"}
          </button>
        </form>
      </section>
    </div>
  );
}
