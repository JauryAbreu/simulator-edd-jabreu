"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface ReviewItem {
  questionId: string;
  questionText: string;
  explanation: string | null;
  selectedOptionId: string | null;
  selectedOptionText: string | null;
  correctOptionId: string;
  correctOptionText: string;
  isCorrect: boolean;
  pointsEarned: number;
}

interface AnonResult {
  score: number;
  totalPoints: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  durationSeconds: number;
  status: "COMPLETED" | "OUT_OF_TIME";
  review: ReviewItem[];
  auto?: boolean;
}

const PIE_COLORS = {
  correct:     "#16a34a",
  incorrect:   "#dc2626",
  unanswered:  "#94a3b8",
};

export default function AnonResultsPage() {
  const { id: evaluationId } = useParams<{ id: string }>();
  const [result, setResult] = useState<AnonResult | null>(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem(`anon_result_${evaluationId}`);
    if (!raw) { setExpired(true); return; }
    sessionStorage.removeItem(`anon_result_${evaluationId}`);
    setResult(JSON.parse(raw) as AnonResult);
  }, [evaluationId]);

  if (expired) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
          <svg className="h-7 w-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-gray-700">Resultado ya no disponible</h2>
        <p className="max-w-xs text-sm text-gray-500">
          El detalle del intento solo está disponible inmediatamente después de enviar el examen.
          Vuelve a intentarlo para ver un nuevo resultado.
        </p>
        <Link href="/anon/evaluations"
          className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
          Ver evaluaciones
        </Link>
      </div>
    );
  }

  if (!result) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;
  }

  const pct = Math.round((result.score / result.totalPoints) * 100);
  const scoreColor = pct >= 70 ? "text-green-700" : pct >= 50 ? "text-yellow-700" : "text-red-700";
  const scoreBg    = pct >= 70 ? "bg-green-50 border-green-200" : pct >= 50 ? "bg-yellow-50 border-yellow-200" : "bg-red-50 border-red-200";

  const chartData = [
    { name: "Correctas",     value: result.correctCount,    color: PIE_COLORS.correct },
    { name: "Incorrectas",   value: result.incorrectCount,  color: PIE_COLORS.incorrect },
    { name: "Sin responder", value: result.unansweredCount, color: PIE_COLORS.unanswered },
  ].filter((d) => d.value > 0);

  const mins = Math.floor(result.durationSeconds / 60);
  const secs = result.durationSeconds % 60;

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Resultados</h1>
        <Link href="/anon/evaluations"
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          ← Volver a evaluaciones
        </Link>
      </div>

      {result.auto && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-800">
          ⏱ Tiempo agotado — el examen fue enviado automáticamente.
        </div>
      )}
      {result.status === "OUT_OF_TIME" && !result.auto && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          Este intento fue marcado como fuera de tiempo.
        </div>
      )}

      {/* Score summary */}
      <div className={`rounded-2xl border p-6 text-center ${scoreBg}`}>
        <p className={`text-5xl font-bold ${scoreColor}`}>
          {result.score} / {result.totalPoints}
        </p>
        <p className={`text-lg font-semibold mt-1 ${scoreColor}`}>{pct}%</p>
        <div className="mt-4 flex flex-wrap justify-center gap-6 text-sm text-gray-600">
          <span><span className="font-bold text-green-700">{result.correctCount}</span> correctas</span>
          <span><span className="font-bold text-red-600">{result.incorrectCount}</span> incorrectas</span>
          <span><span className="font-bold text-gray-500">{result.unansweredCount}</span> sin responder</span>
          <span><span className="font-bold text-gray-700">{mins}m {secs}s</span></span>
        </div>
      </div>

      {/* Pie chart */}
      {chartData.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Distribución de respuestas</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                dataKey="value"
                paddingAngle={3}
              >
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value} pregunta${Number(value) !== 1 ? "s" : ""}`]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Per-question review */}
      <div className="space-y-4">
        <h2 className="font-semibold text-gray-800">Revisión detallada</h2>
        {result.review.map((item, idx) => (
          <div
            key={item.questionId}
            className={`rounded-2xl border p-5 space-y-3 ${
              item.isCorrect
                ? "border-green-200 bg-green-50"
                : item.selectedOptionId
                ? "border-red-200 bg-red-50"
                : "border-gray-200 bg-gray-50"
            }`}
          >
            <div className="flex items-start gap-2">
              <span className="text-xs font-medium text-gray-400 mt-0.5 shrink-0">{idx + 1}.</span>
              <p className="text-sm font-medium text-gray-900 flex-1">{item.questionText}</p>
              <span className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                item.isCorrect
                  ? "bg-green-200 text-green-800"
                  : item.selectedOptionId
                  ? "bg-red-200 text-red-800"
                  : "bg-gray-200 text-gray-700"
              }`}>
                {item.isCorrect ? "✓ Correcta" : item.selectedOptionId ? "✗ Incorrecta" : "— Sin responder"}
              </span>
            </div>

            {item.selectedOptionText && !item.isCorrect && (
              <p className="text-sm text-gray-700 pl-5">
                <span className="font-medium">Tu respuesta:</span> {item.selectedOptionText}
              </p>
            )}

            {!item.isCorrect && (
              <p className="text-sm text-gray-700 pl-5">
                <span className="font-medium text-green-700">Respuesta correcta:</span> {item.correctOptionText}
              </p>
            )}

            {item.explanation && (
              <div className="pl-5">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-0.5">Explicación</p>
                <p className="text-sm text-gray-700">{item.explanation}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-900">¿Quieres guardar tus resultados?</p>
          <p className="text-xs text-blue-700 mt-0.5">Crea una cuenta para ver tu historial y estadísticas.</p>
        </div>
        <Link href="/login?tab=register"
          className="shrink-0 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
          Crear cuenta gratis
        </Link>
      </div>
    </div>
  );
}
