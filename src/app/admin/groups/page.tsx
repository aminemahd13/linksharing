import { requireAdminSession } from "@/lib/auth-helpers";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Suspense } from "react";
import Link from "next/link";
import { SubmitButton } from "./submit-button";
import { revalidatePath } from "next/cache";

export default async function GroupsPage() {
  const session = await requireAdminSession();
  const orgId = session.user.orgId ?? "default-org";
  const groups = await prisma.whatsAppGroup.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Routing invites</p>
          <h1 className="text-2xl font-semibold text-slate-900">WhatsApp groups</h1>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/dashboard">Back to dashboard</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create group</CardTitle>
          <CardDescription>Store invite URLs to rotate safely.</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<p>Loading...</p>}>
            <CreateGroupForm />
          </Suspense>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((group) => (
          <Card key={group.id} className="border border-slate-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{group.name}</CardTitle>
                <Badge variant="secondary">{group.id.slice(0, 6)}</Badge>
              </div>
              <CardDescription className="truncate text-slate-600">
                {group.whatsappInviteUrl}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              <p>Created {group.createdAt.toDateString()}</p>
              <form
                action={async () => {
                  "use server";
                  const session = await requireAdminSession();
                  const orgId = session.user.orgId ?? "default-org";
                  await prisma.$transaction(async (tx) => {
                    const campaigns = await tx.campaign.findMany({ where: { groupId: group.id, orgId }, select: { id: true } });
                    const campaignIds = campaigns.map((c) => c.id);
                    if (campaignIds.length) {
                      await tx.inviteLink.deleteMany({ where: { campaignId: { in: campaignIds }, orgId } });
                      await tx.campaign.deleteMany({ where: { id: { in: campaignIds }, orgId } });
                    }
                    await tx.inviteRotationHistory.deleteMany({ where: { groupId: group.id } });
                    await tx.whatsAppGroup.delete({ where: { id: group.id, orgId } });
                  });
                  await logAudit({
                    orgId,
                    adminId: session.user.id,
                    action: "GROUP_DELETED",
                    entityType: "whatsapp_groups",
                    entityId: group.id,
                    meta: { name: group.name },
                  });
                  revalidatePath("/admin/groups");
                }}
                className="mt-3"
              >
                <Button type="submit" size="sm" variant="destructive">
                  Delete group & campaigns
                </Button>
              </form>
            </CardContent>
          </Card>
        ))}
        {groups.length === 0 && <p className="text-sm text-slate-600">No groups yet.</p>}
      </div>
    </div>
  );
}

function FormField({ label, name, placeholder }: { label: string; name: string; placeholder?: string }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <Input name={name} placeholder={placeholder} required />
    </div>
  );
}

async function createGroup(formData: FormData) {
  "use server";
  const session = await requireAdminSession();
  const name = String(formData.get("name"));
  const whatsappInviteUrl = String(formData.get("url"));
  const orgId = session.user.orgId ?? "default-org";
  // Ensure org exists to satisfy FK
  await prisma.organization.upsert({
    where: { id: orgId },
    update: {},
    create: { id: orgId, name: "Default Org" },
  });
  const group = await prisma.whatsAppGroup.create({
    data: {
      name,
      whatsappInviteUrl,
      orgId,
    },
  });
  await logAudit({
    orgId: session.user.orgId,
    adminId: session.user.id,
    action: "GROUP_CREATED",
    entityType: "whatsapp_groups",
    entityId: group.id,
  });
}

function CreateGroupForm() {
  return (
    <form action={createGroup} className="space-y-4">
      <FormField label="Group name" name="name" placeholder="January onboard" />
      <FormField label="WhatsApp invite URL" name="url" placeholder="https://chat.whatsapp.com/..." />
      <SubmitButton />
    </form>
  );
}
