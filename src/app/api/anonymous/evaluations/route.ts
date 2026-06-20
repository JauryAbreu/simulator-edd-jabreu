export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, cleanupRateLimitEntries } from "@/lib/rate-limit";

const IP_MAX = 30;
const IP_WINDOW = 5 * 60;

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function GET(req: NextRequest) {
  cleanupRateLimitEntries();
  const ip = getClientIp(req);
  const limit = await checkRateLimit(`anon:list:ip:${ip}`, IP_MAX, IP_WINDOW);
  if (limit.blocked) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta de nuevo más tarde." },
      { status: 429 },
    );
  }

  const evaluations = await prisma.evaluation.findMany({
    where: { isActive: true },
    select: {
      id: true,
      title: true,
      description: true,
      numberOfQuestions: true,
      totalPoints: true,
      timeLimitMinutes: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(evaluations);
}
