export const runtime = "nodejs";

import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/auth/tokens";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

const statusLabel: Record<string, string> = {
  COMPLETED: "Completado",
  OUT_OF_TIME: "Tiempo agotado",
};

const statusClass: Record<string, string> = {
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  OUT_OF_TIME: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
};

export default async function HistoryPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  let userId = "";
  if (token) {
    try { userId = (await verifyAccessToken(token)).sub; } catch {}
  }

  const attempts = await prisma.attempt.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { evaluation: { select: { title: true, totalPoints: true } } },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Historial de intentos</h1>

      {attempts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-slate-700 p-12 text-center">
          <p className="text-gray-500 dark:text-slate-400">Aún no has completado ningún simulacro.</p>
          <Link href="/dashboard" className="mt-3 inline-block text-sm text-blue-600 hover:underline dark:text-blue-400">
            Ver evaluaciones disponibles →
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-slate-300">Evaluación</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-slate-300 hidden sm:table-cell">Fecha</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600 dark:text-slate-300">Puntaje</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600 dark:text-slate-300 hidden md:table-cell">Tiempo</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600 dark:text-slate-300">Estado</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-slate-300">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {attempts.map((a) => {
                const pct = Math.round((a.score / a.evaluation.totalPoints) * 100);
                const mins = Math.floor(a.durationSeconds / 60);
                const secs = a.durationSeconds % 60;
                return (
                  <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100 max-w-[200px] truncate">
                      {a.evaluation.title}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-slate-400 hidden sm:table-cell whitespace-nowrap">
                      {new Date(a.createdAt).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-bold ${pct >= 70 ? "text-green-600 dark:text-green-400" : pct >= 50 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"}`}>
                        {a.score}/{a.evaluation.totalPoints}
                      </span>
                      <span className="ml-1 text-xs text-gray-400">({pct}%)</span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500 dark:text-slate-400 hidden md:table-cell">
                      {mins}m {secs}s
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusClass[a.status]}`}>
                        {statusLabel[a.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/evaluations/${a.evaluationId}/results/${a.id}`}
                        className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                        aria-label={`Ver detalle del intento de ${a.evaluation.title}`}
                      >
                        Ver →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
