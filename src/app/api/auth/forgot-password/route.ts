export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/resend";
import { resetPasswordEmail } from "@/lib/email/templates";

const schema = z.object({
  email: z.string().email("Correo inválido"),
});

const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hora

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Correo inválido" }, { status: 400 });
    }

    const { email } = parsed.data;

    // Respuesta genérica siempre — no revelamos si el correo existe
    const genericOk = NextResponse.json({
      message: "Si el correo está registrado recibirás un enlace en minutos.",
    });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return genericOk;

    // Elimina tokens anteriores del mismo usuario
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    // Genera token seguro
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: hashedToken,
        expiresAt: new Date(Date.now() + TOKEN_EXPIRY_MS),
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

    await sendEmail({
      to: email,
      subject: "Restablece tu contraseña — Simulador EDD",
      html: resetPasswordEmail(user.fullName, resetUrl),
    });

    return genericOk;
  } catch (err) {
    console.error("[forgot-password]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
