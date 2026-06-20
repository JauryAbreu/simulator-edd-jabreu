"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Evaluation {
  id: string;
  title: string;
  description: string;
  numberOfQuestions: number;
  totalPoints: number;
  timeLimitMinutes: number;
}

function EvalCard({ ev }: { ev: Evaluation }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/anonymous/evaluations/${ev.id}/start`, { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Error al iniciar");
      return;
    }
    sessionStorage.setItem(`anon_exam_${ev.id}`, JSON.stringify(data));
    router.push(`/anon/evaluations/${ev.id}/exam`);
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex-1">
        <h2 className="text-base font-bold text-gray-900">{ev.title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-gray-500">{ev.description}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-blue-50 px-3 py-2.5">
          <p className="text-xs font-medium text-blue-600">Preguntas</p>
          <p className="mt-0.5 text-xl font-bold text-blue-900">{ev.numberOfQuestions}</p>
        </div>
        <div className="rounded-xl bg-green-50 px-3 py-2.5">
          <p className="text-xs font-medium text-green-600">Puntos</p>
          <p className="mt-0.5 text-xl font-bold text-green-900">{ev.totalPoints}</p>
        </div>
        <div className="rounded-xl bg-orange-50 px-3 py-2.5">
          <p className="text-xs font-medium text-orange-600">Tiempo</p>
          <p className="mt-0.5 text-xl font-bold text-orange-900">{ev.timeLimitMinutes}m</p>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
          {error}
        </p>
      )}

      <button
        onClick={handleStart}
        disabled={loading}
        className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "Preparando examen…" : "Iniciar evaluación"}
      </button>
    </div>
  );
}

export default function AnonEvaluationsPage() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/anonymous/evaluations")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setEvaluations)
      .catch(() => setError("No se pudieron cargar las evaluaciones."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-64 animate-pulse rounded-2xl bg-gray-200" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Evaluaciones disponibles</h1>
        <p className="mt-1 text-sm text-gray-500">
          Elige una evaluación para practicar. Tu resultado se mostrará al terminar.
        </p>
      </div>

      {evaluations.length === 0 ? (
        <p className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          No hay evaluaciones disponibles en este momento.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {evaluations.map((ev) => (
            <EvalCard key={ev.id} ev={ev} />
          ))}
        </div>
      )}

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <strong>Modo anónimo:</strong> tus resultados no quedan guardados en tu perfil.
        El detalle de tu intento solo estará disponible inmediatamente después de enviar el examen.
      </div>
    </div>
  );
}
