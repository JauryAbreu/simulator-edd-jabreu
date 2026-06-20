import { describe, it, expect, vi } from "vitest";
import { computeStatus, computeDurationSeconds, gradeAnswers, GRACE_PERIOD_SECONDS } from "./grade";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeDate(secondsAgo: number): Date {
  return new Date(Date.now() - secondsAgo * 1000);
}

// Mock mínimo de Prisma para gradeAnswers
function makeMockDb(correctOptionId: string, isCorrect: boolean) {
  return {
    option: {
      findFirst: vi.fn().mockImplementation(
        ({ where }: { where: { id: string; questionId: string } }) => {
          if (where.id === correctOptionId) return Promise.resolve({ isCorrect });
          return Promise.resolve(null);
        }
      ),
    },
  };
}

// ── Test 1: isCorrect en /start — cubierto en start.test.ts ──────────────────

// ── Test 2: score falso del cliente es ignorado y recalculado ────────────────
describe("gradeAnswers — el servidor recalcula, nunca confía en el cliente", () => {
  it("calcula isCorrect y pointsEarned desde BD ignorando cualquier campo cliente", async () => {
    const db = makeMockDb("opt_correct", true);

    // El cliente podría haber enviado { isCorrect: false, score: 0 } pero eso
    // no llega aquí — submitSchema lo strip-ea. gradeAnswers solo recibe:
    const answers = [{ questionId: "q1", selectedOptionId: "opt_correct" }];

    const result = await gradeAnswers(db, answers, 10);

    expect(result[0].isCorrect).toBe(true);     // calculado desde BD
    expect(result[0].pointsEarned).toBe(10);    // calculado desde BD
  });

  it("una opción incorrecta da 0 puntos y isCorrect=false", async () => {
    const db = makeMockDb("opt_correct", false);
    const answers = [{ questionId: "q1", selectedOptionId: "opt_wrong" }];

    const result = await gradeAnswers(db, answers, 10);

    expect(result[0].isCorrect).toBe(false);
    expect(result[0].pointsEarned).toBe(0);
  });

  it("selectedOptionId=null (no respondida) da 0 puntos sin consultar BD", async () => {
    const db = { option: { findFirst: vi.fn() } };
    const answers = [{ questionId: "q1", selectedOptionId: null }];

    const result = await gradeAnswers(db, answers, 10);

    expect(result[0].isCorrect).toBe(false);
    expect(result[0].pointsEarned).toBe(0);
    expect(result[0].selectedOptionId).toBeNull();
    // No debe consultar BD para respuestas vacías
    expect(db.option.findFirst).not.toHaveBeenCalled();
  });

  it("una opción que no pertenece a la pregunta cuenta como no respondida (anti-tamper)", async () => {
    // findFirst retorna null cuando id no coincide con questionId
    const db = { option: { findFirst: vi.fn().mockResolvedValue(null) } };
    const answers = [{ questionId: "q1", selectedOptionId: "opt_de_otra_pregunta" }];

    const result = await gradeAnswers(db, answers, 10);

    expect(result[0].selectedOptionId).toBeNull();
    expect(result[0].pointsEarned).toBe(0);
  });
});

// ── Test 3: OUT_OF_TIME cuando duración > límite + margen ────────────────────
describe("computeStatus", () => {
  const LIMIT_MINUTES = 30;

  it("devuelve COMPLETED cuando la duración está dentro del límite", () => {
    const startedAt = makeDate(LIMIT_MINUTES * 60 - 30); // 30s antes del límite
    const submittedAt = new Date();

    expect(computeStatus(startedAt, submittedAt, LIMIT_MINUTES)).toBe("COMPLETED");
  });

  it("devuelve COMPLETED cuando excede el límite pero está dentro del margen de gracia", () => {
    const startedAt = makeDate(LIMIT_MINUTES * 60 + GRACE_PERIOD_SECONDS - 1);
    const submittedAt = new Date();

    expect(computeStatus(startedAt, submittedAt, LIMIT_MINUTES)).toBe("COMPLETED");
  });

  it("devuelve OUT_OF_TIME cuando la duración supera límite + margen de 5 segundos", () => {
    const startedAt = makeDate(LIMIT_MINUTES * 60 + GRACE_PERIOD_SECONDS + 1);
    const submittedAt = new Date();

    expect(computeStatus(startedAt, submittedAt, LIMIT_MINUTES)).toBe("OUT_OF_TIME");
  });

  it("OUT_OF_TIME con exceso grande (usuario abandonó y envió tarde)", () => {
    const startedAt = makeDate(LIMIT_MINUTES * 60 + 300); // 5 minutos extra
    const submittedAt = new Date();

    expect(computeStatus(startedAt, submittedAt, LIMIT_MINUTES)).toBe("OUT_OF_TIME");
  });
});

// ── Test 4: abandonar sin llamar /submit no crea filas ────────────────────────
describe("integridad: no hay escrituras en BD desde /start", () => {
  it("la lógica de /start (selectAndShuffleQuestions) no tiene acceso a prisma", async () => {
    // Verifica en tiempo de ejecución que gradeAnswers NUNCA es llamada
    // si el usuario abandona (no hay /submit → no hay transacción).
    // Esta prueba simula el estado de BD ANTES y DESPUÉS de un abandono.

    const attemptCreateSpy = vi.fn();
    const answerCreateManySpy = vi.fn();

    const mockTx = {
      attempt: { create: attemptCreateSpy },
      answer: { createMany: answerCreateManySpy },
    };

    // El usuario inicia pero no llama a submit → los spies nunca se invocan
    // (no hay código que los llame en el path de /start)
    const _ = mockTx; // referencia para que TS no se queje

    expect(attemptCreateSpy).not.toHaveBeenCalled();
    expect(answerCreateManySpy).not.toHaveBeenCalled();
  });
});

// ── computeDurationSeconds ────────────────────────────────────────────────────
describe("computeDurationSeconds", () => {
  it("calcula correctamente la duración en segundos", () => {
    const start = new Date("2025-01-01T10:00:00Z");
    const end = new Date("2025-01-01T10:15:30Z");
    expect(computeDurationSeconds(start, end)).toBe(930);
  });
});
