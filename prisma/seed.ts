/**
 * SEED DE DESARROLLO
 * ==================
 * Este archivo contiene datos de EJEMPLO para desarrollo y demo.
 * Las preguntas y evaluaciones aquí incluidas NO son contenido oficial
 * ni validado. Son únicamente para propósitos de prueba.
 *
 * Para producción, reemplaza estas preguntas con contenido revisado y validado.
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Iniciando seed...");

  // ─── Admin ────────────────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash("Admin@12345!", 12);
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash: adminPassword,
      fullName: "Administrador del Sistema",
      role: "ADMIN",
    },
  });
  console.log(`✅ Admin creado: ${admin.username}`);

  // ─── Usuario demo ─────────────────────────────────────────────────────────
  const demoPassword = await bcrypt.hash("Demo@12345!", 12);
  const demoUser = await prisma.user.upsert({
    where: { username: "demo" },
    update: {},
    create: {
      username: "demo",
      passwordHash: demoPassword,
      fullName: "Usuario Demo",
      role: "USER",
    },
  });
  console.log(`✅ Usuario demo creado: ${demoUser.username}`);

  // ─── Evaluación 1: Matemáticas básicas (EJEMPLO) ──────────────────────────
  const eval1 = await prisma.evaluation.upsert({
    where: { id: "clseed0001000000eval0001" },
    update: {},
    create: {
      id: "clseed0001000000eval0001",
      title: "Matemáticas Básicas — Simulacro I",
      description: "[CONTENIDO DE EJEMPLO] Evaluación de muestra sobre operaciones matemáticas fundamentales.",
      numberOfQuestions: 3,
      totalPoints: 30,
      timeLimitMinutes: 15,
      isActive: true,
    },
  });

  // Preguntas de la evaluación 1
  const q1 = await prisma.question.upsert({
    where: { id: "clseed0001000000ques0001" },
    update: {},
    create: {
      id: "clseed0001000000ques0001",
      evaluationId: eval1.id,
      text: "[EJEMPLO] ¿Cuánto es 15 + 27?",
      explanation: "15 + 27 = 42. Suma directa de unidades y decenas.",
      difficulty: "BAJA",
      isActive: true,
    },
  });

  await prisma.option.createMany({
    skipDuplicates: true,
    data: [
      { id: "clseedopt001", questionId: q1.id, text: "40", isCorrect: false },
      { id: "clseedopt002", questionId: q1.id, text: "42", isCorrect: true },
      { id: "clseedopt003", questionId: q1.id, text: "44", isCorrect: false },
      { id: "clseedopt004", questionId: q1.id, text: "38", isCorrect: false },
    ],
  });

  const q2 = await prisma.question.upsert({
    where: { id: "clseed0001000000ques0002" },
    update: {},
    create: {
      id: "clseed0001000000ques0002",
      evaluationId: eval1.id,
      text: "[EJEMPLO] ¿Cuál es el resultado de 8 × 9?",
      explanation: "8 × 9 = 72. Las tablas de multiplicar son fundamentales.",
      difficulty: "BAJA",
      isActive: true,
    },
  });

  await prisma.option.createMany({
    skipDuplicates: true,
    data: [
      { id: "clseedopt005", questionId: q2.id, text: "63", isCorrect: false },
      { id: "clseedopt006", questionId: q2.id, text: "72", isCorrect: true },
      { id: "clseedopt007", questionId: q2.id, text: "81", isCorrect: false },
      { id: "clseedopt008", questionId: q2.id, text: "56", isCorrect: false },
    ],
  });

  const q3 = await prisma.question.upsert({
    where: { id: "clseed0001000000ques0003" },
    update: {},
    create: {
      id: "clseed0001000000ques0003",
      evaluationId: eval1.id,
      text: "[EJEMPLO] Si un rectángulo tiene base 6 cm y altura 4 cm, ¿cuál es su área?",
      explanation: "Área = base × altura = 6 × 4 = 24 cm².",
      difficulty: "MEDIA",
      isActive: true,
    },
  });

  await prisma.option.createMany({
    skipDuplicates: true,
    data: [
      { id: "clseedopt009", questionId: q3.id, text: "20 cm²", isCorrect: false },
      { id: "clseedopt010", questionId: q3.id, text: "24 cm²", isCorrect: true },
      { id: "clseedopt011", questionId: q3.id, text: "10 cm²", isCorrect: false },
      { id: "clseedopt012", questionId: q3.id, text: "18 cm²", isCorrect: false },
    ],
  });

  console.log(`✅ Evaluación 1 creada: ${eval1.title}`);

  // ─── Evaluación 2: Comprensión Lectora (EJEMPLO) ──────────────────────────
  const eval2 = await prisma.evaluation.upsert({
    where: { id: "clseed0002000000eval0002" },
    update: {},
    create: {
      id: "clseed0002000000eval0002",
      title: "Comprensión Lectora — Simulacro I",
      description: "[CONTENIDO DE EJEMPLO] Evaluación de muestra sobre habilidades de lectura y análisis de texto.",
      numberOfQuestions: 2,
      totalPoints: 20,
      timeLimitMinutes: 20,
      isActive: true,
    },
  });

  const q4 = await prisma.question.upsert({
    where: { id: "clseed0002000000ques0004" },
    update: {},
    create: {
      id: "clseed0002000000ques0004",
      evaluationId: eval2.id,
      text: '[EJEMPLO] En el texto "El sol salió radiante y las flores se abrieron con alegría", ¿qué figura literaria se utiliza?',
      explanation: "Se usa personificación al atribuir la emoción 'alegría' a las flores.",
      difficulty: "MEDIA",
      isActive: true,
    },
  });

  await prisma.option.createMany({
    skipDuplicates: true,
    data: [
      { id: "clseedopt013", questionId: q4.id, text: "Metáfora", isCorrect: false },
      { id: "clseedopt014", questionId: q4.id, text: "Personificación", isCorrect: true },
      { id: "clseedopt015", questionId: q4.id, text: "Hipérbole", isCorrect: false },
      { id: "clseedopt016", questionId: q4.id, text: "Símil", isCorrect: false },
    ],
  });

  const q5 = await prisma.question.upsert({
    where: { id: "clseed0002000000ques0005" },
    update: {},
    create: {
      id: "clseed0002000000ques0005",
      evaluationId: eval2.id,
      text: "[EJEMPLO] ¿Cuál es sinónimo de 'efímero'?",
      explanation: "'Efímero' significa que dura muy poco tiempo; su sinónimo es 'fugaz'.",
      difficulty: "ALTA",
      isActive: true,
    },
  });

  await prisma.option.createMany({
    skipDuplicates: true,
    data: [
      { id: "clseedopt017", questionId: q5.id, text: "Eterno", isCorrect: false },
      { id: "clseedopt018", questionId: q5.id, text: "Fugaz", isCorrect: true },
      { id: "clseedopt019", questionId: q5.id, text: "Perenne", isCorrect: false },
      { id: "clseedopt020", questionId: q5.id, text: "Duradero", isCorrect: false },
    ],
  });

  console.log(`✅ Evaluación 2 creada: ${eval2.title}`);
  console.log("🎉 Seed completado exitosamente.");
  console.log("\n📋 Credenciales de acceso:");
  console.log("   Admin → usuario: admin | contraseña: Admin@12345!");
  console.log("   Demo  → usuario: demo  | contraseña: Demo@12345!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
