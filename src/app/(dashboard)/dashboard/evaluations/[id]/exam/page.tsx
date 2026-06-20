"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import type { StartPayload } from "@/lib/exam/types";

type Answers = Record<string, string | null>; // questionId → optionId | null

function formatTime(seconds: number): string {
  const m = Math.floor(Math.max(0, seconds) / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(Math.max(0, seconds) % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

export default function ExamPage() {
  const router = useRouter();
  const { id: evaluationId } = useParams<{ id: string }>();

  const [examData, setExamData] = useState<StartPayload | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const preventUnloadRef = useRef(true);
  const submittedRef = useRef(false);

  // ── Carga el payload desde sessionStorage ───────────────────────────────
  useEffect(() => {
    const raw = sessionStorage.getItem(`exam_${evaluationId}`);
    if (!raw) {
      router.replace(`/dashboard/evaluations/${evaluationId}`);
      return;
    }
    const data: StartPayload = JSON.parse(raw);
    setExamData(data);

    // Calcula el tiempo restante basado en startedAt del servidor
    const elapsed = (Date.now() - new Date(data.startedAt).getTime()) / 1000;
    const remaining = data.timeLimitMinutes * 60 - elapsed;
    setTimeLeft(Math.max(0, remaining));

    // Restaura respuestas guardadas si el usuario refrescó la página
    const savedAnswers = sessionStorage.getItem(`exam_answers_${evaluationId}`);
    if (savedAnswers) setAnswers(JSON.parse(savedAnswers));
  }, [evaluationId, router]);

  // ── Persistir respuestas en sessionStorage mientras el usuario avanza ────
  useEffect(() => {
    if (Object.keys(answers).length > 0) {
      sessionStorage.setItem(`exam_answers_${evaluationId}`, JSON.stringify(answers));
    }
  }, [answers, evaluationId]);

  // ── Advertencia beforeunload ─────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!preventUnloadRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(
    async (auto = false) => {
      if (submittedRef.current || !examData) return;
      submittedRef.current = true;
      preventUnloadRef.current = false;
      setSubmitting(true);

      const payload = {
        startedAt: examData.startedAt,
        answers: examData.questions.map((q) => ({
          questionId: q.id,
          selectedOptionId: answers[q.id] ?? null,
        })),
      };

      const res = await fetch(`/api/evaluations/${evaluationId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error ?? "Error al enviar el examen");
        submittedRef.current = false;
        preventUnloadRef.current = true;
        setSubmitting(false);
        return;
      }

      // Limpia sesión de examen
      sessionStorage.removeItem(`exam_${evaluationId}`);
      sessionStorage.removeItem(`exam_answers_${evaluationId}`);

      router.push(
        `/dashboard/evaluations/${evaluationId}/results/${data.attemptId}${auto ? "?reason=timeout" : ""}`
      );
    },
    [examData, answers, evaluationId, router]
  );

  // ── Countdown — auto-submit al llegar a 0 ────────────────────────────────
  useEffect(() => {
    if (!examData || submittedRef.current) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(interval);
          handleSubmit(true);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [examData, handleSubmit]);

  if (!examData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Cargando examen...</p>
      </div>
    );
  }

  const question = examData.questions[currentIndex];
  const totalQuestions = examData.questions.length;
  const answeredCount = Object.values(answers).filter((v) => v !== null && v !== undefined).length;
  const isLowTime = timeLeft <= 60;
  const isVeryLowTime = timeLeft <= 10;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header con timer y progreso */}
      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-5 py-3 shadow-sm">
        <div className="text-sm text-gray-600">
          Pregunta{" "}
          <span className="font-bold text-gray-900">
            {currentIndex + 1}
          </span>{" "}
          de {totalQuestions}
          <span className="ml-3 text-gray-400">
            ({answeredCount} respondida{answeredCount !== 1 ? "s" : ""})
          </span>
        </div>

        <div
          className={`tabular-nums text-xl font-mono font-bold transition-colors ${
            isVeryLowTime
              ? "text-red-600 animate-pulse"
              : isLowTime
              ? "text-orange-500"
              : "text-gray-800"
          }`}
        >
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="h-1.5 w-full rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-blue-500 transition-all"
          style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
        />
      </div>

      {/* Tarjeta de pregunta */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-5">
        <p className="text-base font-medium text-gray-900 leading-relaxed">{question.text}</p>

        <div className="space-y-3">
          {question.options.map((opt) => {
            const selected = answers[question.id] === opt.id;
            return (
              <label
                key={opt.id}
                className={`flex cursor-pointer items-start gap-3 rounded-md border p-4 transition-colors ${
                  selected
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name={`q_${question.id}`}
                  value={opt.id}
                  checked={selected}
                  onChange={() =>
                    setAnswers((prev) => ({ ...prev, [question.id]: opt.id }))
                  }
                  className="mt-0.5 accent-blue-600"
                />
                <span className="text-sm text-gray-800">{opt.text}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Navegación */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors"
        >
          ← Anterior
        </button>

        {/* Indicadores de preguntas */}
        <div className="flex gap-1.5 flex-wrap justify-center max-w-sm">
          {examData.questions.map((q, idx) => (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(idx)}
              className={`h-7 w-7 rounded text-xs font-medium transition-colors ${
                idx === currentIndex
                  ? "bg-blue-600 text-white"
                  : answers[q.id]
                  ? "bg-green-100 text-green-800 border border-green-300"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>

        {currentIndex < totalQuestions - 1 ? (
          <button
            onClick={() => setCurrentIndex((i) => Math.min(totalQuestions - 1, i + 1))}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Siguiente →
          </button>
        ) : (
          <div className="w-24" /> // placeholder para alinear
        )}
      </div>

      {/* Botón de envío */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 flex items-center justify-between gap-4">
        {submitError && <p className="text-sm text-red-600">{submitError}</p>}
        <div className="text-sm text-gray-500 ml-auto">
          {totalQuestions - answeredCount > 0 && (
            <span className="text-orange-600 font-medium">
              {totalQuestions - answeredCount} sin responder
            </span>
          )}
        </div>
        <button
          onClick={() => handleSubmit(false)}
          disabled={submitting}
          className="rounded-md bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          {submitting ? "Enviando..." : "Enviar examen"}
        </button>
      </div>

      {/* Overlay de auto-submit */}
      {submitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="rounded-xl bg-white px-8 py-6 shadow-xl text-center space-y-2">
            <p className="text-lg font-semibold text-gray-900">Enviando examen...</p>
            <p className="text-sm text-gray-500">Por favor espera</p>
          </div>
        </div>
      )}
    </div>
  );
}
