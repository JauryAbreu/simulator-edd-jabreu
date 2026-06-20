export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";

export default async function AdminEvaluationsPage() {
  const evaluations = await prisma.evaluation.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { questions: true, attempts: true } } },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Evaluaciones</h1>
      <div className="rounded-lg bg-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-700 text-gray-300">
            <tr>
              <th className="px-4 py-3 text-left">Título</th>
              <th className="px-4 py-3 text-left">Preguntas</th>
              <th className="px-4 py-3 text-left">Tiempo</th>
              <th className="px-4 py-3 text-left">Intentos</th>
              <th className="px-4 py-3 text-left">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {evaluations.map((ev) => (
              <tr key={ev.id}>
                <td className="px-4 py-3 font-medium">{ev.title}</td>
                <td className="px-4 py-3 text-gray-300">{ev._count.questions}</td>
                <td className="px-4 py-3 text-gray-300">{ev.timeLimitMinutes} min</td>
                <td className="px-4 py-3 text-gray-300">{ev._count.attempts}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      ev.isActive
                        ? "bg-green-900 text-green-200"
                        : "bg-red-900 text-red-200"
                    }`}
                  >
                    {ev.isActive ? "Activa" : "Inactiva"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
