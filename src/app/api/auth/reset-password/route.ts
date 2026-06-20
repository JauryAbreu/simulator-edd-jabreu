export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";

const schema = z.object({
  token: z.string().min(1, "Token requerido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(72),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { token: rawToken, password } = parsed.data;
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    const record = await prisma.passwordResetToken.findUnique({
      where: { token: hashedToken },
      include: { user: { select: { id: true } } },
    });

    if (!record) {
      return NextResponse.json({ error: "Enlace inválido o ya utilizado" }, { status: 400 });
    }

    if (record.expiresAt < new Date()) {
      await prisma.passwordResetToken.delete({ where: { id: record.id } });
      return NextResponse.json({ error: "El enlace ha expirado. Solicita uno nuevo." }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    // Actualiza contraseña y elimina token en una transacción
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.user.id },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.delete({ where: { id: record.id } }),
    ]);

    return NextResponse.json({ message: "Contraseña actualizada correctamente" });
  } catch (err) {
    console.error("[reset-password]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
