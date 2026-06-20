"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Evaluation {
  id: string;
  title: string;
  description: string;
  numberOfQuestions: number;
  totalPoints: number;
  timeLimitMinutes: number;
  isActive: boolean;
  _count: { questions: number; attempts: number };
}

const emptyForm = { title: "", description: "", numberOfQuestions: 5, totalPoints: 100, timeLimitMinutes: 30, isActive: false };

export default function AdminEvaluationsPage() {
  const [evals, setEvals] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Evaluation | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/evaluations");
    if (res.ok) setEvals(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setShowForm(true);
  }

  function openEdit(ev: Evaluation) {
    setEditing(ev);
    setForm({ title: ev.title, description: ev.description, numberOfQuestions: ev.numberOfQuestions, totalPoints: ev.totalPoints, timeLimitMinutes: ev.timeLimitMinutes, isActive: ev.isActive });
    setError(null);
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const body = { ...form, numberOfQuestions: Number(form.numberOfQuestions), totalPoints: Number(form.totalPoints), timeLimitMinutes: Number(form.timeLimitMinutes) };
    const res = await fetch(editing ? `/api/admin/evaluations/${editing.id}` : "/api/admin/evaluations", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error); return; }
    setShowForm(false);
    load();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/admin/evaluations/${id}`, { method: "DELETE" });
    setDeleteId(null);
    load();
  }

  const inputClass = "w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">Evaluaciones</h1>
        <button onClick={openCreate} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
          + Nueva evaluación
        </button>
      </div>

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="eval-form-title">
          <div className="w-full max-w-lg rounded-xl bg-slate-800 p-6 space-y-4 shadow-xl">
            <h2 id="eval-form-title" className="text-lg font-bold text-slate-100">{editing ? "Editar evaluación" : "Nueva evaluación"}</h2>
            <form onSubmit={handleSave} className="space-y-3">
              {error && <p role="alert" className="text-sm text-red-400 rounded-md bg-red-900/30 p-2">{error}</p>}
              <div>
                <label htmlFor="ev-title" className="block text-xs font-medium text-slate-400 mb-1">Título</label>
                <input id="ev-title" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label htmlFor="ev-desc" className="block text-xs font-medium text-slate-400 mb-1">Descripción</label>
                <textarea id="ev-desc" required rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={inputClass} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                {([ ["numberOfQuestions", "Nº preguntas"], ["totalPoints", "Puntos"], ["timeLimitMinutes", "Tiempo (min)"] ] as const).map(([key, label]) => (
                  <div key={key}>
                    <label htmlFor={`ev-${key}`} className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
                    <input id={`ev-${key}`} type="number" min={1} required value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} className={inputClass} />
                  </div>
                ))}
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} className="rounded accent-blue-500" />
                <span className="text-sm text-slate-300">Activa (visible para usuarios)</span>
              </label>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="rounded-md px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="alertdialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-xl bg-slate-800 p-6 space-y-4">
            <p className="text-slate-100 font-medium">¿Eliminar esta evaluación? Se eliminarán todas sus preguntas e intentos.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteId(null)} className="rounded-md px-4 py-2 text-sm text-slate-400 hover:text-slate-200">Cancelar</button>
              <button onClick={() => handleDelete(deleteId)} className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-slate-400 text-sm">Cargando...</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-900">
                {["Título", "Preguntas", "Tiempo", "Intentos", "Estado", "Acciones"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {evals.map((ev) => (
                <tr key={ev.id} className="hover:bg-slate-700/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-100">{ev.title}</td>
                  <td className="px-4 py-3 text-slate-300">
                    <span className={ev._count.questions < ev.numberOfQuestions ? "text-orange-400" : "text-slate-300"}>
                      {ev._count.questions}
                    </span>/{ev.numberOfQuestions}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{ev.timeLimitMinutes} min</td>
                  <td className="px-4 py-3 text-slate-300">{ev._count.attempts}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ev.isActive ? "bg-green-900/50 text-green-300" : "bg-slate-700 text-slate-400"}`}>
                      {ev.isActive ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(ev)} className="text-xs text-blue-400 hover:underline">Editar</button>
                      <Link href={`/admin/evaluations/${ev.id}/questions`} className="text-xs text-slate-400 hover:underline">Preguntas</Link>
                      <button onClick={() => setDeleteId(ev.id)} className="text-xs text-red-400 hover:underline">Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
              {evals.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No hay evaluaciones</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
