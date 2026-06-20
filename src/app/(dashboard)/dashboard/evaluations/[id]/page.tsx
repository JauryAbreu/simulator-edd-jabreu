export const runtime = "nodejs";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import StartExamButton from "./StartExamButton";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EvaluationDetailPage({ params }: Props) {
  const { id } = await params;

  const evaluation = await prisma.evaluation.findUnique({
    where: { id, isActive: true },
    select: {
      id: true,
      title: true,
      description: true,
      numberOfQuestions: true,
      totalPoints: true,
      timeLimitMinutes: true,
      _count: { select: { questions: { where: { isActive: true } } } },
    },
  });

  if (!evaluation) notFound();

  const hasEnoughQuestions = evaluation._count.questions >= evaluation.numberOfQuestions;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{evaluation.title}</h1>
        <p className="text-gray-600 mt-2">{evaluation.description}</p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
        <h2 className="font-semibold text-gray-800">Detalles del simulacro</h2>
        <dl className="grid grid-cols-3 gap-4 text-center">
          <div className="rounded-md bg-blue-50 p-4">
            <dt className="text-xs text-blue-600 font-medium uppercase tracking-wide">Preguntas</dt>
            <dd className="text-2xl font-bold text-blue-900 mt-1">{evaluation.numberOfQuestions}</dd>
          </div>
          <div className="rounded-md bg-green-50 p-4">
            <dt className="text-xs text-green-600 font-medium uppercase tracking-wide">Puntos</dt>
            <dd className="text-2xl font-bold text-green-900 mt-1">{evaluation.totalPoints}</dd>
          </div>
          <div className="rounded-md bg-orange-50 p-4">
            <dt className="text-xs text-orange-600 font-medium uppercase tracking-wide">Tiempo</dt>
            <dd className="text-2xl font-bold text-orange-900 mt-1">{evaluation.timeLimitMinutes} min</dd>
          </div>
        </dl>

        <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
          Una vez iniciado el examen, el tiempo corre. No salgas de la página hasta enviarlo.
        </div>

        {hasEnoughQuestions ? (
          <StartExamButton evaluationId={evaluation.id} />
        ) : (
          <p className="text-sm text-red-600">
            Esta evaluación no tiene suficientes preguntas activas para iniciarse.
          </p>
        )}
      </div>
    </div>
  );
}
