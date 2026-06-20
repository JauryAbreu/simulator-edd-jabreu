export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  verifyRefreshToken,
  signAccessToken,
  signRefreshToken,
} from "@/lib/auth/tokens";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  accessCookieOptions,
  refreshCookieOptions,
  clearCookieOptions,
} from "@/lib/auth/cookies";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

    if (!refreshToken) {
      return NextResponse.json({ error: "No refresh token" }, { status: 401 });
    }

    const payload = await verifyRefreshToken(refreshToken);
    const tokenPayload = { sub: payload.sub, username: payload.username, role: payload.role };

    // Rotate both tokens
    const [newAccess, newRefresh] = await Promise.all([
      signAccessToken(tokenPayload),
      signRefreshToken(tokenPayload),
    ]);

    const response = NextResponse.json({ ok: true });
    response.cookies.set(ACCESS_TOKEN_COOKIE, newAccess, accessCookieOptions);
    response.cookies.set(REFRESH_TOKEN_COOKIE, newRefresh, refreshCookieOptions);
    return response;
  } catch {
    const response = NextResponse.json({ error: "Refresh token inválido" }, { status: 401 });
    response.cookies.set(ACCESS_TOKEN_COOKIE, "", clearCookieOptions);
    response.cookies.set(REFRESH_TOKEN_COOKIE, "", clearCookieOptions);
    return response;
  }
}
