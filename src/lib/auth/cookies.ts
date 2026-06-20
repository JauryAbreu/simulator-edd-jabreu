import { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

const isProd = process.env.NODE_ENV === "production";

export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";

export const accessCookieOptions: Partial<ResponseCookie> = {
  httpOnly: true,
  secure: isProd,
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 15, // 15 min
};

export const refreshCookieOptions: Partial<ResponseCookie> = {
  httpOnly: true,
  secure: isProd,
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 7 days
};

export const clearCookieOptions: Partial<ResponseCookie> = {
  httpOnly: true,
  secure: isProd,
  sameSite: "lax",
  path: "/",
  maxAge: 0,
};
