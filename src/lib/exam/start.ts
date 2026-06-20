import { PublicQuestion, PublicOption } from "./types";

interface RawOption {
  id: string;
  text: string;
  isCorrect?: boolean; // presente en DB, se elimina aquí
  [key: string]: unknown;
}

interface RawQuestion {
  id: string;
  text: string;
  difficulty: string;
  options: RawOption[];
  [key: string]: unknown;
}

/** Fisher-Yates in-place shuffle */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Selecciona aleatoriamente `count` preguntas de `allQuestions`
 * y elimina `isCorrect` de las opciones antes de devolver.
 * Esta función NO toca la base de datos.
 */
export function selectAndShuffleQuestions(
  allQuestions: RawQuestion[],
  count: number
): PublicQuestion[] {
  const shuffled = shuffle(allQuestions).slice(0, count);

  return shuffled.map((q) => ({
    id: q.id,
    text: q.text,
    difficulty: q.difficulty,
    // Las opciones también se mezclan para variar el orden
    options: shuffle(q.options).map(
      ({ id, text }): PublicOption => ({ id, text }) // isCorrect queda fuera por desestructuración
    ),
  }));
}
