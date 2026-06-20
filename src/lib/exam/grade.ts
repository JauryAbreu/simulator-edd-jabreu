import { GradedAnswer, ReviewItem, SubmitAnswer } from "./types";

export const GRACE_PERIOD_SECONDS = 5;

export type AttemptStatus = "COMPLETED" | "OUT_OF_TIME";

/**
 * Determina si el intento superó el límite de tiempo.
 * Lógica pura, sin acceso a BD.
 */
export function computeStatus(
  startedAt: Date,
  submittedAt: Date,
  timeLimitMinutes: number
): AttemptStatus {
  const durationSeconds = (submittedAt.getTime() - startedAt.getTime()) / 1000;
  const limitSeconds = timeLimitMinutes * 60;
  return durationSeconds > limitSeconds + GRACE_PERIOD_SECONDS
    ? "OUT_OF_TIME"
    : "COMPLETED";
}

export function computeDurationSeconds(startedAt: Date, submittedAt: Date): number {
  return Math.round((submittedAt.getTime() - startedAt.getTime()) / 1000);
}

// ── Interfaces mínimas de Prisma necesarias para calificar ──────────────────

export interface OptionReader {
  findFirst(args: {
    where: { id: string; questionId: string };
    select: { isCorrect: true };
  }): Promise<{ isCorrect: boolean } | null>;
  findUnique(args: {
    where: { id: string };
    select: { text: true };
  }): Promise<{ text: string } | null>;
}

export interface GradingPrisma {
  option: OptionReader;
  question: {
    findFirst(args: {
      where: { id: string };
      select: {
        text: true;
        explanation: true;
        options: { where: { isCorrect: true }; select: { id: true; text: true }; take: 1 };
      };
    }): Promise<{
      text: string;
      explanation: string | null;
      options: { id: string; text: string }[];
    } | null>;
  };
}

/**
 * Califica cada respuesta consultando la BD.
 * Nunca confía en isCorrect/score enviado por el cliente.
 * Si selectedOptionId no pertenece a questionId → cuenta como no respondida.
 */
export async function gradeAnswers(
  db: { option: Pick<OptionReader, "findFirst"> },
  answers: SubmitAnswer[],
  pointsPerQuestion: number
): Promise<GradedAnswer[]> {
  return Promise.all(
    answers.map(async ({ questionId, selectedOptionId }) => {
      if (!selectedOptionId) {
        return { questionId, selectedOptionId: null, isCorrect: false, pointsEarned: 0 };
      }

      // Verificamos que la opción pertenece a esta pregunta (evita trampa cruzada)
      const opt = await db.option.findFirst({
        where: { id: selectedOptionId, questionId },
        select: { isCorrect: true },
      });

      // Si la opción no existe o no pertenece a la pregunta → no respondida
      if (!opt) {
        return { questionId, selectedOptionId: null, isCorrect: false, pointsEarned: 0 };
      }

      return {
        questionId,
        selectedOptionId,
        isCorrect: opt.isCorrect,
        pointsEarned: opt.isCorrect ? pointsPerQuestion : 0,
      };
    })
  );
}

/**
 * Construye el detalle de revisión por pregunta para la pantalla de resultados.
 */
export async function buildReview(
  db: GradingPrisma,
  graded: GradedAnswer[]
): Promise<ReviewItem[]> {
  return Promise.all(
    graded.map(async ({ questionId, selectedOptionId, isCorrect, pointsEarned }) => {
      const question = await db.question.findFirst({
        where: { id: questionId },
        select: {
          text: true,
          explanation: true,
          options: { where: { isCorrect: true }, select: { id: true, text: true }, take: 1 },
        },
      });

      const correctOption = question?.options[0] ?? { id: "", text: "N/A" };

      let selectedOptionText: string | null = null;
      if (selectedOptionId) {
        const opt = await db.option.findUnique({
          where: { id: selectedOptionId },
          select: { text: true },
        });
        selectedOptionText = opt?.text ?? null;
      }

      return {
        questionId,
        questionText: question?.text ?? "",
        explanation: question?.explanation ?? null,
        selectedOptionId,
        selectedOptionText,
        correctOptionId: correctOption.id,
        correctOptionText: correctOption.text,
        isCorrect,
        pointsEarned,
      };
    })
  );
}
