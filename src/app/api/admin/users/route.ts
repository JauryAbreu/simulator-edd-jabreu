export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isResponse } from "@/lib/auth/rbac";
import { createAuditLog } from "@/lib/audit";
import { hashPassword } from "@/lib/auth/password";

const createSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email().optional(),
  fullName: z.string().min(2).max(100),
  password: z.string().min(8).max(72),
  role: z.enum(["USER", "ADMIN"]).default("USER"),
});

export async function GET() {
  const user = await requireAdmin();
  if (isResponse(user)) return user;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, username: true, email: true, fullName: true, role: true, createdAt: true,
      _count: { select: { attempts: true } },
    },
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin();
  if (isResponse(user)) return user;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { password, ...rest } = parsed.data;
  const existing = await prisma.user.findFirst({
    where: { OR: [{ username: rest.username }, ...(rest.email ? [{ email: rest.email }] : [])] },
  });
  if (existing) return NextResponse.json({ error: "Usuario o correo ya existe" }, { status: 409 });

  const passwordHash = await hashPassword(password);
  const created = await prisma.user.create({ data: { ...rest, passwordHash } });
  await createAuditLog(user.sub, "CREATE_USER", "User", created.id, { username: created.username, role: created.role });

  return NextResponse.json({ id: created.id, username: created.username, role: created.role }, { status: 201 });
}
