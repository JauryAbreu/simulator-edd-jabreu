export const runtime = "nodejs";

import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/auth/tokens";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

interface Props {
  params: Promise<{ id: string; attemptId: string }>;
  searchParams: Promise<{ reason?: string }>;
}

export default async function ResultsPage({ params, searchParams }: Props) {
  const { id: evaluationId, attemptId } = await params;
  const { reason } = await searchParams;

  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  let userId: string | null = null;
  if (token) {
    try {
      const p = await verifyAccessToken(token);
      userId = p.sub;
    } catch {
      /* middleware ya validó, esto es solo para filtrar por usuario */
    }
  }

  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId, evaluationId },
    include: {
      evaluation: { select: { title: true, totalPoints: true } },
      answers: {
        include: {
          question: { select: { text: true, explanation: true } },
          selectedOption: { select: { text: true } },
        },
      },
    },
  });

  if (!attempt || (userId && attempt.userId !== userId)) notFound();

  const pct = Math.round((attempt.score / attempt.evaluation.totalPoints) * 100);

  const scoreColor =
    pct >= 70 ? "text-green-700" : pct >= 50 ? "text-yellow-700" : "text-red-700";
  const scoreBg = pct >= 70 ? "bg-green-50" : pct >= 50 ? "bg-yellow-50" : "bg-red-50";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resultados</h1>
          <p className="text-gray-500 text-sm mt-0.5">{attempt.evaluation.title}</p>
        </div>
        <Link
          href="/dashboard"
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          ← Volver al inicio
        </Link>
      </div>

      {reason === "timeout" && (
        <div className="rounded-md bg-orange-50 border border-orange-200 p-3 text-sm text-orange-800 font-medium">
          ⏱ Tiempo agotado — el examen fue enviado automáticamente.
        </div>
      )}

      {attempt.status === "OUT_OF_TIME" && reason !== "timeout" && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800 font-medium">
          Este intento fue marcado como fuera de tiempo.
        </div>
      )}

      {/* Resumen de puntuación */}
      <div className={`rounded-lg border p-6 text-center ${scoreBg}`}>
        <p className={`text-5xl font-bold ${scoreColor}`}>
          {attempt.score} / {attempt.evaluation.totalPoints}
        </p>
        <p className={`text-lg font-semibold mt-1 ${scoreColor}`}>{pct}%</p>
        <div className="mt-4 flex justify-center gap-6 text-sm text-gray-600">
          <span>
            <span className="font-bold text-green-700">{attempt.correctCount}</span> correctas
          </span>
          <span>
            <span className="font-bold text-red-600">{attempt.incorrectCount}</span> incorrectas
          </span>
          <span>
            <span className="font-bold text-gray-500">{attempt.unansweredCount}</span> sin responder
          </span>
          <span>
            <span className="font-bold text-gray-700">
              {Math.floor(attempt.durationSeconds / 60)}m {attempt.durationSeconds % 60}s
            </span>
          </span>
        </div>
      </div>

      {/* Revisión pregunta por pregunta */}
      <div className="space-y-4">
        <h2 className="font-semibold text-gray-800">Revisión detallada</h2>
        {attempt.answers.map((ans, idx) => {
          const correct = ans.isCorrect;
          return (
            <div
              key={ans.id}
              className={`rounded-lg border p-5 space-y-3 ${
                correct
                  ? "border-green-200 bg-green-50"
                  : ans.selectedOptionId
                  ? "border-red-200 bg-red-50"
                  : "border-gray-200 bg-gray-50"
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="text-xs font-medium text-gray-400 mt-0.5 shrink-0">
                  {idx + 1}.
                </span>
                <p className="text-sm font-medium text-gray-900">{ans.question.text}</p>
                <span
                  className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    correct
                      ? "bg-green-200 text-green-800"
                      : ans.selectedOptionId
                      ? "bg-red-200 text-red-800"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {correct ? "✓ Correcta" : ans.selectedOptionId ? "✗ Incorrecta" : "— Sin responder"}
                </span>
              </div>

              {ans.selectedOption && (
                <p className="text-sm text-gray-700 pl-5">
                  <span className="font-medium">Tu respuesta:</span> {ans.selectedOption.text}
                </p>
              )}

              {!correct && ans.question.explanation && (
                <div className="pl-5">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                    Explicación
                  </p>
                  <p className="text-sm text-gray-700">{ans.question.explanation}</p>
                </div>
              )}

              <p className="pl-5 text-xs text-gray-500">
                Puntos: <span className="font-semibold">{ans.pointsEarned}</span>
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
