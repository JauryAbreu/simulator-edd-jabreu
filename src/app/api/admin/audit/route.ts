export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isResponse } from "@/lib/auth/rbac";

export async function GET(req: NextRequest) {
  const user = await requireAdmin();
  if (isResponse(user)) return user;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = 50;
  const skip = (page - 1) * limit;

  const [total, logs] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  const actorIds = [...new Set(logs.map((l) => l.actorId))];
  const actors = await prisma.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, username: true },
  });
  const actorMap = Object.fromEntries(actors.map((a) => [a.id, a.username]));

  return NextResponse.json({
    logs: logs.map((l) => ({ ...l, actorUsername: actorMap[l.actorId] ?? l.actorId })),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}
