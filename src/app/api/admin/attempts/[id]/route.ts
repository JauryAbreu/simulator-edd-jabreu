export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireAdmin, isResponse } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (isResponse(admin)) return admin;

  const { id: attemptId } = await params;

  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      user: { select: { id: true, fullName: true, username: true } },
      evaluation: { select: { id: true, title: true, totalPoints: true } },
      answers: {
        include: {
          question: {
            select: { id: true, text: true, explanation: true, difficulty: true, tag: true },
          },
          selectedOption: { select: { id: true, text: true } },
        },
      },
    },
  });

  if (!attempt) return NextResponse.json({ error: "Intento no encontrado" }, { status: 404 });

  const questionIds = attempt.answers.map((a) => a.questionId);
  const allOptions = await prisma.option.findMany({
    where: { questionId: { in: questionIds } },
    select: { id: true, questionId: true, text: true, isCorrect: true },
  });

  const optsByQuestion: Record<string, typeof allOptions> = {};
  for (const opt of allOptions) {
    (optsByQuestion[opt.questionId] ??= []).push(opt);
  }

  const answers = attempt.answers.map((a) => ({
    ...a,
    allOptions: optsByQuestion[a.questionId] ?? [],
  }));

  return NextResponse.json({ ...attempt, answers });
}
