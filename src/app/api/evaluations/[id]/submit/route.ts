export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { submitSchema } from "@/lib/validations";
import {
  computeStatus,
  computeDurationSeconds,
  gradeAnswers,
  buildReview,
} from "@/lib/exam/grade";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id: evaluationId } = await params;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { startedAt: startedAtRaw, answers } = parsed.data;

  const evaluation = await prisma.evaluation.findUnique({
    where: { id: evaluationId, isActive: true },
    select: { totalPoints: true, numberOfQuestions: true, timeLimitMinutes: true },
  });

  if (!evaluation) {
    return NextResponse.json({ error: "Evaluación no encontrada" }, { status: 404 });
  }

  // Verificar que los questionIds pertenecen a esta evaluación (anti-tampering)
  const submittedQuestionIds = answers.map((a) => a.questionId);
  const validQuestions = await prisma.question.findMany({
    where: { id: { in: submittedQuestionIds }, evaluationId, isActive: true },
    select: { id: true },
  });
  const validQuestionIdSet = new Set(validQuestions.map((q) => q.id));
  const validAnswers = answers.filter((a) => validQuestionIdSet.has(a.questionId));

  const startedAt = new Date(startedAtRaw);
  const submittedAt = new Date(); // timestamp de servidor — no del cliente

  const pointsPerQuestion =
    Math.round((evaluation.totalPoints / evaluation.numberOfQuestions) * 100) / 100;

  // ── Calificación desde BD — nunca desde el cliente ────────────────────────
  const graded = await gradeAnswers(prisma, validAnswers, pointsPerQuestion);

  const correctCount = graded.filter((g) => g.isCorrect).length;
  const incorrectCount = graded.filter((g) => !g.isCorrect && g.selectedOptionId !== null).length;
  const unansweredCount = evaluation.numberOfQuestions - graded.length +
    graded.filter((g) => g.selectedOptionId === null).length;
  const score = Math.round(graded.reduce((sum, g) => sum + g.pointsEarned, 0) * 100) / 100;

  const status = computeStatus(startedAt, submittedAt, evaluation.timeLimitMinutes);
  const durationSeconds = computeDurationSeconds(startedAt, submittedAt);

  // ── Persiste en una sola transacción ──────────────────────────────────────
  const attempt = await prisma.$transaction(async (tx) => {
    const newAttempt = await tx.attempt.create({
      data: {
        userId: user.sub,
        evaluationId,
        score,
        correctCount,
        incorrectCount,
        unansweredCount,
        startedAt,
        submittedAt,
        durationSeconds,
        status,
      },
    });

    await tx.answer.createMany({
      data: graded.map((g) => ({
        attemptId: newAttempt.id,
        questionId: g.questionId,
        selectedOptionId: g.selectedOptionId ?? null,
        isCorrect: g.isCorrect,
        pointsEarned: g.pointsEarned,
      })),
    });

    return newAttempt;
  });

  // ── Detalle de revisión para pantalla inmediata ───────────────────────────
  const review = await buildReview(prisma, graded);

  return NextResponse.json({
    attemptId: attempt.id,
    score,
    totalPoints: evaluation.totalPoints,
    correctCount,
    incorrectCount,
    unansweredCount,
    durationSeconds,
    status,
    review,
  });
}
