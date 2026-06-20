export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { signAccessToken, signRefreshToken } from "@/lib/auth/tokens";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  accessCookieOptions,
  refreshCookieOptions,
} from "@/lib/auth/cookies";
import { registerSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { username, email, password, fullName } = parsed.data;

    // Verificar duplicados en paralelo
    const [existingUsername, existingEmail] = await Promise.all([
      prisma.user.findUnique({ where: { username } }),
      prisma.user.findUnique({ where: { email } }),
    ]);

    if (existingUsername) {
      return NextResponse.json({ error: "El nombre de usuario ya está en uso" }, { status: 409 });
    }
    if (existingEmail) {
      return NextResponse.json({ error: "El correo electrónico ya está registrado" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { username, email, passwordHash, fullName },
    });

    const tokenPayload = { sub: user.id, username: user.username, role: user.role };
    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken(tokenPayload),
      signRefreshToken(tokenPayload),
    ]);

    const response = NextResponse.json(
      { id: user.id, username: user.username, fullName: user.fullName, role: user.role },
      { status: 201 }
    );
    response.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, accessCookieOptions);
    response.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, refreshCookieOptions);
    return response;
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
