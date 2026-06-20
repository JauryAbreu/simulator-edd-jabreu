"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";

interface User {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  role: "ADMIN" | "USER";
  createdAt: string;
  _count: { attempts: number };
}

const emptyForm = { username: "", fullName: "", email: "", password: "", role: "USER" as "ADMIN" | "USER" };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [resetId, setResetId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setShowForm(true);
  }

  function openEdit(u: User) {
    setEditing(u);
    setForm({ username: u.username, fullName: u.fullName, email: u.email ?? "", password: "", role: u.role });
    setError(null);
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body: Record<string, unknown> = {
      username: form.username,
      fullName: form.fullName,
      email: form.email || undefined,
      role: form.role,
    };
    if (!editing) body.password = form.password;
    const res = await fetch(editing ? `/api/admin/users/${editing.id}` : "/api/admin/users", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error ?? JSON.stringify(data.details)); return; }
    setShowForm(false);
    load();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    setDeleteId(null);
    load();
  }

  async function handleResetPassword() {
    if (!resetId || !newPassword) return;
    setResetLoading(true);
    setResetMsg(null);
    const res = await fetch(`/api/admin/users/${resetId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resetPassword: newPassword }),
    });
    setResetLoading(false);
    if (res.ok) {
      setResetMsg("Contraseña restablecida exitosamente");
      setNewPassword("");
    } else {
      const d = await res.json();
      setResetMsg(d.error ?? "Error al restablecer");
    }
  }

  const filtered = users.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.fullName.toLowerCase().includes(search.toLowerCase()) ||
    (u.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const inputClass = "w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-100">Usuarios</h1>
        <button onClick={openCreate} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
          + Nuevo usuario
        </button>
      </div>

      <input
        type="search"
        placeholder="Buscar por usuario, nombre o correo..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className={inputClass}
        aria-label="Buscar usuarios"
      />

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="user-form-title">
          <div className="w-full max-w-md rounded-xl bg-slate-800 p-6 space-y-4 shadow-xl">
            <h2 id="user-form-title" className="text-lg font-bold text-slate-100">{editing ? "Editar usuario" : "Nuevo usuario"}</h2>
            <form onSubmit={handleSave} className="space-y-3">
              {error && <p role="alert" className="text-sm text-red-400 bg-red-900/30 rounded-md p-2">{error}</p>}
              <div>
                <label htmlFor="u-username" className="block text-xs font-medium text-slate-400 mb-1">Nombre de usuario</label>
                <input id="u-username" required value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} className={inputClass} autoComplete="off" />
              </div>
              <div>
                <label htmlFor="u-fullname" className="block text-xs font-medium text-slate-400 mb-1">Nombre completo</label>
                <input id="u-fullname" required value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label htmlFor="u-email" className="block text-xs font-medium text-slate-400 mb-1">Correo electrónico (opcional)</label>
                <input id="u-email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={inputClass} />
              </div>
              {!editing && (
                <div>
                  <label htmlFor="u-password" className="block text-xs font-medium text-slate-400 mb-1">Contraseña</label>
                  <input id="u-password" type="password" required minLength={8} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className={inputClass} autoComplete="new-password" />
                </div>
              )}
              <div>
                <label htmlFor="u-role" className="block text-xs font-medium text-slate-400 mb-1">Rol</label>
                <select id="u-role" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as "ADMIN" | "USER" }))} className={inputClass}>
                  <option value="USER">Usuario</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200">Cancelar</button>
                <button type="submit" disabled={saving} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset password modal */}
      {resetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="reset-pw-title">
          <div className="w-full max-w-sm rounded-xl bg-slate-800 p-6 space-y-4 shadow-xl">
            <h2 id="reset-pw-title" className="text-lg font-bold text-slate-100">Restablecer contraseña</h2>
            <p className="text-sm text-slate-400">
              Usuario: <strong className="text-slate-200">{users.find((u) => u.id === resetId)?.username}</strong>
            </p>
            <div>
              <label htmlFor="new-pw" className="block text-xs font-medium text-slate-400 mb-1">Nueva contraseña</label>
              <input id="new-pw" type="password" minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass} autoComplete="new-password" />
            </div>
            {resetMsg && (
              <p className={`text-sm ${resetMsg.includes("exitosamente") ? "text-green-400" : "text-red-400"}`}>{resetMsg}</p>
            )}
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setResetId(null); setNewPassword(""); setResetMsg(null); }} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200">Cerrar</button>
              <button onClick={handleResetPassword} disabled={!newPassword || resetLoading}
                className="rounded-md bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50">
                {resetLoading ? "Restableciendo..." : "Restablecer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="alertdialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-xl bg-slate-800 p-6 space-y-4">
            <p className="text-slate-100 font-medium">
              ¿Eliminar al usuario <strong>{users.find((u) => u.id === deleteId)?.username}</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200">Cancelar</button>
              <button onClick={() => handleDelete(deleteId)} className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-slate-400 text-sm">Cargando...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-900">
                {["Usuario", "Nombre", "Correo", "Rol", "Intentos", "Creado", "Acciones"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-slate-700/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-slate-200 text-xs">{u.username}</td>
                  <td className="px-4 py-3 text-slate-300">{u.fullName}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{u.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${u.role === "ADMIN" ? "bg-purple-900/50 text-purple-300" : "bg-slate-700 text-slate-400"}`}>
                      {u.role === "ADMIN" ? "Admin" : "Usuario"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300 text-center">{u._count?.attempts ?? 0}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{new Date(u.createdAt).toLocaleDateString("es-DO")}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 flex-wrap">
                      <Link href={`/admin/users/${u.id}`} className="text-xs text-sky-400 hover:underline">Intentos</Link>
                      <button onClick={() => openEdit(u)} className="text-xs text-blue-400 hover:underline">Editar</button>
                      <button onClick={() => { setResetId(u.id); setNewPassword(""); setResetMsg(null); }} className="text-xs text-orange-400 hover:underline">Reset PW</button>
                      <a href={`/api/admin/export?type=user&id=${u.id}`} className="text-xs text-green-400 hover:underline">CSV</a>
                      <button onClick={() => setDeleteId(u.id)} className="text-xs text-red-400 hover:underline">Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">{search ? "Sin resultados" : "No hay usuarios"}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
