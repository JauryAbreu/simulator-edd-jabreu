import { cookies } from "next/headers";
import { verifyAccessToken, TokenPayload } from "./tokens";
import { ACCESS_TOKEN_COOKIE } from "./cookies";

export async function getSessionUser(): Promise<TokenPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
    if (!token) return null;
    return await verifyAccessToken(token);
  } catch {
    return null;
  }
}
