"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

/* ── Shared input style ──────────────────────────────────────────── */
const input =
  "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-base text-gray-900 placeholder-gray-400 transition focus:outline-none focus:ring-2 focus:ring-blue-500";

/* ── Login form ──────────────────────────────────────────────────── */
function LoginForm({ onSwitch }: { onSwitch: () => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "Error al iniciar sesión"); return; }
    router.push(redirect);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div>
        <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-gray-700">Usuario</label>
        <input id="username" type="text" required autoComplete="username" autoFocus
          value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
          className={input} placeholder="tu_usuario" />
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-medium text-gray-700">Contraseña</label>
          <Link href="/forgot-password" className="text-xs text-blue-600 hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <input id="password" type="password" required autoComplete="current-password"
          value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          className={input} placeholder="••••••••" />
      </div>
      <button type="submit" disabled={loading}
        className="w-full rounded-xl bg-blue-600 py-2.5 text-base font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
        {loading ? "Ingresando…" : "Iniciar sesión"}
      </button>
      <p className="text-center text-sm text-gray-500">
        ¿No tienes cuenta?{" "}
        <button type="button" onClick={onSwitch} className="font-semibold text-blue-600 hover:underline">
          Regístrate
        </button>
      </p>
    </form>
  );
}

/* ── Register form ───────────────────────────────────────────────── */
function RegisterForm({ onSwitch }: { onSwitch: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", email: "", password: "", confirm: "", fullName: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) { setError("Las contraseñas no coinciden"); return; }
    setLoading(true);
    setError(null);
    const { confirm: _, ...payload } = form;
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.details ? Object.values(data.details).flat().join(", ") : data.error);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  const f = (id: keyof typeof form, label: string, type = "text", placeholder = "", ac?: string) => (
    <div>
      <label htmlFor={`reg-${id}`} className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
      <input id={`reg-${id}`} type={type} required autoComplete={ac} placeholder={placeholder}
        value={form[id]} onChange={(e) => setForm((p) => ({ ...p, [id]: e.target.value }))}
        className={input} />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {f("fullName", "Nombre completo", "text", "Juan Rodríguez")}
      {f("username", "Usuario", "text", "juan_rodriguez", "username")}
      {f("email", "Correo (para recuperar contraseña)", "email", "correo@ejemplo.com", "email")}
      {f("password", "Contraseña", "password", "Mínimo 8 caracteres", "new-password")}
      {f("confirm", "Confirmar contraseña", "password", "••••••••", "new-password")}
      <button type="submit" disabled={loading}
        className="w-full rounded-xl bg-blue-600 py-2.5 text-base font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
        {loading ? "Registrando…" : "Crear cuenta"}
      </button>
      <p className="text-center text-sm text-gray-500">
        ¿Ya tienes cuenta?{" "}
        <button type="button" onClick={onSwitch} className="font-semibold text-blue-600 hover:underline">
          Inicia sesión
        </button>
      </p>
    </form>
  );
}

/* ── Auth card shell (tabs + content) ───────────────────────────── */
function AuthCard() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"login" | "register">(
    searchParams.get("tab") === "register" ? "register" : "login",
  );

  return (
    <div className="w-full max-w-sm">
      {/* Pill tab switcher */}
      <div className="mb-6 flex rounded-xl bg-gray-100 p-1">
        {(["login", "register"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
              tab === t
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "login" ? "Iniciar sesión" : "Registrarse"}
          </button>
        ))}
      </div>

      {tab === "login"
        ? <LoginForm    onSwitch={() => setTab("register")} />
        : <RegisterForm onSwitch={() => setTab("login")} />}
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────── */
export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      {/* Left brand panel — hidden on mobile */}
      <div className="hidden md:flex md:w-2/5 flex-col justify-between bg-slate-950 px-10 py-10 text-white">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
              </svg>
            </div>
            <span className="text-base font-bold tracking-tight">Simulador EDD</span>
          </div>
          <div className="mt-12">
            <h1 className="text-3xl font-bold leading-tight">
              Prepárate para<br />las evaluaciones<br />de desempeño
            </h1>
            <p className="mt-4 leading-relaxed text-slate-400">
              Practica con simulacros reales, revisa tus resultados y mejora tu puntaje antes del día clave.
            </p>
          </div>
        </div>
        <ul className="space-y-3">
          {["Evaluaciones con tiempo límite real", "Historial detallado de intentos", "Estadísticas de rendimiento por tema", "Explicaciones por cada pregunta"].map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              {f}
            </li>
          ))}
        </ul>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 flex-col items-center justify-center bg-gray-50 px-6 py-12">
        {/* Mobile brand */}
        <p className="mb-8 text-lg font-bold text-blue-600 md:hidden">Simulador EDD</p>

        <Suspense fallback={<div className="h-64 w-full max-w-sm animate-pulse rounded-2xl bg-gray-100" />}>
          <AuthCard />
        </Suspense>
      </div>
    </div>
  );
}
