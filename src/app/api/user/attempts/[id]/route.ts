export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isResponse } from "@/lib/auth/rbac";

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const user = await requireAuth();
  if (isResponse(user)) return user;
  const { id } = await params;

  const attempt = await prisma.attempt.findUnique({
    where: { id, userId: user.sub },
    include: {
      evaluation: { select: { title: true, totalPoints: true } },
      answers: {
        include: {
          question: { select: { text: true, explanation: true, difficulty: true } },
          selectedOption: { select: { text: true } },
        },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!attempt) return NextResponse.json({ error: "Intento no encontrado" }, { status: 404 });
  return NextResponse.json(attempt);
}
