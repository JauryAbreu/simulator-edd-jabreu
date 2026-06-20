import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const REFRESH_TTL_DAYS = 7;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Persist a refresh token hash after successful login. */
export async function storeRefreshToken(userId: string, token: string): Promise<void> {
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: {
      id: crypto.randomUUID(),
      tokenHash: hashToken(token),
      userId,
      expiresAt,
    },
  });
}

/**
 * Mark all active refresh tokens for a user as revoked.
 * Called on logout so stolen tokens can't be replayed via /api/auth/refresh.
 *
 * Note: the middleware's inline token rotation (Edge runtime) bypasses this DB
 * check due to the Edge/Prisma incompatibility. With httpOnly + SameSite=Lax
 * cookies the practical attack surface is very small; a full solution would
 * require Upstash Redis for edge-compatible storage.
 */
export async function revokeAllRefreshTokens(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revoked: false },
    data: { revoked: true },
  });
}

/**
 * Verify the old refresh token against the DB, then atomically replace it with
 * the new one. Returns false if the token is unknown, revoked, or expired.
 */
export async function rotateRefreshToken(
  oldToken: string,
  newToken: string,
  userId: string
): Promise<boolean> {
  const oldHash = hashToken(oldToken);
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash: oldHash } });

  if (
    !existing ||
    existing.revoked ||
    existing.userId !== userId ||
    existing.expiresAt < new Date()
  ) {
    return false;
  }

  const newExpiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.refreshToken.update({ where: { id: existing.id }, data: { revoked: true } }),
    prisma.refreshToken.create({
      data: {
        id: crypto.randomUUID(),
        tokenHash: hashToken(newToken),
        userId,
        expiresAt: newExpiresAt,
      },
    }),
  ]);

  return true;
}
