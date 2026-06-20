export const runtime = "nodejs";

import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/auth/tokens";
import { Sidebar, type NavItem } from "@/components/Sidebar";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

const ADMIN_NAV: NavItem[] = [
  { href: "/admin",             label: "Dashboard",    icon: "grid",      exact: true },
  { href: "/admin/evaluations", label: "Evaluaciones", icon: "clipboard" },
  { href: "/admin/users",       label: "Usuarios",     icon: "users" },
  { href: "/admin/audit",       label: "Auditoría",    icon: "document" },
  { href: "/admin/profile",     label: "Mi perfil",    icon: "user" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  let displayName = "Admin";
  let username = "";
  let initials = "AD";

  if (token) {
    try {
      const payload = await verifyAccessToken(token);
      username = payload.username;
      displayName = payload.username;
      initials = payload.username.slice(0, 2).toUpperCase();
    } catch {
      // proxy handles redirect on invalid token
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white focus:text-sm"
      >
        Saltar al contenido
      </a>

      {/* Fixed sidebar — desktop */}
      <div className="hidden md:block">
        <Sidebar
          brand="Admin EDD"
          navItems={ADMIN_NAV}
          user={{ username, initials, displayName }}
          switchHref="/dashboard"
          switchLabel="Vista usuario"
        />
      </div>

      {/* Compact top bar — mobile only */}
      <header className="sticky top-0 z-40 flex h-12 items-center justify-between border-b border-slate-800 bg-slate-950/95 px-4 backdrop-blur md:hidden">
        <Link href="/admin" className="text-sm font-bold text-blue-400">
          Admin EDD
        </Link>
        <nav className="flex items-center gap-1 overflow-x-auto text-xs">
          {ADMIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded px-2 py-1 font-medium text-slate-400 hover:text-slate-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <ThemeToggle />
      </header>

      {/* Page content */}
      <div className="md:pl-60">
        <main id="main-content" className="w-full px-4 py-6 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
