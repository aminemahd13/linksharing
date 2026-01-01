import { authOptions } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { sendInviteEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/rbac";
import { hashToken, generateToken } from "@/lib/tokens";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import { z } from "zod";

const schema = z.object({
  recipientIds: z.array(z.string()).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = (await getServerSession(authOptions as any)) as Session | null;
  try {
    assertAdmin(session);
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = schema.parse(await req.json().catch(() => ({})));
  const orgId = session?.user.orgId ?? "default-org";
  const { id } = await params;

  const campaign = await prisma.campaign.findFirst({
    where: { id, orgId },
    include: { group: true },
  });
  if (!campaign) {
    return NextResponse.json({ message: "Campaign not found" }, { status: 404 });
  }

  const recipients = await prisma.recipient.findMany({
    where: {
      orgId,
      ...(body.recipientIds ? { id: { in: body.recipientIds } } : {}),
    },
  });

  const results: { recipientId: string; linkId: string }[] = [];

  await prisma.$transaction(async (tx) => {
    for (const recipient of recipients) {
      const rawToken = generateToken();
      const tokenHash = hashToken(rawToken);
      const inviteLink = await tx.inviteLink.upsert({
        where: {
          campaignId_recipientId: {
            campaignId: campaign.id,
            recipientId: recipient.id,
          },
        },
        update: {
          status: "ACTIVE",
          campaignId: campaign.id,
          recipientId: recipient.id,
          orgId,
          disabledAt: null,
          usedAt: null,
        },
        create: {
          tokenHash,
          campaignId: campaign.id,
          recipientId: recipient.id,
          orgId,
          status: "ACTIVE",
        },
      });
      results.push({ recipientId: recipient.id, linkId: inviteLink.id });
      await sendInviteEmail({
        to: recipient.email,
        name: recipient.name,
        token: rawToken,
        campaignName: campaign.name,
      });
    }
  });

  await logAudit({
    orgId,
    adminId: session?.user.id,
    action: "INVITES_SENT",
    entityType: "campaigns",
    entityId: campaign.id,
    meta: { count: recipients.length },
  });

  return NextResponse.json({ count: recipients.length, links: results });
}
