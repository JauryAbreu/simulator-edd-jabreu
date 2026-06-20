export const runtime = "nodejs";

import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/auth/tokens";
import { Sidebar, type NavItem } from "@/components/Sidebar";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

const USER_NAV: NavItem[] = [
  { href: "/dashboard",         label: "Inicio",       icon: "home",      exact: true },
  { href: "/dashboard/history", label: "Historial",    icon: "clock" },
  { href: "/dashboard/charts",  label: "Estadísticas", icon: "chart-bar" },
  { href: "/dashboard/account", label: "Mi perfil",    icon: "user" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  let displayName = "Usuario";
  let username = "";
  let initials = "US";
  let isAdmin = false;

  if (token) {
    try {
      const payload = await verifyAccessToken(token);
      username = payload.username;
      displayName = payload.username;
      initials = payload.username.slice(0, 2).toUpperCase();
      isAdmin = payload.role === "ADMIN";
    } catch {
      // proxy redirects on invalid token — no action needed here
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white focus:text-sm"
      >
        Saltar al contenido
      </a>

      {/* Fixed sidebar — visible on md+ */}
      <div className="hidden md:block">
        <Sidebar
          brand="Simulador EDD"
          navItems={USER_NAV}
          user={{ username, initials, displayName }}
          switchHref={isAdmin ? "/admin" : undefined}
          switchLabel={isAdmin ? "Vista Admin" : undefined}
        />
      </div>

      {/* Compact top bar — mobile only */}
      <header
        className="sticky top-0 z-40 flex h-12 items-center justify-between border-b bg-white/90 px-4 backdrop-blur dark:bg-slate-950/90 md:hidden"
        style={{ borderColor: "var(--border-color)" }}
      >
        <Link href="/dashboard" className="text-sm font-bold text-blue-600 dark:text-blue-400">
          Simulador EDD
        </Link>
        <nav className="flex items-center gap-1 overflow-x-auto text-xs">
          {USER_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded px-2 py-1 font-medium text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <ThemeToggle />
      </header>

      {/* Page content — offset by sidebar on desktop */}
      <div className="md:pl-60">
        <main id="main-content" className="w-full px-4 py-6 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
