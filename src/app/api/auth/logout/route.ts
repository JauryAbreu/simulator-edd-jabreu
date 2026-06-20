export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  clearCookieOptions,
} from "@/lib/auth/cookies";
import { revokeAllRefreshTokens } from "@/lib/auth/refresh-tokens";
import { getSessionUser } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  // Best-effort: revoke DB-stored refresh tokens so /api/auth/refresh rejects them
  const user = await getSessionUser().catch(() => null);
  if (user) {
    await revokeAllRefreshTokens(user.sub).catch(() => {});
  }

  const response = NextResponse.json({ message: "Sesión cerrada" });
  response.cookies.set(ACCESS_TOKEN_COOKIE, "", clearCookieOptions);
  response.cookies.set(REFRESH_TOKEN_COOKIE, "", clearCookieOptions);
  return response;
}
