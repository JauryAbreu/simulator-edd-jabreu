export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isResponse } from "@/lib/auth/rbac";
import { createAuditLog } from "@/lib/audit";

interface Params { params: Promise<{ id: string }> }

const optionSchema = z.object({
  text: z.string().min(1),
  isCorrect: z.boolean(),
});

const questionSchema = z.object({
  text: z.string().min(1),
  explanation: z.string().optional(),
  difficulty: z.enum(["BAJA", "MEDIA", "ALTA"]).default("MEDIA"),
  options: z.array(optionSchema).min(2).max(5).refine(
    (opts) => opts.filter((o) => o.isCorrect).length === 1,
    { message: "Debe haber exactamente una opción correcta" }
  ),
});

export async function GET(_req: NextRequest, { params }: Params) {
  const user = await requireAdmin();
  if (isResponse(user)) return user;
  const { id } = await params;

  const questions = await prisma.question.findMany({
    where: { evaluationId: id },
    include: { options: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(questions);
}

export async function POST(req: NextRequest, { params }: Params) {
  const user = await requireAdmin();
  if (isResponse(user)) return user;
  const { id: evaluationId } = await params;

  const body = await req.json().catch(() => null);
  const parsed = questionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { options, ...qData } = parsed.data;
  const question = await prisma.question.create({
    data: {
      ...qData,
      evaluationId,
      options: { createMany: { data: options } },
    },
    include: { options: true },
  });

  await createAuditLog(user.sub, "CREATE", "Question", question.id, { evaluationId, text: question.text });
  return NextResponse.json(question, { status: 201 });
}
