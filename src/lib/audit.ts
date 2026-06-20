import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export async function createAuditLog(
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, unknown>
) {
  await prisma.auditLog.create({
    data: { actorId, action, entityType, entityId, metadata: (metadata ?? {}) as Prisma.InputJsonValue },
  });
}
