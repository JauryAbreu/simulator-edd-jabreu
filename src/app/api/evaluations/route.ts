export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const evaluations = await prisma.evaluation.findMany({
    where: { isActive: true },
    select: {
      id: true,
      title: true,
      description: true,
      numberOfQuestions: true,
      totalPoints: true,
      timeLimitMinutes: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(evaluations);
}
