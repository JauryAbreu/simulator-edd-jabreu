import { prisma } from "./prisma";

interface RateLimitResult {
  blocked: boolean;
  count: number;
  resetAt: Date;
}

/**
 * DB-backed rate limiter using an atomic upsert.
 * Works across serverless instances (Vercel) since state is in Neon.
 *
 * key          — unique discriminator, e.g. "login:ip:1.2.3.4"
 * maxRequests  — allowed calls within the window before blocking
 * windowSeconds — sliding window length
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const resetAt = new Date(Date.now() + windowSeconds * 1000);

  type Row = { count: number; reset_at: Date };

  const rows = await prisma.$queryRaw<Row[]>`
    INSERT INTO rate_limit_entries (key, count, reset_at)
    VALUES (${key}, 1, ${resetAt})
    ON CONFLICT (key) DO UPDATE SET
      count = CASE
        WHEN rate_limit_entries.reset_at < NOW() THEN 1
        ELSE rate_limit_entries.count + 1
      END,
      reset_at = CASE
        WHEN rate_limit_entries.reset_at < NOW() THEN ${resetAt}::timestamptz
        ELSE rate_limit_entries.reset_at
      END
    RETURNING count, reset_at
  `;

  const { count, reset_at: finalResetAt } = rows[0];
  return { blocked: count > maxRequests, count, resetAt: finalResetAt };
}

/** Fire-and-forget cleanup of expired entries (call periodically or on login). */
export function cleanupRateLimitEntries(): void {
  prisma.$executeRaw`DELETE FROM rate_limit_entries WHERE reset_at < NOW()`.catch(() => {});
}
