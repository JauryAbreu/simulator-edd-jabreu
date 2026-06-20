export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import { UsageChart } from "@/components/charts/UsageChart";
import Link from "next/link";

export const metadata = { title: "Admin Dashboard" };

export default async function AdminDashboardPage() {
  const [userCount, attemptCount, evaluationStats, recentAttempts, errorRanking] = await Promise.all([
    prisma.user.count({ where: { role: "USER" } }),
    prisma.attempt.count(),
    prisma.evaluation.findMany({
      where: { isActive: true },
      select: { id: true, title: true, totalPoints: true, attempts: { select: { score: true } } },
    }),
    prisma.attempt.findMany({ select: { createdAt: true }, orderBy: { createdAt: "asc" } }),
    prisma.answer.groupBy({
      by: ["questionId"],
      _count: { id: true },
      where: { isCorrect: false, selectedOptionId: { not: null } },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    }),
  ]);

  const avgByEval = evaluationStats.map((e) => ({
    id: e.id,
    title: e.title,
    count: e.attempts.length,
    avg: e.attempts.length
      ? Math.round((e.attempts.reduce((s, a) => s + a.score, 0) / e.attempts.length) * 10) / 10
      : 0,
    max: e.totalPoints,
  }));

  const usageByDay: Record<string, number> = {};
  for (const a of recentAttempts) {
    const day = new Date(a.createdAt).toISOString().slice(0, 10);
    usageByDay[day] = (usageByDay[day] ?? 0) + 1;
  }
  const usageChart = Object.entries(usageByDay).map(([date, count]) => ({ date, count })).slice(-30);

  const errorIds = errorRanking.map((r) => r.questionId);
  const errorQuestions = await prisma.question.findMany({
    where: { id: { in: errorIds } },
    select: { id: true, text: true, evaluation: { select: { title: true } } },
  });
  const qMap = Object.fromEntries(errorQuestions.map((q) => [q.id, q]));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">Panel de administración</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Usuarios activos", value: userCount, href: "/admin/users" },
          { label: "Intentos totales", value: attemptCount, href: "#" },
          { label: "Evaluaciones activas", value: evaluationStats.length, href: "/admin/evaluations" },
          { label: "Preguntas con errores", value: errorRanking.length, href: "#" },
        ].map((kpi) => (
          <Link key={kpi.label} href={kpi.href} className="rounded-xl bg-slate-800 p-5 hover:bg-slate-700 transition-colors block focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:outline-none rounded-xl">
            <p className="text-3xl font-bold text-slate-100">{kpi.value}</p>
            <p className="text-sm text-slate-400 mt-1">{kpi.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Score promedio por evaluación */}
        <section aria-labelledby="eval-scores" className="rounded-xl bg-slate-800 p-5 space-y-3">
          <h2 id="eval-scores" className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Score promedio por evaluación</h2>
          {avgByEval.length === 0 ? (
            <p className="text-slate-500 text-sm">Sin datos</p>
          ) : (
            <ul className="space-y-3">
              {avgByEval.map((e) => {
                const pct = Math.round((e.avg / e.max) * 100);
                return (
                  <li key={e.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-300 truncate max-w-[200px]">{e.title}</span>
                      <span className="text-slate-400 shrink-0 ml-2">{e.avg}/{e.max} ({pct}%) · {e.count} intentos</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-700">
                      <div
                        className={`h-2 rounded-full transition-all ${pct >= 70 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
                        style={{ width: `${pct}%` }}
                        role="progressbar"
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${e.title}: ${pct}%`}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Uso por día */}
        <section aria-labelledby="usage-chart" className="rounded-xl bg-slate-800 p-5">
          <h2 id="usage-chart" className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3">Intentos por día (últimos 30 días)</h2>
          <UsageChart data={usageChart} />
        </section>
      </div>

      {/* Top preguntas con mayor error */}
      <section aria-labelledby="error-ranking" className="rounded-xl bg-slate-800 p-5">
        <h2 id="error-ranking" className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3">
          Preguntas con mayor tasa de error
        </h2>
        {errorRanking.length === 0 ? (
          <p className="text-slate-500 text-sm">Sin datos aún</p>
        ) : (
          <ol className="space-y-2" aria-label="Ranking de preguntas con errores">
            {errorRanking.map((r, i) => {
              const q = qMap[r.questionId];
              return (
                <li key={r.questionId} className="flex items-start gap-3 text-sm">
                  <span className="shrink-0 font-mono text-slate-500 w-5 text-right">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 truncate">{q?.text ?? r.questionId}</p>
                    <p className="text-slate-500 text-xs">{q?.evaluation.title}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-red-900/50 text-red-300 text-xs px-2 py-0.5 font-medium">
                    {r._count.id} errores
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
