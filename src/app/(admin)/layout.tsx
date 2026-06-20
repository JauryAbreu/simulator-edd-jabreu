import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <nav className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="text-lg font-semibold">
            Admin — Simulador EDD
          </Link>
          <Link href="/admin/users" className="text-sm text-gray-400 hover:text-white transition-colors">
            Usuarios
          </Link>
          <Link href="/admin/evaluations" className="text-sm text-gray-400 hover:text-white transition-colors">
            Evaluaciones
          </Link>
        </div>
        <form action="/api/auth/logout" method="POST">
          <button type="submit" className="text-sm text-gray-400 hover:text-white transition-colors">
            Cerrar sesión
          </button>
        </form>
      </nav>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
