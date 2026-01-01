import { authOptions } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/rbac";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  groupId: z.string(),
});

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as any)) as Session | null;
  try {
    assertAdmin(session);
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = schema.parse(await req.json());
  const orgId = session?.user.orgId ?? "default-org";
  const campaign = await prisma.campaign.create({
    data: {
      name: body.name,
      groupId: body.groupId,
      status: "DRAFT",
      orgId,
    },
  });

  await logAudit({
    orgId: session?.user.orgId,
    adminId: session?.user.id,
    action: "CAMPAIGN_CREATED",
    entityType: "campaigns",
    entityId: campaign.id,
    meta: { name: campaign.name },
  });

  return NextResponse.json(campaign, { status: 201 });
}
