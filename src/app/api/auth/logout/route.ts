export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  clearCookieOptions,
} from "@/lib/auth/cookies";

export async function POST() {
  const response = NextResponse.json({ message: "Sesión cerrada" });
  response.cookies.set(ACCESS_TOKEN_COOKIE, "", clearCookieOptions);
  response.cookies.set(REFRESH_TOKEN_COOKIE, "", clearCookieOptions);
  return response;
}
