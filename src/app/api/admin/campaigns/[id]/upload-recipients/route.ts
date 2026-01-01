import { authOptions } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { parseRecipientsCsv } from "@/lib/csv";
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
  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ message: "CSV file missing" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const rows = parseRecipientsCsv(buffer);
  const orgId = session?.user.orgId ?? "default-org";

  const recipients = await prisma.$transaction(async (tx) => {
    const created = [] as string[];
    for (const row of rows) {
      const recipient = await tx.recipient.upsert({
        where: { orgId_email: { orgId, email: row.email } },
        update: { name: row.name, tags: row.tags ?? [] },
        create: { email: row.email, name: row.name, tags: row.tags ?? [], orgId },
      });
      created.push(recipient.id);
    }
    await logAudit({
      orgId,
      adminId: session?.user.id,
      action: "RECIPIENTS_IMPORTED",
      entityType: "campaigns",
      entityId: id,
      meta: { count: rows.length },
    });
    return created;
  });

  return NextResponse.json({ count: recipients.length });
}
