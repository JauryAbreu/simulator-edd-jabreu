export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isResponse } from "@/lib/auth/rbac";
import { createAuditLog } from "@/lib/audit";

const schema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  numberOfQuestions: z.number().int().min(1),
  totalPoints: z.number().positive(),
  timeLimitMinutes: z.number().int().min(1),
  isActive: z.boolean().optional().default(false),
});

export async function GET() {
  const user = await requireAdmin();
  if (isResponse(user)) return user;

  const evaluations = await prisma.evaluation.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { questions: { where: { isActive: true } }, attempts: true } },
    },
  });

  return NextResponse.json(evaluations);
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin();
  if (isResponse(user)) return user;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const evaluation = await prisma.evaluation.create({ data: parsed.data });
  await createAuditLog(user.sub, "CREATE", "Evaluation", evaluation.id, { title: evaluation.title });

  return NextResponse.json(evaluation, { status: 201 });
}
