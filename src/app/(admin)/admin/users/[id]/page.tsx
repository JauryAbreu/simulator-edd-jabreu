export const runtime = "nodejs";

import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/Avatar";

export const metadata = { title: "Detalle de usuario — Admin" };

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      fullName: true,
      email: true,
      role: true,
      createdAt: true,
      _count: { select: { attempts: true } },
    },
  });

  if (!user) notFound();

  const attempts = await prisma.attempt.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { evaluation: { select: { title: true, totalPoints: true } } },
  });

  const pcts = attempts.map((a) =>
    a.evaluation.totalPoints > 0 ? Math.round((a.score / a.evaluation.totalPoints) * 100) : 0,
  );
  const avg = pcts.length ? Math.round(pcts.reduce((s, p) => s + p, 0) / pcts.length) : 0;
  const best = pcts.length ? Math.max(...pcts) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/users" className="text-sm text-slate-400 hover:text-slate-100 transition-colors">
          ← Usuarios
        </Link>
        <span className="text-slate-700">/</span>
        <span className="text-sm text-slate-300">{user.username}</span>
      </div>

      {/* User card */}
      <div className="flex items-center gap-4 rounded-xl border border-slate-700 bg-slate-800 p-5">
        <Avatar name={user.fullName || user.username} size="xl" />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-slate-100 truncate">{user.fullName}</h1>
          <p className="text-sm text-slate-400">@{user.username}</p>
          {user.email && <p className="text-xs text-slate-500 mt-0.5">{user.email}</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${user.role === "ADMIN" ? "bg-purple-900/50 text-purple-300" : "bg-blue-900/50 text-blue-300"}`}>
              {user.role}
            </span>
            <span className="text-xs text-slate-500">
              Desde {new Date(user.createdAt).toLocaleDateString("es-DO", { day: "2-digit", month: "long", year: "numeric" })}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Intentos", value: user._count.attempts },
          { label: "Promedio", value: `${avg}%` },
          { label: "Mejor",    value: `${best}%` },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
            <p className="text-xl font-bold text-slate-100">{s.value}</p>
            <p className="mt-0.5 text-xs text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Attempts table */}
      <section className="rounded-xl border border-slate-700 bg-slate-800 overflow-hidden">
        <div className="border-b border-slate-700 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Intentos</h2>
        </div>
        {attempts.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-500">Sin intentos aún</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-900">
                {["Evaluación", "Puntaje", "Estado", "Fecha", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {attempts.map((a, i) => {
                const pct = pcts[i];
                const isPass = pct >= 70;
                return (
                  <tr key={a.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-200 truncate max-w-[180px]">
                      {a.evaluation.title}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${isPass ? "text-green-400" : "text-red-400"}`}>
                        {a.score}/{a.evaluation.totalPoints}
                      </span>
                      <span className="text-xs text-slate-500 ml-1">({pct}%)</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        a.status === "COMPLETED"
                          ? "bg-green-900/40 text-green-300"
                          : "bg-orange-900/40 text-orange-300"
                      }`}>
                        {a.status === "COMPLETED" ? "Completado" : "Tiempo agotado"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(a.createdAt).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/attempts/${a.id}`} className="text-xs text-blue-400 hover:underline">
                        Ver detalle
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
