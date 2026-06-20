import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import LogoutButton from "./LogoutButton";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Skip to main content — accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white focus:text-sm"
      >
        Saltar al contenido
      </a>

      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
        <nav aria-label="Navegación principal" className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
          <Link href="/dashboard" className="text-base font-bold text-blue-600 dark:text-blue-400 shrink-0">
            Simulador EDD
          </Link>

          <div className="flex items-center gap-1 overflow-x-auto text-sm" role="list">
            {[
              { href: "/dashboard", label: "Inicio" },
              { href: "/dashboard/history", label: "Historial" },
              { href: "/dashboard/charts", label: "Estadísticas" },
              { href: "/dashboard/account", label: "Mi cuenta" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                role="listitem"
                className="rounded-md px-3 py-1.5 font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 transition-colors whitespace-nowrap"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2 shrink-0">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </nav>
      </header>

      <main id="main-content" className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {children}
      </main>
    </div>
  );
}
