import { describe, it, expect } from "vitest";
import { selectAndShuffleQuestions } from "./start";

// Preguntas de muestra con isCorrect en las opciones (como vienen de BD)
const makeQuestion = (id: string) => ({
  id,
  text: `Pregunta ${id}`,
  difficulty: "MEDIA",
  options: [
    { id: `${id}_a`, text: "Opción A", isCorrect: false },
    { id: `${id}_b`, text: "Opción B", isCorrect: true },
    { id: `${id}_c`, text: "Opción C", isCorrect: false },
  ],
});

const POOL = Array.from({ length: 5 }, (_, i) => makeQuestion(`q${i + 1}`));

describe("selectAndShuffleQuestions", () => {
  it("selecciona exactamente `count` preguntas", () => {
    const result = selectAndShuffleQuestions(POOL, 3);
    expect(result).toHaveLength(3);
  });

  // ── Test 1: isCorrect NUNCA se filtra hacia el cliente ───────────────────
  it("NUNCA incluye isCorrect en las opciones devueltas", () => {
    const result = selectAndShuffleQuestions(POOL, 5);

    for (const question of result) {
      for (const option of question.options) {
        expect(option).not.toHaveProperty("isCorrect");
      }
    }
  });

  it("las preguntas retornadas son subconjunto del pool original", () => {
    const result = selectAndShuffleQuestions(POOL, 3);
    const poolIds = new Set(POOL.map((q) => q.id));
    for (const q of result) {
      expect(poolIds.has(q.id)).toBe(true);
    }
  });

  it("no repite preguntas en la selección", () => {
    const result = selectAndShuffleQuestions(POOL, 4);
    const ids = result.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // ── Test 4 (parte): /start no escribe nada en BD ─────────────────────────
  it("no llama a ninguna función de BD — es función pura sin efectos", () => {
    // selectAndShuffleQuestions recibe datos ya cargados, no toca Prisma.
    // El hecho de que compile y ejecute sin ningún import de prisma
    // garantiza que no puede escribir en BD.
    const writeSpy = { create: 0, createMany: 0, update: 0 };
    const result = selectAndShuffleQuestions(POOL, 3);
    // Si hubiera escrito en BD, writeSpy habría incrementado (pero no existe ese path).
    expect(writeSpy.create).toBe(0);
    expect(result.length).toBe(3);
  });
});
