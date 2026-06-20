import { SignJWT, jwtVerify } from "jose";

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

function getSecret(key: string): Uint8Array {
  const secret = process.env[key];
  if (!secret) throw new Error(`Missing env var: ${key}`);
  return new TextEncoder().encode(secret);
}

export interface TokenPayload {
  sub: string;       // userId
  username: string;
  role: string;
}

export async function signAccessToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(getSecret("JWT_SECRET"));
}

export async function signRefreshToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(getSecret("JWT_REFRESH_SECRET"));
}

export async function verifyAccessToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, getSecret("JWT_SECRET"));
  return payload as unknown as TokenPayload;
}

export async function verifyRefreshToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, getSecret("JWT_REFRESH_SECRET"));
  return payload as unknown as TokenPayload;
}
