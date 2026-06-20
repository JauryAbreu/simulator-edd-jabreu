export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isResponse } from "@/lib/auth/rbac";

export async function GET() {
  const user = await requireAdmin();
  if (isResponse(user)) return user;

  const [
    totalUsers,
    totalAttempts,
    evaluationStats,
    recentAttempts,
    errorRanking,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "USER" } }),
    prisma.attempt.count(),

    // Score promedio por evaluación
    prisma.evaluation.findMany({
      where: { isActive: true },
      select: {
        id: true,
        title: true,
        totalPoints: true,
        _count: { select: { attempts: true } },
        attempts: { select: { score: true } },
      },
    }),

    // Intentos por día (últimos 30 días)
    prisma.attempt.groupBy({
      by: ["createdAt"],
      _count: { id: true },
      orderBy: { createdAt: "asc" },
    }),

    // Preguntas con mayor tasa de error (más incorrectas)
    prisma.answer.groupBy({
      by: ["questionId"],
      _count: { id: true },
      where: { isCorrect: false, selectedOptionId: { not: null } },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    }),
  ]);

  const avgScoreByEvaluation = evaluationStats.map((e) => ({
    id: e.id,
    title: e.title,
    totalPoints: e.totalPoints,
    attemptCount: e._count.attempts,
    avgScore:
      e.attempts.length > 0
        ? Math.round((e.attempts.reduce((s, a) => s + a.score, 0) / e.attempts.length) * 10) / 10
        : 0,
  }));

  // Enrich error ranking with question text
  const errorQuestionIds = errorRanking.map((r) => r.questionId);
  const questions = await prisma.question.findMany({
    where: { id: { in: errorQuestionIds } },
    select: { id: true, text: true, evaluationId: true,
      evaluation: { select: { title: true } } },
  });
  const questionMap = Object.fromEntries(questions.map((q) => [q.id, q]));

  const enrichedErrorRanking = errorRanking.map((r) => ({
    questionId: r.questionId,
    errorCount: r._count.id,
    text: questionMap[r.questionId]?.text ?? "—",
    evaluation: questionMap[r.questionId]?.evaluation.title ?? "—",
  }));

  // Uso por día — agrupar por fecha (YYYY-MM-DD)
  const usageByDay: Record<string, number> = {};
  for (const a of recentAttempts) {
    const day = new Date(a.createdAt).toISOString().slice(0, 10);
    usageByDay[day] = (usageByDay[day] ?? 0) + a._count.id;
  }
  const usageChart = Object.entries(usageByDay)
    .map(([date, count]) => ({ date, count }))
    .slice(-30);

  return NextResponse.json({
    totalUsers,
    totalAttempts,
    avgScoreByEvaluation,
    errorRanking: enrichedErrorRanking,
    usageChart,
  });
}
