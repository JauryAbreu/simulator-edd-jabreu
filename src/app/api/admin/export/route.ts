export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isResponse } from "@/lib/auth/rbac";

function toCsv(rows: Record<string, string | number | null | undefined>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: string | number | null | undefined) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ];
  return lines.join("\n");
}

function csvResponse(csv: string, filename: string): NextResponse {
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

/**
 * GET /api/admin/export?type=evaluation&id=xxx  → CSV with all attempts for that evaluation
 * GET /api/admin/export?type=user&id=xxx        → CSV with all attempts for that user
 * GET /api/admin/export?type=all                → CSV with all attempts across the platform
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (isResponse(auth)) return auth;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const id = searchParams.get("id");

  if (type === "evaluation") {
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    const evaluation = await prisma.evaluation.findUnique({
      where: { id },
      select: { title: true, totalPoints: true },
    });
    if (!evaluation) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

    const attempts = await prisma.attempt.findMany({
      where: { evaluationId: id },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { username: true, fullName: true } } },
    });

    const rows = attempts.map((a) => ({
      usuario: a.user.username,
      nombre_completo: a.user.fullName,
      fecha: new Date(a.createdAt).toISOString().slice(0, 19).replace("T", " "),
      puntaje: a.score,
      puntaje_maximo: evaluation.totalPoints,
      porcentaje: Math.round((a.score / evaluation.totalPoints) * 100),
      estado: a.status,
      correctas: a.correctCount,
      incorrectas: a.incorrectCount,
      sin_responder: a.unansweredCount,
      duracion_segundos: a.durationSeconds,
    }));

    const filename = `${evaluation.title.replace(/[^a-z0-9]/gi, "_")}_resultados.csv`;
    return csvResponse(toCsv(rows), filename);
  }

  if (type === "user") {
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { id },
      select: { username: true, fullName: true },
    });
    if (!user) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const attempts = await prisma.attempt.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      include: { evaluation: { select: { title: true, totalPoints: true } } },
    });

    const rows = attempts.map((a) => ({
      evaluacion: a.evaluation.title,
      fecha: new Date(a.createdAt).toISOString().slice(0, 19).replace("T", " "),
      puntaje: a.score,
      puntaje_maximo: a.evaluation.totalPoints,
      porcentaje: Math.round((a.score / a.evaluation.totalPoints) * 100),
      estado: a.status,
      correctas: a.correctCount,
      incorrectas: a.incorrectCount,
      sin_responder: a.unansweredCount,
      duracion_segundos: a.durationSeconds,
    }));

    const filename = `${user.username}_historial.csv`;
    return csvResponse(toCsv(rows), filename);
  }

  if (type === "all") {
    const attempts = await prisma.attempt.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { username: true, fullName: true } },
        evaluation: { select: { title: true, totalPoints: true } },
      },
    });

    const rows = attempts.map((a) => ({
      usuario: a.user.username,
      nombre_completo: a.user.fullName,
      evaluacion: a.evaluation.title,
      fecha: new Date(a.createdAt).toISOString().slice(0, 19).replace("T", " "),
      puntaje: a.score,
      puntaje_maximo: a.evaluation.totalPoints,
      porcentaje: Math.round((a.score / a.evaluation.totalPoints) * 100),
      estado: a.status,
      correctas: a.correctCount,
      incorrectas: a.incorrectCount,
      sin_responder: a.unansweredCount,
      duracion_segundos: a.durationSeconds,
    }));

    return csvResponse(toCsv(rows), "todos_los_resultados.csv");
  }

  return NextResponse.json({ error: "type inválido. Usa: evaluation, user, all" }, { status: 400 });
}
