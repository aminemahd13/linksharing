import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";

export async function getLinkByToken(token: string) {
  // Try raw token match first (for robustness if pepper/env changes), fallback to hash.
  const rawMatch = await prisma.inviteLink.findFirst({
    where: { tokenRaw: token },
    include: {
      recipient: true,
      campaign: { include: { group: true } },
    },
  });
  if (rawMatch) return rawMatch;

  const tokenHash = hashToken(token);
  return prisma.inviteLink.findUnique({
    where: { tokenHash },
    include: {
      recipient: true,
      campaign: { include: { group: true } },
    },
  });
}

export async function consumeLink(token: string, context: { ip?: string; userAgent?: string; adminId?: string }) {
  // Try raw token match first to avoid pepper drift breakage.
  const rawLink = await prisma.inviteLink.findFirst({
    where: { tokenRaw: token },
    include: { campaign: { include: { group: true } }, recipient: true },
  });
  const link =
    rawLink ||
    (await prisma.inviteLink.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { campaign: { include: { group: true } }, recipient: true },
    }));

  if (!link) {
    return { ok: false as const, status: "NOT_FOUND" as const };
  }
  if (link.status !== "ACTIVE") {
    return { ok: false as const, status: link.status };
  }

  return prisma.$transaction(async (tx) => {
    const updatedCount = await tx.inviteLink.updateMany({
      where: { id: link.id, status: "ACTIVE" },
      data: {
        status: "USED",
        usedAt: new Date(),
        usedIp: context.ip,
        usedUserAgent: context.userAgent,
      },
    });

    if (updatedCount.count === 0) {
      return { ok: false as const, status: "RACE" as const };
    }

    await logAudit({
      orgId: link.campaign.orgId,
      adminId: context.adminId,
      action: "INVITE_CONSUMED",
      entityType: "invite_links",
      entityId: link.id,
      meta: { recipient: link.recipient.email },
    });

    return {
      ok: true as const,
      redirectUrl: link.campaign.group.whatsappInviteUrl,
    };
  });
}
