export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isResponse } from "@/lib/auth/rbac";
import { createAuditLog } from "@/lib/audit";

interface Params { params: Promise<{ id: string }> }

const schema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(1000).optional(),
  numberOfQuestions: z.number().int().min(1).optional(),
  totalPoints: z.number().positive().optional(),
  timeLimitMinutes: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(_req: NextRequest, { params }: Params) {
  const user = await requireAdmin();
  if (isResponse(user)) return user;
  const { id } = await params;

  const evaluation = await prisma.evaluation.findUnique({
    where: { id },
    include: { _count: { select: { questions: { where: { isActive: true } }, attempts: true } } },
  });
  if (!evaluation) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  return NextResponse.json(evaluation);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const user = await requireAdmin();
  if (isResponse(user)) return user;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const data = parsed.data;

  // Si intenta activar, verificar que haya suficientes preguntas activas
  if (data.isActive === true) {
    const evaluation = await prisma.evaluation.findUnique({ where: { id }, select: { numberOfQuestions: true } });
    const targetN = data.numberOfQuestions ?? evaluation?.numberOfQuestions ?? 0;
    const activeCount = await prisma.question.count({ where: { evaluationId: id, isActive: true } });
    if (activeCount < targetN) {
      return NextResponse.json({
        error: `No se puede activar: la evaluación requiere ${targetN} preguntas activas pero solo hay ${activeCount}.`,
      }, { status: 422 });
    }
  }

  const evaluation = await prisma.evaluation.update({ where: { id }, data });
  await createAuditLog(user.sub, "UPDATE", "Evaluation", id, data as Record<string, unknown>);

  return NextResponse.json(evaluation);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await requireAdmin();
  if (isResponse(user)) return user;
  const { id } = await params;

  await prisma.evaluation.delete({ where: { id } });
  await createAuditLog(user.sub, "DELETE", "Evaluation", id, {});

  return NextResponse.json({ ok: true });
}
