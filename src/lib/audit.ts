import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function logAudit(params: {
  orgId?: string | null;
  adminId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  meta?: Record<string, unknown>;
}) {
  const { orgId, adminId, action, entityType, entityId, meta } = params;
  await prisma.auditLog.create({
    data: {
      orgId: orgId ?? undefined,
      adminId,
      action,
      entityType,
      entityId,
      meta: meta as Prisma.InputJsonValue,
    },
  });
}
