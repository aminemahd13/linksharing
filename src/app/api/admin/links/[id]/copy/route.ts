import { authOptions } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/rbac";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";

function appBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = (await getServerSession(authOptions as any)) as Session | null;
  try {
    assertAdmin(session);
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const link = await prisma.inviteLink.findUnique({ where: { id }, include: { recipient: true, campaign: true } });
  if (!link) return NextResponse.json({ message: "Not found" }, { status: 404 });
  if (!link.tokenRaw) return NextResponse.json({ message: "Token not available; regenerate once to enable copy." }, { status: 409 });

  const url = `${appBaseUrl()}/l/${link.tokenRaw}`;

  await logAudit({
    orgId: session?.user.orgId,
    adminId: session?.user.id,
    action: "LINK_COPIED",
    entityType: "invite_links",
    entityId: link.id,
  });

  return NextResponse.json({ url });
}
