import { NextResponse } from "next/server";
import { getSessionUser } from "./session";
import type { TokenPayload } from "./tokens";

/** Returns the session user if role is ADMIN, else returns a 403 NextResponse. */
export async function requireAdmin(): Promise<TokenPayload | NextResponse> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }
  return user;
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
