// ──────────────────────────────────────────────────────────────
// Tipos públicos del flujo de examen
// isCorrect NUNCA aparece en los tipos enviados al cliente
// ──────────────────────────────────────────────────────────────

export interface PublicOption {
  id: string;
  text: string;
}

export interface PublicQuestion {
  id: string;
  text: string;
  difficulty: string;
  options: PublicOption[];
}

export interface StartPayload {
  evaluationId: string;
  startedAt: string; // ISO timestamp del servidor
  timeLimitMinutes: number;
  pointsPerQuestion: number;
  questions: PublicQuestion[];
}

export interface SubmitAnswer {
  questionId: string;
  selectedOptionId?: string | null;
}

export interface GradedAnswer {
  questionId: string;
  selectedOptionId: string | null;
  isCorrect: boolean;
  pointsEarned: number;
}

export interface ReviewItem {
  questionId: string;
  questionText: string;
  explanation: string | null;
  selectedOptionId: string | null;
  selectedOptionText: string | null;
  correctOptionId: string;
  correctOptionText: string;
  isCorrect: boolean;
  pointsEarned: number;
}

export interface SubmitResult {
  attemptId: string;
  score: number;
  totalPoints: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  durationSeconds: number;
  status: "COMPLETED" | "OUT_OF_TIME";
  review: ReviewItem[];
}
