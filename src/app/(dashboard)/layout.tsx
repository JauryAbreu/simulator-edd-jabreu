import Link from "next/link";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="text-lg font-semibold text-gray-900">
          Simulador EDD
        </Link>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cerrar sesión
          </button>
        </form>
      </nav>
      <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
