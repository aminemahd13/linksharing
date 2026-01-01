import { authOptions } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { sendInviteEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/rbac";
import { generateToken, hashToken } from "@/lib/tokens";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const updated = await prisma.inviteLink.update({
    where: { id: link.id },
    data: {
      tokenHash,
      tokenRaw: rawToken,
      status: "ACTIVE",
      orgId: session?.user.orgId,
      disabledAt: null,
      disabledByAdminId: null,
      usedAt: null,
      usedIp: null,
      usedUserAgent: null,
    },
  });

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
    entityId: updated.id,
  });

  return NextResponse.json({ id: updated.id, status: updated.status, token: rawToken, url: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"}/l/${rawToken}` });
}
