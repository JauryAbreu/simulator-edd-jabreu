export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isResponse } from "@/lib/auth/rbac";
import { createAuditLog } from "@/lib/audit";

interface Params { params: Promise<{ id: string }> }

/**
 * Formato CSV esperado (encabezado requerido):
 * text,explanation,difficulty,opt1,opt1_correct,opt2,opt2_correct,opt3,opt3_correct,opt4,opt4_correct
 *
 * difficulty: BAJA | MEDIA | ALTA
 * opt_correct: true | false
 * Se requieren al menos 2 opciones (opt1 y opt2).
 * Exactamente una debe tener opt_correct = true.
 */

const rowSchema = z.object({
  text: z.string().min(1, "text es requerido"),
  explanation: z.string().optional(),
  difficulty: z.enum(["BAJA", "MEDIA", "ALTA"]).default("MEDIA"),
  opt1: z.string().min(1, "opt1 es requerido"),
  opt1_correct: z.string().transform((v) => v.toLowerCase() === "true"),
  opt2: z.string().min(1, "opt2 es requerido"),
  opt2_correct: z.string().transform((v) => v.toLowerCase() === "true"),
  opt3: z.string().optional(),
  opt3_correct: z.string().optional().transform((v) => v?.toLowerCase() === "true"),
  opt4: z.string().optional(),
  opt4_correct: z.string().optional().transform((v) => v?.toLowerCase() === "true"),
});

export async function POST(req: NextRequest, { params }: Params) {
  const user = await requireAdmin();
  if (isResponse(user)) return user;
  const { id: evaluationId } = await params;

  const evaluation = await prisma.evaluation.findUnique({ where: { id: evaluationId }, select: { id: true } });
  if (!evaluation) return NextResponse.json({ error: "Evaluación no encontrada" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Archivo CSV requerido" }, { status: 400 });

  const text = await file.text();
  const parseResult = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  const rows = parseResult.data;
  const parseErrors = parseResult.errors;

  if (parseErrors.length > 0) {
    return NextResponse.json({ error: "Error al parsear CSV", details: parseErrors }, { status: 400 });
  }

  const results: { row: number; status: "ok" | "error"; error?: string }[] = [];
  let created = 0;

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2; // +2: 1 para encabezado, 1 base-1
    const parsed = rowSchema.safeParse(rows[i]);

    if (!parsed.success) {
      results.push({ row: rowNum, status: "error", error: JSON.stringify(parsed.error.flatten().fieldErrors) });
      continue;
    }

    const d = parsed.data;
    const options = [
      { text: d.opt1, isCorrect: d.opt1_correct },
      { text: d.opt2, isCorrect: d.opt2_correct },
      ...(d.opt3 ? [{ text: d.opt3, isCorrect: d.opt3_correct ?? false }] : []),
      ...(d.opt4 ? [{ text: d.opt4, isCorrect: d.opt4_correct ?? false }] : []),
    ];

    const correctCount = options.filter((o) => o.isCorrect).length;
    if (correctCount !== 1) {
      results.push({ row: rowNum, status: "error", error: "Debe haber exactamente una opción correcta" });
      continue;
    }

    try {
      await prisma.question.create({
        data: {
          evaluationId,
          text: d.text,
          explanation: d.explanation,
          difficulty: d.difficulty,
          options: { createMany: { data: options } },
        },
      });
      results.push({ row: rowNum, status: "ok" });
      created++;
    } catch {
      results.push({ row: rowNum, status: "error", error: "Error al crear pregunta" });
    }
  }

  await createAuditLog(user.sub, "IMPORT", "Question", evaluationId, { total: rows.length, created });

  return NextResponse.json({
    total: rows.length,
    created,
    errors: results.filter((r) => r.status === "error"),
    results,
  });
}
