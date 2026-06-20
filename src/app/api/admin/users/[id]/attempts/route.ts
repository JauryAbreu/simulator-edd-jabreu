export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireAdmin, isResponse } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (isResponse(admin)) return admin;

  const { id: userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, fullName: true, username: true, email: true, role: true, createdAt: true },
  });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const attempts = await prisma.attempt.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      evaluation: { select: { id: true, title: true, totalPoints: true } },
    },
  });

  return NextResponse.json({ user, attempts });
}
