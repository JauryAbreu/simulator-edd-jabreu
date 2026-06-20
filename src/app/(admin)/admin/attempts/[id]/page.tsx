export const runtime = "nodejs";

import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Detalle de intento — Admin" };

export default async function AdminAttemptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: attemptId } = await params;

  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      user: { select: { id: true, fullName: true, username: true } },
      evaluation: { select: { id: true, title: true, totalPoints: true } },
      answers: {
        include: {
          question: { select: { id: true, text: true, explanation: true, difficulty: true, tag: true } },
          selectedOption: { select: { id: true, text: true } },
        },
      },
    },
  });

  if (!attempt) notFound();

  const questionIds = attempt.answers.map((a) => a.questionId);
  const allOptions = await prisma.option.findMany({
    where: { questionId: { in: questionIds } },
    select: { id: true, questionId: true, text: true, isCorrect: true },
  });

  const optsByQ: Record<string, typeof allOptions> = {};
  for (const opt of allOptions) (optsByQ[opt.questionId] ??= []).push(opt);

  const pct = attempt.evaluation.totalPoints > 0
    ? Math.round((attempt.score / attempt.evaluation.totalPoints) * 100)
    : 0;
  const mins = Math.floor(attempt.durationSeconds / 60);
  const secs = attempt.durationSeconds % 60;
  const duration = `${mins}:${String(secs).padStart(2, "0")}`;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link href={`/admin/users/${attempt.user.id}`} className="hover:text-slate-100 transition-colors">
          ← {attempt.user.username}
        </Link>
        <span className="text-slate-700">/</span>
        <span className="text-slate-300">Intento</span>
      </div>

      {/* Header card */}
      <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-100">{attempt.evaluation.title}</h1>
            <p className="mt-1 text-sm text-slate-400">
              Realizado por <span className="font-medium text-slate-200">{attempt.user.fullName}</span>
              {" "}(@{attempt.user.username})
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {new Date(attempt.submittedAt).toLocaleDateString("es-DO", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              {" · "}{duration} de duración
            </p>
          </div>
          <div className="text-right">
            <p className={`text-3xl font-bold tabular-nums ${pct >= 70 ? "text-green-400" : "text-red-400"}`}>
              {attempt.score}/{attempt.evaluation.totalPoints}
            </p>
            <p className="text-sm text-slate-400">{pct}% · {pct >= 70 ? "Aprobado" : "No aprobado"}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { label: "Correctas",     value: attempt.correctCount,    color: "text-green-400" },
            { label: "Incorrectas",   value: attempt.incorrectCount,  color: "text-red-400"   },
            { label: "Sin responder", value: attempt.unansweredCount, color: "text-slate-400" },
          ].map((s) => (
            <div key={s.label} className="rounded-lg bg-slate-900 p-3 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="mt-0.5 text-xs text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Questions */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
          Respuestas — {attempt.answers.length} preguntas
        </h2>

        {attempt.answers.map((ans, i) => {
          const opts = optsByQ[ans.questionId] ?? [];
          const correctOpt = opts.find((o) => o.isCorrect);

          return (
            <div key={ans.id} className={`rounded-xl border p-5 space-y-3 ${ans.isCorrect ? "border-green-800/60 bg-green-950/20" : ans.selectedOption ? "border-red-800/60 bg-red-950/20" : "border-slate-700 bg-slate-800/40"}`}>
              {/* Question header */}
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-slate-100">
                  <span className="mr-2 font-mono text-slate-500">{i + 1}.</span>
                  {ans.question.text}
                </p>
                <div className="flex shrink-0 items-center gap-1.5">
                  {ans.question.tag && (
                    <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-400">{ans.question.tag}</span>
                  )}
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${ans.isCorrect ? "bg-green-500/20 text-green-400" : ans.selectedOption ? "bg-red-500/20 text-red-400" : "bg-slate-600 text-slate-400"}`}>
                    {ans.isCorrect ? "✓" : ans.selectedOption ? "✗" : "–"}
                  </span>
                </div>
              </div>

              {/* Options */}
              <ul className="space-y-1.5">
                {opts.map((opt) => {
                  const isSelected = opt.id === ans.selectedOptionId;
                  const isCorrectOpt = opt.isCorrect;
                  let cls = "rounded-lg border px-3 py-2 text-sm ";
                  if (isCorrectOpt && isSelected)   cls += "border-green-600 bg-green-900/30 text-green-300";
                  else if (isCorrectOpt)             cls += "border-green-700/60 bg-green-950/30 text-green-400";
                  else if (isSelected && !isCorrectOpt) cls += "border-red-700/60 bg-red-950/30 text-red-300";
                  else                               cls += "border-slate-700 text-slate-400";

                  return (
                    <li key={opt.id} className={cls}>
                      <span className="flex items-center gap-2">
                        {isSelected && (
                          <svg className={`h-3 w-3 shrink-0 ${isCorrectOpt ? "text-green-400" : "text-red-400"}`} fill="currentColor" viewBox="0 0 8 8" aria-label={isCorrectOpt ? "Seleccionada, correcta" : "Seleccionada, incorrecta"}>
                            <circle cx="4" cy="4" r="4" />
                          </svg>
                        )}
                        {!isSelected && isCorrectOpt && (
                          <svg className="h-3 w-3 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-label="Respuesta correcta">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                        )}
                        {opt.text}
                      </span>
                    </li>
                  );
                })}
              </ul>

              {/* Explanation */}
              {ans.question.explanation && (
                <div className="flex items-start gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-300">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                  </svg>
                  {ans.question.explanation}
                </div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
