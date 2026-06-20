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
  let evaluations: { id: string; title: string; description: string; numberOfQuestions: number; timeLimitMinutes: number; totalPoints: number }[] = [];
  let recentAttempts: { id: string; score: number; status: string; createdAt: Date; evaluation: { title: string; totalPoints: number } }[] = [];

  if (token) {
    try {
      const payload = await verifyAccessToken(token);
      userId = payload.sub;
      const [userRow, evRows, attemptRows] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { fullName: true } }),
        prisma.evaluation.findMany({
          where: { isActive: true },
          select: { id: true, title: true, description: true, numberOfQuestions: true, timeLimitMinutes: true, totalPoints: true },
          orderBy: { createdAt: "desc" },
        }),
        prisma.attempt.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 5,
          include: { evaluation: { select: { title: true, totalPoints: true } } },
        }),
      ]);
      fullName = userRow?.fullName ?? "";
      evaluations = evRows;
      recentAttempts = attemptRows;
    } catch {
      // invalid token — middleware handles redirect
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
          Bienvenido{fullName ? `, ${fullName}` : ""}
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Elige un simulacro para comenzar</p>
      </div>

      {/* Evaluaciones disponibles */}
      {evaluations.length === 0 ? (
        <p className="text-gray-500 dark:text-slate-400">No hay evaluaciones disponibles por el momento.</p>
      ) : (
        <section aria-labelledby="evals-heading">
          <h2 id="evals-heading" className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3">Evaluaciones disponibles</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {evaluations.map((ev) => (
              <div key={ev.id} className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="font-semibold text-gray-900 dark:text-slate-100">{ev.title}</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{ev.description}</p>
                <div className="mt-3 flex gap-4 text-xs text-gray-400 dark:text-slate-500">
                  <span>{ev.numberOfQuestions} preguntas</span>
                  <span>{ev.timeLimitMinutes} min</span>
                  <span>{ev.totalPoints} pts</span>
                </div>
                <Link
                  href={`/dashboard/evaluations/${ev.id}`}
                  className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  Iniciar simulacro
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Intentos recientes */}
      {recentAttempts.length > 0 && (
        <section aria-labelledby="recent-heading">
          <div className="flex items-center justify-between mb-3">
            <h2 id="recent-heading" className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Últimos intentos</h2>
            <Link href="/dashboard/history" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Ver todos →</Link>
          </div>
          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Evaluación</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Puntaje</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Fecha</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {recentAttempts.map((a) => {
                  const pct = a.evaluation.totalPoints > 0 ? Math.round((a.score / a.evaluation.totalPoints) * 100) : 0;
                  return (
                    <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-200">{a.evaluation.title}</td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold ${pct >= 70 ? "text-green-600 dark:text-green-400" : pct >= 50 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"}`}>
                          {a.score}/{a.evaluation.totalPoints}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-slate-500 ml-1">({pct}%)</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          a.status === "COMPLETED" ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" :
                          a.status === "TIMEOUT" ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400" :
                          "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400"
                        }`}>
                          {a.status === "COMPLETED" ? "Completado" : a.status === "TIMEOUT" ? "Tiempo agotado" : a.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 dark:text-slate-500">
                        {new Date(a.createdAt).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/results/${a.id}`} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Ver</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
