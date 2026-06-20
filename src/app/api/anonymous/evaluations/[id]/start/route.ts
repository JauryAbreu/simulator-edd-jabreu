export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { selectAndShuffleQuestions } from "@/lib/exam/start";
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
  const limit = await checkRateLimit(`anon:start:ip:${ip}`, IP_MAX, IP_WINDOW);
  if (limit.blocked) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta de nuevo más tarde." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((limit.resetAt.getTime() - Date.now()) / 1000)) },
      },
    );
  }

  const { id } = await params;

  const evaluation = await prisma.evaluation.findUnique({
    where: { id, isActive: true },
    select: { id: true, numberOfQuestions: true, totalPoints: true, timeLimitMinutes: true, title: true },
  });

  if (!evaluation) {
    return NextResponse.json({ error: "Evaluación no encontrada" }, { status: 404 });
  }

  const allActiveQuestions = await prisma.question.findMany({
    where: { evaluationId: id, isActive: true },
    select: {
      id: true,
      text: true,
      difficulty: true,
      options: { select: { id: true, text: true } },
    },
  });

  if (allActiveQuestions.length < evaluation.numberOfQuestions) {
    return NextResponse.json(
      {
        error: "La evaluación no tiene suficientes preguntas activas",
        required: evaluation.numberOfQuestions,
        available: allActiveQuestions.length,
      },
      { status: 422 },
    );
  }

  const questions = selectAndShuffleQuestions(allActiveQuestions, evaluation.numberOfQuestions);
  const pointsPerQuestion =
    Math.round((evaluation.totalPoints / evaluation.numberOfQuestions) * 100) / 100;

  return NextResponse.json({
    evaluationId: id,
    title: evaluation.title,
    startedAt: new Date().toISOString(),
    timeLimitMinutes: evaluation.timeLimitMinutes,
    pointsPerQuestion,
    questions,
  });
}
