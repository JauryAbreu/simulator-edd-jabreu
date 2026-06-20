export const runtime = "nodejs";

import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/auth/tokens";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  let user = null;
  let evaluations: { id: string; title: string; description: string; numberOfQuestions: number; timeLimitMinutes: number }[] = [];

  if (token) {
    try {
      const payload = await verifyAccessToken(token);
      [user, evaluations] = await Promise.all([
        prisma.user.findUnique({
          where: { id: payload.sub },
          select: { fullName: true, role: true },
        }),
        prisma.evaluation.findMany({
          where: { isActive: true },
          select: { id: true, title: true, description: true, numberOfQuestions: true, timeLimitMinutes: true },
          orderBy: { createdAt: "desc" },
        }),
      ]);
    } catch {
      // Token inválido — el middleware ya habría redirigido, pero por si acaso
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Bienvenido{user ? `, ${user.fullName}` : ""}
        </h1>
        <p className="text-sm text-gray-500 mt-1">Elige un simulacro para comenzar</p>
      </div>

      {evaluations.length === 0 ? (
        <p className="text-gray-500">No hay evaluaciones disponibles por el momento.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {evaluations.map((ev) => (
            <div
              key={ev.id}
              className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <h2 className="font-semibold text-gray-900">{ev.title}</h2>
              <p className="text-sm text-gray-500 mt-1">{ev.description}</p>
              <div className="mt-3 flex gap-4 text-xs text-gray-400">
                <span>{ev.numberOfQuestions} preguntas</span>
                <span>{ev.timeLimitMinutes} min</span>
              </div>
              <Link
                href={`/dashboard/evaluations/${ev.id}`}
                className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Iniciar
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
