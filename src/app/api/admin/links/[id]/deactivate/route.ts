import { authOptions } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/rbac";
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
  const link = await prisma.inviteLink.update({
    where: { id },
    data: {
      status: "DISABLED",
      disabledAt: new Date(),
      disabledByAdminId: session?.user.id,
    },
  });

  await logAudit({
    orgId: session?.user.orgId,
    adminId: session?.user.id,
    action: "LINK_DISABLED",
    entityType: "invite_links",
    entityId: link.id,
  });

  return NextResponse.json({ status: link.status });
}
