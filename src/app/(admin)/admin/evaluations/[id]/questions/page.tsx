"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

interface Option { id?: string; text: string; isCorrect: boolean }
interface Question { id: string; text: string; explanation?: string; difficulty: string; isActive: boolean; options: Option[] }

const DIFF_LABELS: Record<string, string> = { BAJA: "Baja", MEDIA: "Media", ALTA: "Alta" };

const emptyQuestion = (): { text: string; explanation: string; difficulty: "BAJA" | "MEDIA" | "ALTA"; options: Option[] } => ({
  text: "", explanation: "", difficulty: "MEDIA",
  options: [
    { text: "", isCorrect: true },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ],
});

export default function QuestionsPage() {
  const { id: evaluationId } = useParams<{ id: string }>();
  const router = useRouter();
  const [evalInfo, setEvalInfo] = useState<{ title: string; numberOfQuestions: number } | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);
  const [form, setForm] = useState(emptyQuestion());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvResult, setCsvResult] = useState<string | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [evRes, qRes] = await Promise.all([
      fetch(`/api/admin/evaluations/${evaluationId}`),
      fetch(`/api/admin/evaluations/${evaluationId}/questions`),
    ]);
    if (evRes.ok) setEvalInfo(await evRes.json());
    if (qRes.ok) setQuestions(await qRes.json());
    setLoading(false);
  }, [evaluationId]);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(emptyQuestion());
    setError(null);
    setShowForm(true);
  }

  function openEdit(q: Question) {
    setEditing(q);
    setForm({ text: q.text, explanation: q.explanation ?? "", difficulty: q.difficulty as "BAJA" | "MEDIA" | "ALTA",
      options: q.options.map(({ id, text, isCorrect }) => ({ id, text, isCorrect })) });
    setError(null);
    setShowForm(true);
  }

  function setOptionField(i: number, field: keyof Option, value: string | boolean) {
    setForm((f) => {
      const opts = [...f.options];
      if (field === "isCorrect") {
        opts.forEach((o, j) => { opts[j] = { ...o, isCorrect: j === i }; });
      } else {
        opts[i] = { ...opts[i], [field]: value };
      }
      return { ...f, options: opts };
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const url = editing
      ? `/api/admin/evaluations/${evaluationId}/questions/${editing.id}`
      : `/api/admin/evaluations/${evaluationId}/questions`;
    const res = await fetch(url, {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error ?? JSON.stringify(data.details)); return; }
    setShowForm(false);
    load();
  }

  async function handleToggleActive(q: Question) {
    await fetch(`/api/admin/evaluations/${evaluationId}/questions/${q.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !q.isActive }),
    });
    load();
  }

  async function handleDelete(qid: string) {
    if (!confirm("¿Eliminar esta pregunta?")) return;
    await fetch(`/api/admin/evaluations/${evaluationId}/questions/${qid}`, { method: "DELETE" });
    load();
  }

  async function handleCsvImport() {
    if (!csvFile) return;
    setCsvLoading(true);
    setCsvResult(null);
    const fd = new FormData();
    fd.append("file", csvFile);
    const res = await fetch(`/api/admin/evaluations/${evaluationId}/questions/import`, { method: "POST", body: fd });
    const data = await res.json();
    setCsvLoading(false);
    setCsvResult(`Importadas: ${data.created}/${data.total}. Errores: ${data.errors?.length ?? 0}`);
    load();
  }

  const activeCount = questions.filter((q) => q.isActive).length;
  const targetN = evalInfo?.numberOfQuestions ?? 0;
  const inputClass = "w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-200 text-sm">← Volver</button>
        <h1 className="text-xl font-bold text-slate-100">{evalInfo?.title ?? "Preguntas"}</h1>
        <span className={`ml-auto rounded-full px-3 py-1 text-xs font-semibold ${activeCount >= targetN ? "bg-green-900/50 text-green-300" : "bg-orange-900/50 text-orange-300"}`}>
          {activeCount} activas / {targetN} requeridas
        </span>
        <button onClick={openCreate} className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700">+ Pregunta</button>
      </div>

      {/* CSV Import */}
      <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 flex flex-wrap items-center gap-3">
        <span className="text-sm text-slate-300 font-medium">Importar CSV:</span>
        <input type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
          className="text-sm text-slate-400 file:mr-2 file:rounded file:border-0 file:bg-slate-700 file:px-3 file:py-1 file:text-slate-200 file:text-xs hover:file:bg-slate-600" />
        <button onClick={handleCsvImport} disabled={!csvFile || csvLoading}
          className="rounded-md bg-slate-700 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-600 disabled:opacity-40 transition-colors">
          {csvLoading ? "Importando..." : "Importar"}
        </button>
        {csvResult && <span className="text-xs text-slate-400">{csvResult}</span>}
        <a href="#csv-format" className="text-xs text-blue-400 hover:underline ml-auto">Ver formato</a>
      </div>

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="w-full max-w-2xl rounded-xl bg-slate-800 p-6 space-y-4 my-8 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-100">{editing ? "Editar pregunta" : "Nueva pregunta"}</h2>
            <form onSubmit={handleSave} className="space-y-3">
              {error && <p role="alert" className="text-sm text-red-400 bg-red-900/30 rounded-md p-2">{error}</p>}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Texto de la pregunta</label>
                <textarea required rows={3} value={form.text} onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Explicación (opcional)</label>
                  <input type="text" value={form.explanation} onChange={(e) => setForm((f) => ({ ...f, explanation: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Dificultad</label>
                  <select value={form.difficulty} onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value as "BAJA" | "MEDIA" | "ALTA" }))} className={inputClass}>
                    {["BAJA", "MEDIA", "ALTA"].map((d) => <option key={d} value={d}>{DIFF_LABELS[d]}</option>)}
                  </select>
                </div>
              </div>
              <fieldset>
                <legend className="text-xs font-medium text-slate-400 mb-2">Opciones (marca la correcta)</legend>
                <div className="space-y-2">
                  {form.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input type="radio" name="correct" checked={opt.isCorrect} onChange={() => setOptionField(i, "isCorrect", true)} className="accent-blue-500 shrink-0" aria-label={`Opción ${i + 1} correcta`} />
                      <input required type="text" placeholder={`Opción ${i + 1}`} value={opt.text} onChange={(e) => setOptionField(i, "text", e.target.value)} className={inputClass} />
                    </div>
                  ))}
                </div>
              </fieldset>
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

      {loading ? <p className="text-slate-400 text-sm">Cargando...</p> : (
        <div className="space-y-2">
          {questions.map((q, i) => (
            <div key={q.id} className={`rounded-xl border p-4 space-y-2 ${q.isActive ? "border-slate-700 bg-slate-800" : "border-slate-800 bg-slate-900 opacity-60"}`}>
              <div className="flex items-start gap-2">
                <span className="text-slate-500 text-xs font-mono mt-0.5 shrink-0">{i + 1}.</span>
                <p className="flex-1 text-sm text-slate-200">{q.text}</p>
                <div className="flex gap-2 shrink-0">
                  <span className={`rounded px-1.5 py-0.5 text-xs ${q.difficulty === "ALTA" ? "bg-red-900/50 text-red-300" : q.difficulty === "MEDIA" ? "bg-yellow-900/50 text-yellow-300" : "bg-green-900/50 text-green-300"}`}>
                    {DIFF_LABELS[q.difficulty]}
                  </span>
                  <button onClick={() => openEdit(q)} className="text-xs text-blue-400 hover:underline">Editar</button>
                  <button onClick={() => handleToggleActive(q)} className="text-xs text-slate-400 hover:underline">{q.isActive ? "Desactivar" : "Activar"}</button>
                  <button onClick={() => handleDelete(q.id)} className="text-xs text-red-400 hover:underline">Eliminar</button>
                </div>
              </div>
              <div className="pl-5 flex flex-wrap gap-2">
                {q.options.map((o) => (
                  <span key={o.id} className={`rounded px-2 py-0.5 text-xs ${o.isCorrect ? "bg-green-900/50 text-green-300 font-semibold" : "bg-slate-700 text-slate-400"}`}>
                    {o.text}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {questions.length === 0 && <p className="text-slate-500 text-sm text-center py-8">Sin preguntas aún. Crea una o importa desde CSV.</p>}
        </div>
      )}

      {/* Formato CSV */}
      <details id="csv-format" className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-slate-400">
        <summary className="cursor-pointer text-slate-300 font-medium">Formato CSV esperado</summary>
        <pre className="mt-3 text-xs overflow-x-auto bg-slate-950 p-3 rounded">{`text,explanation,difficulty,opt1,opt1_correct,opt2,opt2_correct,opt3,opt3_correct,opt4,opt4_correct
"¿Cuánto es 2+2?","Suma simple","BAJA","3",false,"4",true,"5",false,"6",false
"Capital de Francia?","Geografía","MEDIA","Londres",false,"París",true,"Berlín",false,"Roma",false`}</pre>
        <p className="mt-2 text-xs">• difficulty: BAJA | MEDIA | ALTA &nbsp;•&nbsp; opt_correct: true | false &nbsp;•&nbsp; Exactamente un true por fila</p>
      </details>
    </div>
  );
}
