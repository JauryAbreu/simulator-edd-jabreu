import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";

const JWT_SECRET = () => new TextEncoder().encode(process.env.JWT_SECRET!);
const JWT_REFRESH_SECRET = () => new TextEncoder().encode(process.env.JWT_REFRESH_SECRET!);

const ACCESS_TOKEN_COOKIE = "access_token";
const REFRESH_TOKEN_COOKIE = "refresh_token";

async function refreshTokens(refreshToken: string) {
  const { payload } = await jwtVerify(refreshToken, JWT_REFRESH_SECRET());
  const tokenPayload = { sub: payload.sub, username: payload.username, role: payload.role };

  const [newAccess, newRefresh] = await Promise.all([
    new SignJWT(tokenPayload as Record<string, unknown>)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("15m")
      .sign(JWT_SECRET()),
    new SignJWT(tokenPayload as Record<string, unknown>)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(JWT_REFRESH_SECRET()),
  ]);

  return { newAccess, newRefresh, payload };
}

const isProd = process.env.NODE_ENV === "production";

const cookieBase = {
  httpOnly: true,
  secure: isProd,
  sameSite: "lax" as const,
  path: "/",
};

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isDashboard = pathname.startsWith("/dashboard");
  const isAdmin = pathname.startsWith("/admin");

  if (!isDashboard && !isAdmin) {
    return NextResponse.next();
  }

  const accessToken = req.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = req.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  // Try access token first
  if (accessToken) {
    try {
      const { payload } = await jwtVerify(accessToken, JWT_SECRET());

      // Admin route guard
      if (isAdmin && payload.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }

      return NextResponse.next();
    } catch {
      // Access token expired — fall through to refresh
    }
  }

  // Try to refresh (JWT-only; DB revocation check happens in /api/auth/refresh)
  if (refreshToken) {
    try {
      const { newAccess, newRefresh, payload } = await refreshTokens(refreshToken);

      if (isAdmin && payload.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }

      const response = NextResponse.next();
      response.cookies.set(ACCESS_TOKEN_COOKIE, newAccess, { ...cookieBase, maxAge: 60 * 15 });
      response.cookies.set(REFRESH_TOKEN_COOKIE, newRefresh, { ...cookieBase, maxAge: 60 * 60 * 24 * 7 });
      return response;
    } catch {
      // Refresh token also invalid — redirect to login
    }
  }

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("redirect", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
