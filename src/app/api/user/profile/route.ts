export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, isResponse } from "@/lib/auth/rbac";

const schema = z.object({
  fullName: z.string().min(2).max(100),
});

export async function PUT(req: NextRequest) {
  const user = await requireAuth();
  if (isResponse(user)) return user;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: user.sub },
    data: parsed.data,
    select: { id: true, username: true, fullName: true, email: true, role: true },
  });

  return NextResponse.json(updated);
}
