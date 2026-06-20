export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isResponse } from "@/lib/auth/rbac";
import { createAuditLog } from "@/lib/audit";

interface Params { params: Promise<{ id: string; qid: string }> }

const updateSchema = z.object({
  text: z.string().min(1).optional(),
  explanation: z.string().optional(),
  difficulty: z.enum(["BAJA", "MEDIA", "ALTA"]).optional(),
  isActive: z.boolean().optional(),
  options: z.array(z.object({
    id: z.string().optional(),
    text: z.string().min(1),
    isCorrect: z.boolean(),
  })).min(2).max(5).refine(
    (opts) => opts.filter((o) => o.isCorrect).length === 1,
    { message: "Debe haber exactamente una opción correcta" }
  ).optional(),
});

export async function PUT(req: NextRequest, { params }: Params) {
  const user = await requireAdmin();
  if (isResponse(user)) return user;
  const { id: evaluationId, qid } = await params;

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { options, ...qData } = parsed.data;

  const question = await prisma.$transaction(async (tx) => {
    if (options) {
      // Replace all options
      await tx.option.deleteMany({ where: { questionId: qid } });
      await tx.option.createMany({ data: options.map(({ text, isCorrect }) => ({ questionId: qid, text, isCorrect })) });
    }
    return tx.question.update({ where: { id: qid, evaluationId }, data: qData, include: { options: true } });
  });

  await createAuditLog(user.sub, "UPDATE", "Question", qid, { evaluationId, ...qData });
  return NextResponse.json(question);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await requireAdmin();
  if (isResponse(user)) return user;
  const { id: evaluationId, qid } = await params;

  await prisma.question.delete({ where: { id: qid, evaluationId } });
  await createAuditLog(user.sub, "DELETE", "Question", qid, { evaluationId });

  return NextResponse.json({ ok: true });
}
