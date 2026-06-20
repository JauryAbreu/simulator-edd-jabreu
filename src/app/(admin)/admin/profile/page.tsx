export const runtime = "nodejs";

import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/auth/tokens";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/Avatar";
import AdminProfileClient from "./AdminProfileClient";

export const metadata = { title: "Mi perfil — Admin" };

export default async function AdminProfilePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) return null;

  let userId = "";
  try {
    const payload = await verifyAccessToken(token);
    userId = payload.sub;
  } catch {
    return null;
  }

  const [user, recentLogs] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { attempts: true } },
      },
    }),
    prisma.auditLog.findMany({
      where: { actorId: userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, action: true, entityType: true, entityId: true, createdAt: true },
    }),
  ]);

  if (!user) return null;

  const memberSince = new Date(user.createdAt).toLocaleDateString("es-DO", { day: "2-digit", month: "long", year: "numeric" });
  const lastActive  = new Date(user.updatedAt).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">Mi perfil</h1>

      {/* Avatar header */}
      <div className="flex items-center gap-4 rounded-xl border border-slate-700 bg-slate-800 p-5">
        <Avatar name={user.fullName || user.username} size="xl" />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-slate-100 truncate">{user.fullName}</h2>
          <p className="text-sm text-slate-400">@{user.username}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="inline-flex rounded-full bg-purple-900/50 px-2.5 py-0.5 text-xs font-semibold text-purple-300">
              ADMIN
            </span>
            <span className="text-xs text-slate-500">Desde {memberSince}</span>
            <span className="text-xs text-slate-500">Activo {lastActive}</span>
          </div>
        </div>
      </div>

      {/* Recent audit log */}
      <section className="rounded-xl border border-slate-700 bg-slate-800 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Actividad reciente</h2>
        {recentLogs.length === 0 ? (
          <p className="text-sm text-slate-500">Sin actividad registrada</p>
        ) : (
          <ul className="space-y-2">
            {recentLogs.map((log) => (
              <li key={log.id} className="flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <span className="font-medium text-slate-200">{log.action}</span>
                  <span className="text-slate-500"> · {log.entityType}</span>
                </div>
                <time className="shrink-0 text-xs text-slate-500">
                  {new Date(log.createdAt).toLocaleDateString("es-DO", { day: "2-digit", month: "short" })}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Edit name + change password — client component */}
      <AdminProfileClient initialName={user.fullName} />
    </div>
  );
}
