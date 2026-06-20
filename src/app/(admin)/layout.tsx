import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import AdminLogoutButton from "./AdminLogoutButton";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white focus:text-sm"
      >
        Saltar al contenido
      </a>

      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <nav aria-label="Panel de administración" className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
          <Link href="/admin" className="text-base font-bold text-blue-400 shrink-0">
            Admin EDD
          </Link>

          <div className="flex items-center gap-1 overflow-x-auto text-sm" role="list">
            {[
              { href: "/admin", label: "Dashboard" },
              { href: "/admin/evaluations", label: "Evaluaciones" },
              { href: "/admin/users", label: "Usuarios" },
              { href: "/admin/audit", label: "Auditoría" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                role="listitem"
                className="rounded-md px-3 py-1.5 font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors whitespace-nowrap"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2 shrink-0">
            <Link href="/dashboard" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
              ← Vista usuario
            </Link>
            <ThemeToggle />
            <AdminLogoutButton />
          </div>
        </nav>
      </header>

      <main id="main-content" className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {children}
      </main>
    </div>
  );
}
