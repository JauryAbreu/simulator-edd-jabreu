export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { selectAndShuffleQuestions } from "@/lib/exam/start";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;

  const evaluation = await prisma.evaluation.findUnique({
    where: { id, isActive: true },
    select: { id: true, numberOfQuestions: true, totalPoints: true, timeLimitMinutes: true },
  });

  if (!evaluation) {
    return NextResponse.json({ error: "Evaluación no encontrada" }, { status: 404 });
  }

  // Traemos solo los campos necesarios; isCorrect NO se selecciona
  const allActiveQuestions = await prisma.question.findMany({
    where: { evaluationId: id, isActive: true },
    select: {
      id: true,
      text: true,
      difficulty: true,
      options: {
        select: {
          id: true,
          text: true,
          // isCorrect intencionalmente omitido
        },
      },
    },
  });

  if (allActiveQuestions.length < evaluation.numberOfQuestions) {
    return NextResponse.json(
      {
        error: "La evaluación no tiene suficientes preguntas activas",
        required: evaluation.numberOfQuestions,
        available: allActiveQuestions.length,
      },
      { status: 422 }
    );
  }

  const questions = selectAndShuffleQuestions(allActiveQuestions, evaluation.numberOfQuestions);
  const pointsPerQuestion =
    Math.round((evaluation.totalPoints / evaluation.numberOfQuestions) * 100) / 100;

  // ⚠ Nada se escribe en base de datos aquí
  return NextResponse.json({
    evaluationId: id,
    startedAt: new Date().toISOString(),
    timeLimitMinutes: evaluation.timeLimitMinutes,
    pointsPerQuestion,
    questions,
  });
}
