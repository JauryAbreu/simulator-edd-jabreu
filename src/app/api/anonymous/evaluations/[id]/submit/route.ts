export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { submitSchema } from "@/lib/validations";
import {
  computeStatus,
  computeDurationSeconds,
  gradeAnswers,
  buildReview,
} from "@/lib/exam/grade";
import { checkRateLimit, cleanupRateLimitEntries } from "@/lib/rate-limit";

const IP_MAX = 20;
const IP_WINDOW = 5 * 60;

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: Params) {
  cleanupRateLimitEntries();
  const ip = getClientIp(req);
  const limit = await checkRateLimit(`anon:submit:ip:${ip}`, IP_MAX, IP_WINDOW);
  if (limit.blocked) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta de nuevo más tarde." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((limit.resetAt.getTime() - Date.now()) / 1000)) },
      },
    );
  }

  const { id: evaluationId } = await params;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { startedAt: startedAtRaw, answers } = parsed.data;

  // Look up the system anchor user for anonymous attempts
  const anonUser = await prisma.user.findFirst({ where: { role: "ANONYMOUS" } });
  if (!anonUser) {
    return NextResponse.json({ error: "Error de configuración del servidor" }, { status: 500 });
  }

  const evaluation = await prisma.evaluation.findUnique({
    where: { id: evaluationId, isActive: true },
    select: { totalPoints: true, numberOfQuestions: true, timeLimitMinutes: true },
  });

  if (!evaluation) {
    return NextResponse.json({ error: "Evaluación no encontrada" }, { status: 404 });
  }

  // Anti-tampering: only accept questionIds that belong to this evaluation
  const submittedQuestionIds = answers.map((a) => a.questionId);
  const validQuestions = await prisma.question.findMany({
    where: { id: { in: submittedQuestionIds }, evaluationId, isActive: true },
    select: { id: true },
  });
  const validQuestionIdSet = new Set(validQuestions.map((q) => q.id));
  const validAnswers = answers.filter((a) => validQuestionIdSet.has(a.questionId));

  const startedAt = new Date(startedAtRaw);
  const submittedAt = new Date();

  const pointsPerQuestion =
    Math.round((evaluation.totalPoints / evaluation.numberOfQuestions) * 100) / 100;

  const graded = await gradeAnswers(prisma, validAnswers, pointsPerQuestion);

  const correctCount    = graded.filter((g) => g.isCorrect).length;
  const incorrectCount  = graded.filter((g) => !g.isCorrect && g.selectedOptionId !== null).length;
  const unansweredCount =
    evaluation.numberOfQuestions - graded.length +
    graded.filter((g) => g.selectedOptionId === null).length;
  const score = Math.round(graded.reduce((sum, g) => sum + g.pointsEarned, 0) * 100) / 100;

  const status = computeStatus(startedAt, submittedAt, evaluation.timeLimitMinutes);
  const durationSeconds = computeDurationSeconds(startedAt, submittedAt);

  // Persist under anonymous system user
  await prisma.$transaction(async (tx) => {
    const newAttempt = await tx.attempt.create({
      data: {
        userId: anonUser.id,
        evaluationId,
        score,
        correctCount,
        incorrectCount,
        unansweredCount,
        startedAt,
        submittedAt,
        durationSeconds,
        status,
        isAnonymous: true,
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
  });

  // Full review included in response — the only time the visitor sees this
  const review = await buildReview(prisma, graded);

  return NextResponse.json({
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
