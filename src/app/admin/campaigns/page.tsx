import { requireAdminSession } from "@/lib/auth-helpers";
import { logAudit } from "@/lib/audit";
import { parseRecipientsCsv } from "@/lib/csv";
import { sendInviteEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { generateToken, hashToken } from "@/lib/tokens";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/app/admin/groups/submit-button";
import { LogoutButton } from "@/components/admin/logout-button";
// Importing Link for navigation
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { Textarea } from "@/components/ui/textarea";
import { Button as UIButton } from "@/components/ui/button";
async function getAllowedCampaignIds(adminId: string, role: string) {
  if (role === "OWNER") return null;
  const access = await prisma.adminCampaignAccess.findMany({ where: { adminId }, select: { campaignId: true } });
  return access.map((a) => a.campaignId);
}

export default async function CampaignsPage() {
  const session = await requireAdminSession();
  const orgId = session.user.orgId ?? "default-org";
  const allowedCampaignIds = await getAllowedCampaignIds(session.user.id, session.user.role ?? "");
  const groups = await prisma.whatsAppGroup.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
  });
  const campaigns = await prisma.campaign.findMany({
    where: { orgId, ...(allowedCampaignIds ? { id: { in: allowedCampaignIds } } : {}) },
    include: { group: true, inviteLinks: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Send and monitor invites</p>
          <h1 className="text-2xl font-semibold text-slate-900">Campaigns</h1>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/dashboard">Dashboard</Link>
          </Button>
          <LogoutButton />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create campaign</CardTitle>
          <CardDescription>Attach a campaign to a WhatsApp group.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={async (formData) => {
            "use server";
            const session = await requireAdminSession();
            const orgId = session.user.orgId ?? "default-org";
            const name = String(formData.get("name"));
            const groupId = String(formData.get("groupId"));
            const campaign = await prisma.campaign.create({
              data: {
                name,
                groupId,
                orgId,
              },
            });
            if (session.user.role !== "OWNER") {
              await prisma.adminCampaignAccess.create({ data: { adminId: session.user.id, campaignId: campaign.id } });
            }
            await logAudit({
              orgId: session.user.orgId,
              adminId: session.user.id,
              action: "CAMPAIGN_CREATED",
              entityType: "campaigns",
              meta: { name, groupId },
            });
            revalidatePath("/admin/campaigns");
          }}
          className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Name</label>
              <Input name="name" placeholder="January onboarding" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Group</label>
              <select
                name="groupId"
                required
                className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
                defaultValue=""
              >
                <option value="" disabled>
                  Select group
                </option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <SubmitButton label="Create" />
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {campaigns.map((campaign) => {
          const sent = campaign.inviteLinks.length;
          const used = campaign.inviteLinks.filter((l) => l.status === "USED").length;
          return (
            <Card key={campaign.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{campaign.name}</CardTitle>
                  <CardDescription>{campaign.group?.name || "Group"}</CardDescription>
                </div>
                <Badge variant="secondary">{campaign.status}</Badge>
                <form
                  action={async () => {
                    "use server";
                    const session = await requireAdminSession();
                    const orgId = session.user.orgId ?? "default-org";
                    await prisma.$transaction(async (tx) => {
                      await tx.inviteLink.deleteMany({ where: { campaignId: campaign.id, orgId } });
                      await tx.campaign.delete({ where: { id: campaign.id, orgId } });
                    });
                    await logAudit({
                      orgId,
                      adminId: session.user.id,
                      action: "CAMPAIGN_DELETED",
                      entityType: "campaigns",
                      entityId: campaign.id,
                      meta: { name: campaign.name },
                    });
                    revalidatePath("/admin/campaigns");
                  }}
                >
                  <UIButton type="submit" variant="destructive" size="sm">
                    Delete
                  </UIButton>
                </form>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-700">
                <p>{sent} links • {used} used</p>
                <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                  <span>Need per-link controls?</span>
                  <Link href="/admin/links" className="underline">
                    Manage links
                  </Link>
                </div>
                <div className="flex flex-wrap gap-3">
                  <form action={async (formData) => {
                    "use server";
                    const session = await requireAdminSession();
                    const file = formData.get("file");
                    if (!(file instanceof File)) return;
                    const buffer = Buffer.from(await file.arrayBuffer());
                    const rows = parseRecipientsCsv(buffer);
                    const orgId = session.user.orgId ?? "default-org";
                    await prisma.$transaction(async (tx) => {
                      for (const row of rows) {
                        await tx.recipient.upsert({
                          where: { orgId_email: { orgId, email: row.email } },
                          update: { name: row.name, tags: row.tags ?? [] },
                          create: { email: row.email, name: row.name, tags: row.tags ?? [], orgId },
                        });
                      }
                    });
                    await logAudit({
                      orgId,
                      adminId: session.user.id,
                      action: "RECIPIENTS_IMPORTED",
                      entityType: "campaigns",
                      entityId: campaign.id,
                      meta: { count: rows.length },
                    });
                    revalidatePath("/admin/campaigns");
                  }}
                  className="flex items-center gap-2">
                    <input type="hidden" name="campaignId" value={campaign.id} />
                    <Input type="file" name="file" accept=".csv" className="w-56" />
                    <SubmitButton label="Upload CSV" />
                  </form>

                  <form action={async () => {
                    "use server";
                    const session = await requireAdminSession();
                    const orgId = session.user.orgId ?? "default-org";
                    const recipients = await prisma.recipient.findMany({ where: { orgId } });
                    for (const recipient of recipients) {
                      const token = generateToken();
                      const tokenHash = hashToken(token);
                      await prisma.inviteLink.upsert({
                        where: { campaignId_recipientId: { campaignId: campaign.id, recipientId: recipient.id } },
                        update: {
                          tokenHash,
                          tokenRaw: token,
                          status: "ACTIVE",
                          orgId,
                          disabledAt: null,
                          usedAt: null,
                          usedIp: null,
                          usedUserAgent: null,
                        },
                        create: {
                          tokenHash,
                          tokenRaw: token,
                          campaignId: campaign.id,
                          recipientId: recipient.id,
                          orgId,
                          status: "ACTIVE",
                        },
                      });
                      await sendInviteEmail({
                        to: recipient.email,
                        name: recipient.name,
                        token,
                        campaignName: campaign.name,
                      });
                    }
                    await logAudit({
                      orgId,
                      adminId: session.user.id,
                      action: "INVITES_SENT",
                      entityType: "campaigns",
                      entityId: campaign.id,
                      meta: { count: recipients.length },
                    });
                    revalidatePath("/admin/campaigns");
                  }}>
                    <SubmitButton label="Send invites" />
                  </form>

                  <form
                    action={async (formData) => {
                      "use server";
                      const session = await requireAdminSession();
                      const orgId = session.user.orgId ?? "default-org";
                      const email = String(formData.get("email") || "").trim();
                      if (!email) return;
                      const name = String(formData.get("name") || "").trim() || undefined;
                      const tagsRaw = String(formData.get("tags") || "").trim();
                      const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [];
                      const sendNow = formData.get("sendNow") === "on";
                      const recipient = await prisma.recipient.upsert({
                        where: { orgId_email: { orgId, email } },
                        update: { name, tags },
                        create: { email, name, tags, orgId },
                      });
                      const token = generateToken();
                      const tokenHash = hashToken(token);
                      await prisma.inviteLink.upsert({
                        where: { campaignId_recipientId: { campaignId: campaign.id, recipientId: recipient.id } },
                        update: {
                          tokenHash,
                          tokenRaw: token,
                          status: "ACTIVE",
                          orgId,
                          disabledAt: null,
                          usedAt: null,
                          usedIp: null,
                          usedUserAgent: null,
                        },
                        create: {
                          tokenHash,
                          tokenRaw: token,
                          campaignId: campaign.id,
                          recipientId: recipient.id,
                          orgId,
                          status: "ACTIVE",
                        },
                      });
                      if (sendNow) {
                        await sendInviteEmail({ to: recipient.email, name: recipient.name, token, campaignName: campaign.name });
                      }
                      await logAudit({
                        orgId,
                        adminId: session.user.id,
                        action: "INVITE_CREATED_MANUAL",
                        entityType: "campaigns",
                        entityId: campaign.id,
                        meta: { email, sendNow },
                      });
                      revalidatePath("/admin/campaigns");
                    }}
                    className="flex flex-col gap-2 rounded-md border border-slate-200 p-3"
                  >
                    <div className="flex flex-wrap gap-2">
                      <Input type="email" name="email" placeholder="email@example.com" required className="w-64" />
                      <Input name="name" placeholder="Name (optional)" className="w-48" />
                      <Input name="tags" placeholder="tags,comma,separated" className="w-56" />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="checkbox" name="sendNow" /> Send invite email now
                    </label>
                    <SubmitButton label="Create link (manual)" />
                    <p className="text-xs text-slate-500">Creates a link without CSV; email can be sent now or later via Links page.</p>
                  </form>

                  <form
                    action={async (formData) => {
                      "use server";
                      const session = await requireAdminSession();
                      const orgId = session.user.orgId ?? "default-org";
                      const raw = String(formData.get("bulkEmails") || "");
                      const emails = raw
                        .split(/\r?\n|,|;/)
                        .map((e) => e.trim())
                        .filter(Boolean);
                      if (emails.length === 0) return;
                      const sendNow = formData.get("bulkSendNow") === "on";
                      const created: string[] = [];
                      const toSend: { email: string; token: string; name?: string }[] = [];
                      await prisma.$transaction(async (tx) => {
                        for (const email of emails) {
                          const recipient = await tx.recipient.upsert({
                            where: { orgId_email: { orgId, email } },
                            update: {},
                            create: { email, orgId },
                          });
                          const token = generateToken();
                          const tokenHash = hashToken(token);
                          await tx.inviteLink.upsert({
                            where: { campaignId_recipientId: { campaignId: campaign.id, recipientId: recipient.id } },
                            update: {
                              tokenHash,
                              tokenRaw: token,
                              status: "ACTIVE",
                              orgId,
                              disabledAt: null,
                              usedAt: null,
                              usedIp: null,
                              usedUserAgent: null,
                            },
                            create: {
                              tokenHash,
                              tokenRaw: token,
                              campaignId: campaign.id,
                              recipientId: recipient.id,
                              orgId,
                              status: "ACTIVE",
                            },
                          });
                          created.push(email);
                          if (sendNow) {
                            toSend.push({ email, token });
                          }
                        }
                      });
                      if (toSend.length) {
                        for (const item of toSend) {
                          await sendInviteEmail({ to: item.email, name: undefined, token: item.token, campaignName: campaign.name });
                        }
                      }
                      await logAudit({
                        orgId,
                        adminId: session.user.id,
                        action: "INVITES_CREATED_BULK_MANUAL",
                        entityType: "campaigns",
                        entityId: campaign.id,
                        meta: { count: created.length, sendNow },
                      });
                      revalidatePath("/admin/campaigns");
                    }}
                    className="flex flex-col gap-2 rounded-md border border-slate-200 p-3"
                  >
                    <Textarea name="bulkEmails" rows={3} placeholder="Paste emails separated by newlines, commas, or semicolons" />
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="checkbox" name="bulkSendNow" /> Send invite emails now
                    </label>
                    <SubmitButton label="Create links (bulk, no CSV)" />
                    <p className="text-xs text-slate-500">Creates links without CSV upload; send now or manage later in Links.</p>
                  </form>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {campaigns.length === 0 && <p className="text-sm text-slate-600">No campaigns yet.</p>}
      </div>
    </div>
  );
}
