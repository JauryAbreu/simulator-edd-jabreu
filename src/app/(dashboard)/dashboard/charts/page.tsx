export const runtime = "nodejs";

import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/auth/tokens";
import { prisma } from "@/lib/prisma";
import { ScoreEvolutionChart } from "@/components/charts/ScoreEvolutionChart";
import { AttemptDistributionChart } from "@/components/charts/AttemptDistributionChart";
import Link from "next/link";

export const metadata = { title: "Estadísticas" };

export default async function ChartsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  let userId = "";
  if (token) {
    try { userId = (await verifyAccessToken(token)).sub; } catch {}
  }

  const attempts = await prisma.attempt.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { evaluation: { select: { title: true, totalPoints: true } } },
  });

  if (attempts.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Estadísticas</h1>
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-slate-700 p-12 text-center">
          <p className="text-gray-500 dark:text-slate-400">Completa al menos un simulacro para ver tus estadísticas.</p>
          <Link href="/dashboard" className="mt-3 inline-block text-sm text-blue-600 hover:underline dark:text-blue-400">
            Ver evaluaciones →
          </Link>
        </div>
      </div>
    );
  }

  // Datos para ScoreEvolutionChart — todos los intentos en el tiempo
  const evolutionData = attempts.map((a, i) => ({
    label: `#${i + 1}`,
    date: new Date(a.createdAt).toLocaleDateString("es-DO", { day: "2-digit", month: "short" }),
    score: a.score,
    totalPoints: a.evaluation.totalPoints,
    evaluation: a.evaluation.title,
  }));

  // Datos para AttemptDistributionChart — últimos 8 intentos
  const distributionData = attempts.slice(-8).map((a, i) => ({
    label: `#${attempts.length - (attempts.slice(-8).length - 1 - i)}`,
    correctas: a.correctCount,
    incorrectas: a.incorrectCount,
    sinResponder: a.unansweredCount,
  }));

  // Agrupar intentos por evaluación para comparativa
  const byEvaluation: Record<string, typeof attempts> = {};
  for (const a of attempts) {
    const key = a.evaluation.title;
    if (!byEvaluation[key]) byEvaluation[key] = [];
    byEvaluation[key].push(a);
  }
  const multiAttemptEvals = Object.entries(byEvaluation).filter(([, list]) => list.length > 1);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Estadísticas</h1>

      {/* Resumen global */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Intentos totales", value: attempts.length },
          { label: "Prom. puntaje", value: `${Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length * 10) / 10}` },
          { label: "Mejor puntaje", value: `${Math.max(...attempts.map((a) => a.score))}` },
          { label: "Resp. correctas", value: `${Math.round(attempts.reduce((s, a) => s + a.correctCount, 0) / attempts.length)}` },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
            <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-slate-100">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Evolución del score */}
      <section aria-labelledby="evolution-heading" className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
        <h2 id="evolution-heading" className="mb-4 text-base font-semibold text-gray-800 dark:text-slate-200">
          Evolución del puntaje
        </h2>
        <ScoreEvolutionChart data={evolutionData} />
        {/* Tabla accesible como alternativa */}
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">Ver datos en tabla</summary>
          <table className="mt-2 w-full text-xs">
            <thead><tr><th className="text-left py-1">Intento</th><th>Puntaje</th><th>Máximo</th></tr></thead>
            <tbody>
              {evolutionData.map((d) => (
                <tr key={d.label} className="border-t border-gray-100 dark:border-slate-700">
                  <td className="py-1">{d.label} — {d.date}</td>
                  <td className="text-center">{d.score}</td>
                  <td className="text-center">{d.totalPoints}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>

      {/* Distribución de respuestas */}
      <section aria-labelledby="dist-heading" className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
        <h2 id="dist-heading" className="mb-4 text-base font-semibold text-gray-800 dark:text-slate-200">
          Correctas / Incorrectas / Sin responder (últimos 8 intentos)
        </h2>
        <AttemptDistributionChart data={distributionData} />
      </section>

      {/* Comparativa por evaluación (solo si hay >1 intento de la misma) */}
      {multiAttemptEvals.length > 0 && (
        <section aria-labelledby="compare-heading" className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
          <h2 id="compare-heading" className="mb-4 text-base font-semibold text-gray-800 dark:text-slate-200">
            Progreso por evaluación
          </h2>
          <div className="space-y-6">
            {multiAttemptEvals.map(([title, list]) => {
              const evData = list.map((a, i) => ({
                label: `#${i + 1}`,
                date: new Date(a.createdAt).toLocaleDateString("es-DO"),
                score: a.score,
                totalPoints: a.evaluation.totalPoints,
              }));
              const improved = list[list.length - 1].score > list[0].score;
              return (
                <div key={title}>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-slate-300">{title}</h3>
                    <span className={`text-xs font-semibold ${improved ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                      {improved ? "↑ Mejorando" : "↓ Revisita este tema"}
                    </span>
                  </div>
                  <ScoreEvolutionChart data={evData} className="h-[200px]" />
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
