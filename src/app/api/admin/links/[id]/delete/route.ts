import { authOptions } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/rbac";
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

  const link = await prisma.inviteLink.findUnique({ where: { id }, include: { recipient: true, campaign: true } });
  if (!link) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  if (session?.user.orgId && link.campaign.orgId && session.user.orgId !== link.campaign.orgId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  if (session?.user.role !== "OWNER") {
    const allowed = await prisma.adminCampaignAccess.findFirst({ where: { adminId: session?.user.id, campaignId: link.campaignId } });
    if (!allowed) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
  }

  await prisma.inviteLink.delete({ where: { id } });

  await logAudit({
    orgId: session?.user.orgId,
    adminId: session?.user.id,
    action: "LINK_DELETED",
    entityType: "invite_links",
    entityId: id,
    meta: { recipient: link.recipient.email, campaign: link.campaign.name, status: link.status },
  });

  return NextResponse.json({ ok: true });
}
