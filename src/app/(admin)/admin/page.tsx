export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const [userCount, evaluationCount, attemptCount] = await Promise.all([
    prisma.user.count(),
    prisma.evaluation.count(),
    prisma.attempt.count(),
  ]);

  const stats = [
    { label: "Usuarios registrados", value: userCount, href: "/admin/users" },
    { label: "Evaluaciones", value: evaluationCount, href: "/admin/evaluations" },
    { label: "Intentos totales", value: attemptCount, href: "#" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Panel de administración</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="rounded-lg bg-gray-800 p-5 hover:bg-gray-700 transition-colors"
          >
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="text-sm text-gray-400 mt-1">{s.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
