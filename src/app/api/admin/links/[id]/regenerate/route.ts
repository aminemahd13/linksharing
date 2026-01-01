import { authOptions } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { sendInviteEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/rbac";
import { generateToken, hashToken } from "@/lib/tokens";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = (await getServerSession(authOptions as any)) as Session | null;
  try {
    assertAdmin(session);
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const link = await prisma.inviteLink.findUnique({
    where: { id },
    include: { recipient: true, campaign: true },
  });
  if (!link) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);

  const [, newLink] = await prisma.$transaction([
    prisma.inviteLink.update({
      where: { id: link.id },
      data: {
        status: "DISABLED",
        disabledAt: new Date(),
        disabledByAdminId: session?.user.id,
      },
    }),
    prisma.inviteLink.create({
      data: {
        tokenHash,
        campaignId: link.campaignId,
        recipientId: link.recipientId,
        orgId: session?.user.orgId,
        status: "ACTIVE",
      },
    }),
  ]);

  await sendInviteEmail({
    to: link.recipient.email,
    name: link.recipient.name,
    token: rawToken,
    campaignName: link.campaign.name,
  });

  await logAudit({
    orgId: session?.user.orgId,
    adminId: session?.user.id,
    action: "LINK_REGENERATED",
    entityType: "invite_links",
    entityId: newLink.id,
  });

  return NextResponse.json({ id: newLink.id, status: newLink.status });
}
