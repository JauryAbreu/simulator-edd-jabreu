export const runtime = "nodejs";

import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/auth/tokens";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  let userId = "";
  let fullName = "";
  let username = "";
  let evaluations: {
    id: string; title: string; description: string;
    numberOfQuestions: number; timeLimitMinutes: number; totalPoints: number;
  }[] = [];
  let recentAttempts: {
    id: string; score: number; status: string; createdAt: Date;
    evaluation: { title: string; totalPoints: number };
  }[] = [];
  let totalAttempts = 0;
  let avgPct = 0;
  let bestPct = 0;
  // best score per evaluationId → { score, totalPoints }
  let bestByEval: Record<string, { score: number; totalPoints: number }> = {};

  if (token) {
    try {
      const payload = await verifyAccessToken(token);
      userId   = payload.sub;
      username = payload.username;

      const [userRow, evRows, attemptRows, allScores, bestRaw] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { fullName: true } }),
        prisma.evaluation.findMany({
          where: { isActive: true },
          select: { id: true, title: true, description: true, numberOfQuestions: true, timeLimitMinutes: true, totalPoints: true },
          orderBy: { createdAt: "desc" },
        }),
        prisma.attempt.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 8,
          include: { evaluation: { select: { title: true, totalPoints: true } } },
        }),
        prisma.attempt.findMany({
          where: { userId },
          select: { score: true, evaluation: { select: { totalPoints: true } } },
        }),
        prisma.attempt.groupBy({
          by: ["evaluationId"],
          where: { userId },
          _max: { score: true },
        }),
      ]);

      fullName = userRow?.fullName ?? username;
      evaluations = evRows;
      recentAttempts = attemptRows;
      totalAttempts = allScores.length;

      if (allScores.length > 0) {
        const pcts = allScores.map((a) =>
          a.evaluation.totalPoints > 0 ? Math.round((a.score / a.evaluation.totalPoints) * 100) : 0,
        );
        avgPct  = Math.round(pcts.reduce((s, p) => s + p, 0) / pcts.length);
        bestPct = Math.max(...pcts);
      }

      // Map best score per eval
      const evalMap: Record<string, number> = Object.fromEntries(
        evRows.map((e) => [e.id, e.totalPoints]),
      );
      for (const row of bestRaw) {
        if (row._max.score !== null) {
          bestByEval[row.evaluationId] = {
            score: row._max.score,
            totalPoints: evalMap[row.evaluationId] ?? 0,
          };
        }
      }
    } catch {
      // invalid token — proxy handles redirect
    }
  }

  const firstName = fullName.split(" ")[0] || username;

  return (
    <div className="-mx-4 -mt-6 sm:-mx-6">

      {/* ── Welcome banner ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-6 py-8 sm:px-8 sm:py-10">
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-8 right-24 h-32 w-32 rounded-full bg-white/5" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-200">Panel de estudio</p>
            <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
              Hola, {firstName} 👋
            </h1>
            <p className="mt-2 text-sm text-blue-200">
              {totalAttempts === 0
                ? "Elige un simulacro para comenzar tu preparación"
                : `${totalAttempts} intento${totalAttempts !== 1 ? "s" : ""} realizados · sigue practicando`}
            </p>
          </div>

          {/* Quick stats in the banner */}
          {totalAttempts > 0 && (
            <div className="flex gap-4 sm:gap-6 shrink-0">
              {[
                { label: "Intentos", value: String(totalAttempts) },
                { label: "Promedio", value: `${avgPct}%` },
                { label: "Mejor",    value: `${bestPct}%` },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-2xl font-bold text-white tabular-nums">{s.value}</p>
                  <p className="text-xs text-blue-300">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Main content area ──────────────────────────────────────────── */}
      <div className="px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">

          {/* ── Left: evaluations (takes ~2/3) ─────────────────────────── */}
          <div className="flex-1 min-w-0">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-subtle)" }}>
              Evaluaciones disponibles
            </h2>

            {evaluations.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center"
                style={{ borderColor: "var(--border-color)" }}>
                <svg className="mb-3 h-10 w-10 text-gray-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
                </svg>
                <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>No hay evaluaciones activas</p>
                <p className="mt-1 text-xs" style={{ color: "var(--text-subtle)" }}>El administrador habilitará los simulacros próximamente</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {evaluations.map((ev) => {
                  const best = bestByEval[ev.id];
                  const bestPctEv = best && best.totalPoints > 0
                    ? Math.round((best.score / best.totalPoints) * 100)
                    : null;

                  return (
                    <div
                      key={ev.id}
                      className="group relative flex flex-col overflow-hidden rounded-2xl border bg-white dark:bg-slate-900 shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5"
                      style={{ borderColor: "var(--border-color)" }}
                    >
                      {/* Top accent bar */}
                      <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-indigo-500" />

                      <div className="flex flex-1 flex-col p-5">
                        <h3 className="font-bold leading-snug" style={{ color: "var(--text-primary)" }}>
                          {ev.title}
                        </h3>
                        <p className="mt-1.5 text-sm leading-relaxed line-clamp-2" style={{ color: "var(--text-secondary)" }}>
                          {ev.description}
                        </p>

                        {/* Meta chips */}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {[
                            { icon: "📝", text: `${ev.numberOfQuestions} preguntas` },
                            { icon: "⏱", text: `${ev.timeLimitMinutes} min` },
                            { icon: "⭐", text: `${ev.totalPoints} pts` },
                          ].map((m) => (
                            <span key={m.text} className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-slate-800 dark:text-slate-400">
                              {m.icon} {m.text}
                            </span>
                          ))}
                        </div>

                        {/* Best score indicator */}
                        {bestPctEv !== null && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span style={{ color: "var(--text-subtle)" }}>Tu mejor intento</span>
                              <span className={`font-bold ${bestPctEv >= 70 ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>
                                {best!.score}/{best!.totalPoints} ({bestPctEv}%)
                              </span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-800">
                              <div
                                className={`h-full rounded-full transition-all ${bestPctEv >= 70 ? "bg-green-500" : "bg-amber-500"}`}
                                style={{ width: `${bestPctEv}%` }}
                              />
                            </div>
                          </div>
                        )}

                        <div className="mt-4 pt-3 border-t" style={{ borderColor: "var(--border-color)" }}>
                          <Link
                            href={`/dashboard/evaluations/${ev.id}`}
                            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                          >
                            {bestPctEv !== null ? "Volver a intentar" : "Iniciar simulacro"}
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                            </svg>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Right: recent attempts (takes ~1/3) ────────────────────── */}
          {recentAttempts.length > 0 && (
            <div className="w-full lg:w-72 shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-subtle)" }}>
                  Últimos intentos
                </h2>
                <Link href="/dashboard/history" className="text-xs text-blue-600 hover:underline dark:text-blue-400">
                  Ver todos →
                </Link>
              </div>

              <div className="rounded-2xl border bg-white dark:bg-slate-900 overflow-hidden"
                style={{ borderColor: "var(--border-color)" }}>
                <ul className="divide-y" style={{ borderColor: "var(--border-color)" }}>
                  {recentAttempts.map((a, idx) => {
                    const pct = a.evaluation.totalPoints > 0
                      ? Math.round((a.score / a.evaluation.totalPoints) * 100)
                      : 0;
                    const isPass = pct >= 70;
                    const isTop  = idx === 0;
                    return (
                      <li key={a.id}
                        className={`relative ${isTop ? "bg-blue-50 dark:bg-blue-950/30" : ""}`}
                        style={{ borderColor: "var(--border-color)" }}>
                        {isTop && (
                          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500 rounded-r" />
                        )}
                        <Link
                          href={`/dashboard/results/${a.id}`}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          {/* Score dot */}
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums ${
                            isPass
                              ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                              : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                          }`}>
                            {pct}%
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                              {a.evaluation.title}
                            </p>
                            <p className="text-xs" style={{ color: "var(--text-subtle)" }}>
                              {a.score}/{a.evaluation.totalPoints} pts · {new Date(a.createdAt).toLocaleDateString("es-DO", { day: "2-digit", month: "short" })}
                            </p>
                          </div>

                          <svg className="h-4 w-4 shrink-0" style={{ color: "var(--text-subtle)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                          </svg>
                        </Link>
                      </li>
                    );
                  })}
                </ul>

                {/* Footer CTA */}
                <div className="border-t p-3" style={{ borderColor: "var(--border-color)", background: "var(--surface-subtle)" }}>
                  <Link
                    href="/dashboard/charts"
                    className="flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40 transition-colors"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                    </svg>
                    Ver estadísticas completas
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
