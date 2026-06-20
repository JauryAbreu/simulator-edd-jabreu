export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, username: true, fullName: true, role: true, createdAt: true },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Usuarios</h1>
      <div className="rounded-lg bg-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-700 text-gray-300">
            <tr>
              <th className="px-4 py-3 text-left">Usuario</th>
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left">Rol</th>
              <th className="px-4 py-3 text-left">Registrado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-750">
                <td className="px-4 py-3 font-medium">{u.username}</td>
                <td className="px-4 py-3 text-gray-300">{u.fullName}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.role === "ADMIN"
                        ? "bg-purple-900 text-purple-200"
                        : "bg-gray-600 text-gray-300"
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400">
                  {new Date(u.createdAt).toLocaleDateString("es-DO")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
