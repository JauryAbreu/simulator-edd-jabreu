import { NextResponse } from "next/server";
import { getSessionUser } from "./session";
import type { TokenPayload } from "./tokens";

/**
 * Pure role check — testable without Next.js runtime.
 * Every /api/admin/** handler calls requireAdmin() which delegates here.
 */
export function checkAdminRole(
  role: string | null | undefined,
): { ok: false; status: 401 | 403 } | { ok: true } {
  if (!role) return { ok: false, status: 401 };
  if (role !== "ADMIN") return { ok: false, status: 403 };
  return { ok: true };
}

/** Returns the session user if role is ADMIN, else returns a 401/403 NextResponse. */
export async function requireAdmin(): Promise<TokenPayload | NextResponse> {
  const user = await getSessionUser();
  const check = checkAdminRole(user?.role);
  if (!check.ok) {
    return NextResponse.json(
      { error: check.status === 401 ? "No autenticado" : "Acceso denegado" },
      { status: check.status },
    );
  }
  return user!;
}

/** Returns the session user or a 401. */
export async function requireAuth(): Promise<TokenPayload | NextResponse> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  return user;
}

export function isResponse(v: unknown): v is NextResponse {
  return v instanceof NextResponse;
}
