export const runtime = "nodejs";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EvaluationDetailPage({ params }: Props) {
  const { id } = await params;

  const evaluation = await prisma.evaluation.findUnique({
    where: { id, isActive: true },
    include: { questions: { where: { isActive: true }, include: { options: true } } },
  });

  if (!evaluation) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{evaluation.title}</h1>
        <p className="text-gray-500 mt-1">{evaluation.description}</p>
        <div className="mt-2 flex gap-4 text-sm text-gray-400">
          <span>{evaluation.numberOfQuestions} preguntas</span>
          <span>{evaluation.timeLimitMinutes} minutos</span>
          <span>{evaluation.totalPoints} puntos totales</span>
        </div>
      </div>

      <div className="rounded-md bg-yellow-50 border border-yellow-200 p-4 text-sm text-yellow-800">
        La funcionalidad de tomar el examen estará disponible próximamente.
      </div>
    </div>
  );
}
