"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import type { StartPayload } from "@/lib/exam/types";

type Answers = Record<string, string | null>;

function formatTime(seconds: number): string {
  const m = Math.floor(Math.max(0, seconds) / 60).toString().padStart(2, "0");
  const s = Math.floor(Math.max(0, seconds) % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

export default function ExamPage() {
  const router = useRouter();
  const { id: evaluationId } = useParams<{ id: string }>();

  const [examData, setExamData]     = useState<StartPayload | null>(null);
  const [answers, setAnswers]       = useState<Answers>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft]     = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const preventUnloadRef = useRef(true);
  const submittedRef = useRef(false);

  // ── Carga el payload desde sessionStorage ───────────────────────────────
  useEffect(() => {
    const raw = sessionStorage.getItem(`exam_${evaluationId}`);
    if (!raw) { router.replace(`/dashboard/evaluations/${evaluationId}`); return; }
    const data: StartPayload = JSON.parse(raw);
    setExamData(data);
    const elapsed = (Date.now() - new Date(data.startedAt).getTime()) / 1000;
    setTimeLeft(Math.max(0, data.timeLimitMinutes * 60 - elapsed));
    const saved = sessionStorage.getItem(`exam_answers_${evaluationId}`);
    if (saved) setAnswers(JSON.parse(saved));
  }, [evaluationId, router]);

  // ── Persistir respuestas ─────────────────────────────────────────────────
  useEffect(() => {
    if (Object.keys(answers).length > 0)
      sessionStorage.setItem(`exam_answers_${evaluationId}`, JSON.stringify(answers));
  }, [answers, evaluationId]);

  // ── beforeunload ─────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!preventUnloadRef.current) return;
      e.preventDefault(); e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // ── Proactive token refresh — access token TTL is 15 min, exams can last longer
  useEffect(() => {
    if (!examData) return;
    const interval = setInterval(() => {
      fetch("/api/auth/refresh", { method: "POST" }).catch(() => {});
    }, 10 * 60 * 1000); // refresh every 10 min while exam is open
    return () => clearInterval(interval);
  }, [examData]);

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async (auto = false) => {
    if (submittedRef.current || !examData) return;
    submittedRef.current = true;
    preventUnloadRef.current = false;
    setSubmitting(true);
    setShowConfirm(false);

    const body = JSON.stringify({
      startedAt: examData.startedAt,
      answers: examData.questions.map((q) => ({
        questionId: q.id,
        selectedOptionId: answers[q.id] ?? null,
      })),
    });

    let res = await fetch(`/api/evaluations/${evaluationId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    // If the access token expired between the proactive refreshes, try refreshing once and retry
    if (res.status === 401) {
      const refreshed = await fetch("/api/auth/refresh", { method: "POST" });
      if (refreshed.ok) {
        res = await fetch(`/api/evaluations/${evaluationId}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
      }
    }

    const data = await res.json();
    if (!res.ok) {
      setSubmitError(data.error ?? "Error al enviar el examen");
      submittedRef.current = false;
      preventUnloadRef.current = true;
      setSubmitting(false);
      return;
    }

    sessionStorage.removeItem(`exam_${evaluationId}`);
    sessionStorage.removeItem(`exam_answers_${evaluationId}`);
    router.push(`/dashboard/evaluations/${evaluationId}/results/${data.attemptId}${auto ? "?reason=timeout" : ""}`);
  }, [examData, answers, evaluationId, router]);

  // ── Countdown ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!examData || submittedRef.current) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        if (next <= 0) { clearInterval(interval); handleSubmit(true); return 0; }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [examData, handleSubmit]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (!examData) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-5">
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-full border-4 border-blue-200 dark:border-slate-700" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-blue-600" />
        </div>
        <div className="text-center">
          <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Preparando tu simulacro…</p>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>Cargando preguntas</p>
        </div>
      </div>
    );
  }

  const question = examData.questions[currentIndex];
  const total    = examData.questions.length;
  const answered = Object.values(answers).filter(Boolean).length;
  const unanswered = total - answered;
  const isLowTime     = timeLeft <= 300;  // 5 min
  const isVeryLowTime = timeLeft <= 60;   // 1 min
  const progressPct = Math.round((answered / total) * 100);

  return (
    /* Break out of the layout's max-w constraint for full-bleed exam UI */
    <div className="-mx-4 -mt-6 sm:-mx-6 min-h-screen bg-gray-50 dark:bg-slate-950">

      {/* ── Sticky header bar ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur dark:bg-slate-900/95"
        style={{ borderColor: "var(--border-color)" }}>
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">

          {/* Eval title + progress */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              {(examData as { title?: string }).title ?? "Simulacro"}
            </p>
            <div className="mt-1 flex items-center gap-3">
              <div className="h-1.5 w-32 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-xs" style={{ color: "var(--text-subtle)" }}>
                {answered}/{total} respondidas
              </span>
            </div>
          </div>

          {/* Timer pill */}
          <div className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 font-mono text-sm font-bold tabular-nums transition-all ${
            isVeryLowTime
              ? "animate-pulse bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
              : isLowTime
              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
          }`}>
            <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            {formatTime(timeLeft)}
          </div>
        </div>
      </header>

      {/* ── Main content ──────────────────────────────────────────────── */}
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row">

          {/* ── Question panel (left / main) ─────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-3">

            {/* Question card */}
            <div className="rounded-2xl border bg-white dark:bg-slate-900 shadow-sm overflow-hidden"
              style={{ borderColor: "var(--border-color)" }}>

              {/* Card header */}
              <div className="flex items-center justify-between border-b px-6 py-3"
                style={{ borderColor: "var(--border-color)", background: "var(--surface-subtle)" }}>
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-subtle)" }}>
                  Pregunta {currentIndex + 1} <span style={{ color: "var(--text-subtle)" }}>/ {total}</span>
                </span>
                {(question as { tag?: string }).tag && (
                  <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    {(question as { tag?: string }).tag}
                  </span>
                )}
              </div>

              {/* Question text */}
              <div className="px-6 py-6">
                <p className="text-base font-medium leading-relaxed" style={{ color: "var(--text-primary)" }}>
                  {question.text}
                </p>
              </div>

              {/* Options */}
              <div className="space-y-2.5 px-6 pb-6">
                {question.options.map((opt, idx) => {
                  const selected = answers[question.id] === opt.id;
                  const letter   = OPTION_LETTERS[idx] ?? String(idx + 1);
                  return (
                    <label
                      key={opt.id}
                      className={`flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition-all select-none ${
                        selected
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600"
                      }`}
                    >
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all ${
                        selected
                          ? "bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-none"
                          : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400"
                      }`}>
                        {letter}
                      </div>
                      <span className={`text-sm leading-relaxed transition-colors ${
                        selected ? "font-medium text-blue-900 dark:text-blue-100" : "text-gray-700 dark:text-slate-300"
                      }`}>
                        {opt.text}
                      </span>
                      <input
                        type="radio"
                        name={`q_${question.id}`}
                        value={opt.id}
                        checked={selected}
                        onChange={() => setAnswers((p) => ({ ...p, [question.id]: opt.id }))}
                        className="sr-only"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Prev / Next navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                disabled={currentIndex === 0}
                className="flex items-center gap-2 rounded-xl border bg-white px-5 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50 disabled:opacity-40 dark:bg-slate-900 dark:hover:bg-slate-800"
                style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
                Anterior
              </button>
              <span className="text-xs" style={{ color: "var(--text-subtle)" }}>
                {currentIndex + 1} / {total}
              </span>
              <button
                onClick={() => setCurrentIndex((i) => Math.min(total - 1, i + 1))}
                disabled={currentIndex === total - 1}
                className="flex items-center gap-2 rounded-xl border bg-white px-5 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50 disabled:opacity-40 dark:bg-slate-900 dark:hover:bg-slate-800"
                style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}
              >
                Siguiente
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>
          </div>

          {/* ── Right sidebar: navigator + submit ────────────────────── */}
          <div className="w-full lg:w-72 shrink-0 space-y-3">

            {/* Question navigator */}
            <div className="rounded-2xl border bg-white dark:bg-slate-900 p-5"
              style={{ borderColor: "var(--border-color)" }}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-subtle)" }}>
                Navegador
              </p>
              <div className="grid grid-cols-5 gap-1.5">
                {examData.questions.map((q, idx) => {
                  const isCurrent  = idx === currentIndex;
                  const isAnswered = !!answers[q.id];
                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIndex(idx)}
                      title={`Pregunta ${idx + 1}`}
                      className={`h-8 w-full rounded-lg text-xs font-semibold transition-all ${
                        isCurrent
                          ? "bg-blue-600 text-white ring-2 ring-blue-300 ring-offset-1 dark:ring-blue-800"
                          : isAnswered
                          ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-4 flex flex-wrap gap-3 text-xs" style={{ color: "var(--text-subtle)" }}>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded bg-blue-600" /> Actual
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded bg-green-200 dark:bg-green-900" /> Respondida
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded bg-gray-200 dark:bg-slate-700" /> Pendiente
                </span>
              </div>
            </div>

            {/* Progress stats */}
            <div className="rounded-2xl border bg-white dark:bg-slate-900 p-5 space-y-3"
              style={{ borderColor: "var(--border-color)" }}>
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: "var(--text-secondary)" }}>Respondidas</span>
                <span className="font-bold text-green-600 dark:text-green-400">{answered}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: "var(--text-secondary)" }}>Sin responder</span>
                <span className={`font-bold ${unanswered > 0 ? "text-amber-600 dark:text-amber-400" : "text-gray-400"}`}>
                  {unanswered}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-green-500 transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                  role="progressbar"
                  aria-valuenow={progressPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
              <p className="text-right text-xs font-medium text-green-600 dark:text-green-400">
                {progressPct}% completo
              </p>
            </div>

            {/* Submit button */}
            {submitError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-900/30 dark:text-red-400">
                {submitError}
              </p>
            )}
            <button
              onClick={() => unanswered > 0 ? setShowConfirm(true) : handleSubmit(false)}
              disabled={submitting}
              className="w-full rounded-xl bg-green-600 py-3 text-sm font-bold text-white shadow-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Enviando…" : "Enviar examen"}
            </button>
            {unanswered > 0 && (
              <p className="text-center text-xs text-amber-600 dark:text-amber-400">
                {unanswered} pregunta{unanswered !== 1 ? "s" : ""} sin responder
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Confirm submit dialog ─────────────────────────────────────── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4"
            style={{ borderColor: "var(--border-color)" }}>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
              <svg className="h-6 w-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                ¿Enviar el examen?
              </h3>
              <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                Tienes <strong>{unanswered}</strong> pregunta{unanswered !== 1 ? "s" : ""} sin responder.
                Las preguntas sin respuesta cuentan como incorrectas.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-xl border py-2.5 text-sm font-medium transition-colors hover:bg-gray-50 dark:hover:bg-slate-800"
                style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}
              >
                Revisar
              </button>
              <button
                onClick={() => handleSubmit(false)}
                className="flex-1 rounded-xl bg-green-600 py-2.5 text-sm font-bold text-white hover:bg-green-700 transition-colors"
              >
                Enviar igual
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Submitting overlay ────────────────────────────────────────── */}
      {submitting && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 rounded-full border-4 border-slate-700" />
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-green-500" />
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-slate-100">Enviando tu examen…</p>
            <p className="mt-1 text-sm text-slate-400">Por favor espera</p>
          </div>
        </div>
      )}
    </div>
  );
}
