export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireAuth, isResponse } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await requireAuth();
  if (isResponse(user)) return user;

  const attempts = await prisma.attempt.findMany({
    where: { userId: user.sub },
    select: {
      score: true,
      evaluation: { select: { totalPoints: true } },
    },
  });

  if (attempts.length === 0) {
    return NextResponse.json({ totalAttempts: 0, avgPct: 0, bestPct: 0 });
  }

  const pcts = attempts.map((a) =>
    a.evaluation.totalPoints > 0
      ? Math.round((a.score / a.evaluation.totalPoints) * 100)
      : 0,
  );

  return NextResponse.json({
    totalAttempts: attempts.length,
    avgPct: Math.round(pcts.reduce((s, p) => s + p, 0) / pcts.length),
    bestPct: Math.max(...pcts),
  });
}
