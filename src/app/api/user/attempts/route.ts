export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isResponse } from "@/lib/auth/rbac";

export async function GET() {
  const user = await requireAuth();
  if (isResponse(user)) return user;

  const attempts = await prisma.attempt.findMany({
    where: { userId: user.sub },
    orderBy: { createdAt: "desc" },
    include: {
      evaluation: { select: { title: true, totalPoints: true } },
      _count: { select: { answers: true } },
    },
  });

  return NextResponse.json(attempts);
}
