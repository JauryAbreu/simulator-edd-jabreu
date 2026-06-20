export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { signAccessToken, signRefreshToken } from "@/lib/auth/tokens";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  accessCookieOptions,
  refreshCookieOptions,
} from "@/lib/auth/cookies";
import { loginSchema } from "@/lib/validations";
import { checkRateLimit, cleanupRateLimitEntries } from "@/lib/rate-limit";
import { storeRefreshToken } from "@/lib/auth/refresh-tokens";

// IP-level: 20 attempts per 5-minute window
const IP_MAX = 20;
const IP_WINDOW = 5 * 60;

// Per-username: 10 attempts per 15-minute window (lockout-style)
const USER_MAX = 10;
const USER_WINDOW = 15 * 60;

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const { username, password } = parsed.data;
    const ip = getClientIp(req);

    // Rate-limit check (fire both in parallel)
    cleanupRateLimitEntries();
    const [ipLimit, userLimit] = await Promise.all([
      checkRateLimit(`login:ip:${ip}`, IP_MAX, IP_WINDOW),
      checkRateLimit(`login:user:${username}`, USER_MAX, USER_WINDOW),
    ]);

    if (ipLimit.blocked || userLimit.blocked) {
      const resetAt = ipLimit.blocked ? ipLimit.resetAt : userLimit.resetAt;
      return NextResponse.json(
        { error: "Demasiados intentos. Intenta de nuevo más tarde." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((resetAt.getTime() - Date.now()) / 1000)),
            "X-RateLimit-Reset": resetAt.toISOString(),
          },
        }
      );
    }

    const user = await prisma.user.findUnique({ where: { username } });
    // Intentional: ANONYMOUS check uses same generic message to avoid revealing account existence
    if (!user || user.role === "ANONYMOUS") {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    const tokenPayload = { sub: user.id, username: user.username, role: user.role };
    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken(tokenPayload),
      signRefreshToken(tokenPayload),
    ]);

    // Store refresh token hash for server-side invalidation on logout
    await storeRefreshToken(user.id, refreshToken);

    const response = NextResponse.json({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
    });
    response.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, accessCookieOptions);
    response.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, refreshCookieOptions);
    return response;
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
