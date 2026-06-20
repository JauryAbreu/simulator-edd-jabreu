export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isResponse } from "@/lib/auth/rbac";
import { createAuditLog } from "@/lib/audit";
import { hashPassword } from "@/lib/auth/password";

interface Params { params: Promise<{ id: string }> }

const updateSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  email: z.string().email().optional().nullable(),
  role: z.enum(["USER", "ADMIN"]).optional(),
  resetPassword: z.string().min(8).max(72).optional(), // nueva contraseña directa (admin reset)
});

export async function PUT(req: NextRequest, { params }: Params) {
  const actor = await requireAdmin();
  if (isResponse(actor)) return actor;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { resetPassword, ...rest } = parsed.data;
  const data: Record<string, unknown> = { ...rest };
  if (resetPassword) {
    data.passwordHash = await hashPassword(resetPassword);
  }

  const updated = await prisma.user.update({ where: { id }, data });
  await createAuditLog(actor.sub, resetPassword ? "RESET_PASSWORD" : "UPDATE_USER", "User", id, {
    changes: Object.keys(data),
  });

  return NextResponse.json({ id: updated.id, username: updated.username, role: updated.role });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const actor = await requireAdmin();
  if (isResponse(actor)) return actor;
  const { id } = await params;

  if (id === actor.sub) {
    return NextResponse.json({ error: "No puedes eliminar tu propia cuenta" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id } });
  await createAuditLog(actor.sub, "DELETE_USER", "User", id, {});

  return NextResponse.json({ ok: true });
}
