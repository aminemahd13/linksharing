import { requireAdminSession } from "@/lib/auth-helpers";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { hash } from "bcrypt";

const roles = ["OWNER", "ADMIN", "VIEWER"] as const;

type Role = (typeof roles)[number];

type CampaignOption = { id: string; name: string };

type AdminRow = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  campaignAccess: { campaign: CampaignOption }[];
};

async function createAdmin(formData: FormData) {
  "use server";
  const session = await requireAdminSession();
  if (session.user.role !== "OWNER") {
    throw new Error("Unauthorized");
  }
  const email = String(formData.get("email"))?.toLowerCase().trim();
  const name = String(formData.get("name") || "").trim() || null;
  const password = String(formData.get("password"));
  const role = (String(formData.get("role")) as Role) || "ADMIN";
  const campaignIds = formData.getAll("campaignIds").map(String);
  const orgId = session.user.orgId ?? "default-org";

  const existing = await prisma.admin.findUnique({ where: { email } });
  if (existing) {
    throw new Error("Admin with this email already exists");
  }

  const passwordHash = await hash(password, 10);
  const admin = await prisma.admin.create({
    data: {
      email,
      name,
      passwordHash,
      role,
      orgId,
      campaignAccess: {
        create: campaignIds.map((campaignId) => ({ campaignId })),
      },
    },
  });

  await logAudit({
    orgId,
    adminId: session.user.id,
    action: "ADMIN_CREATED",
    entityType: "admins",
    entityId: admin.id,
    meta: { email, role, campaigns: campaignIds },
  });

  revalidatePath("/admin/admins");
}

async function updateAdmin(formData: FormData) {
  "use server";
  const session = await requireAdminSession();
  if (session.user.role !== "OWNER") {
    throw new Error("Unauthorized");
  }
  const adminId = String(formData.get("adminId"));
  const role = (String(formData.get("role")) as Role) || "ADMIN";
  const password = String(formData.get("password") || "");
  const campaignIds = formData.getAll("campaignIds").map(String);
  const orgId = session.user.orgId ?? "default-org";

  const data: any = { role };
  if (password) {
    data.passwordHash = await hash(password, 10);
  }

  await prisma.$transaction(async (tx) => {
    await tx.admin.update({ where: { id: adminId, orgId }, data });
    await tx.adminCampaignAccess.deleteMany({ where: { adminId } });
    if (campaignIds.length) {
      await tx.adminCampaignAccess.createMany({ data: campaignIds.map((campaignId) => ({ adminId, campaignId })) });
    }
  });

  await logAudit({
    orgId,
    adminId: session.user.id,
    action: "ADMIN_UPDATED",
    entityType: "admins",
    entityId: adminId,
    meta: { role, campaigns: campaignIds, passwordChanged: Boolean(password) },
  });

  revalidatePath("/admin/admins");
}

async function deleteAdmin(formData: FormData) {
  "use server";
  const session = await requireAdminSession();
  if (session.user.role !== "OWNER") {
    throw new Error("Unauthorized");
  }
  const adminId = String(formData.get("adminId"));
  const orgId = session.user.orgId ?? "default-org";
  if (adminId === session.user.id) {
    throw new Error("Cannot delete yourself");
  }

  await prisma.$transaction(async (tx) => {
    await tx.adminCampaignAccess.deleteMany({ where: { adminId } });
    await tx.admin.delete({ where: { id: adminId, orgId } });
  });

  await logAudit({
    orgId,
    adminId: session.user.id,
    action: "ADMIN_DELETED",
    entityType: "admins",
    entityId: adminId,
  });

  revalidatePath("/admin/admins");
}

export default async function AdminsPage() {
  const session = await requireAdminSession();
  if (session.user.role !== "OWNER") {
    return (
      <div className="mx-auto max-w-4xl space-y-4 px-6 py-10">
        <p className="text-sm text-slate-600">Only super admins can manage admins.</p>
        <Button asChild variant="outline">
          <Link href="/admin/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  const orgId = session.user.orgId ?? "default-org";
  const campaigns = await prisma.campaign.findMany({ where: { orgId }, orderBy: { createdAt: "desc" }, select: { id: true, name: true } });
  const admins = await prisma.admin.findMany({
    where: { orgId },
    include: {
      campaignAccess: { include: { campaign: { select: { id: true, name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Super admin controls</p>
          <h1 className="text-2xl font-semibold text-slate-900">Admins</h1>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/dashboard">Back to dashboard</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create admin</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createAdmin} className="grid gap-3 md:grid-cols-2">
            <Input name="email" type="email" placeholder="email@example.com" required />
            <Input name="name" placeholder="Name" />
            <Input name="password" type="password" placeholder="Password" required minLength={6} />
            <select name="role" className="h-10 rounded-md border border-slate-200 px-3 text-sm" defaultValue="ADMIN">
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <div className="md:col-span-2 space-y-2">
              <p className="text-sm font-medium text-slate-700">Campaign access</p>
              <div className="flex flex-wrap gap-3 text-sm text-slate-700">
                {campaigns.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 border border-slate-200 px-2 py-1 rounded-md">
                    <input type="checkbox" name="campaignIds" value={c.id} /> {c.name}
                  </label>
                ))}
                {campaigns.length === 0 && <p className="text-xs text-slate-500">No campaigns yet.</p>}
              </div>
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Create admin</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing admins</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {admins.map((admin) => {
            const accessIds = new Set(admin.campaignAccess.map((a) => a.campaign.id));
            return (
              <div key={admin.id} className="space-y-2 rounded-md border border-slate-200 p-4">
                <form action={updateAdmin} className="grid gap-3 md:grid-cols-2">
                  <input type="hidden" name="adminId" value={admin.id} />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-800">{admin.email}</p>
                    <p className="text-xs text-slate-600">{admin.name || "No name"}</p>
                  </div>
                  <select name="role" defaultValue={admin.role} className="h-10 rounded-md border border-slate-200 px-3 text-sm">
                    {roles.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <Input name="password" type="password" placeholder="Set new password (optional)" />
                  <div className="md:col-span-2 space-y-2">
                    <p className="text-sm font-medium text-slate-700">Campaign access</p>
                    <div className="flex flex-wrap gap-3 text-sm text-slate-700">
                      {campaigns.map((c) => (
                        <label key={c.id} className="flex items-center gap-2 border border-slate-200 px-2 py-1 rounded-md">
                          <input type="checkbox" name="campaignIds" value={c.id} defaultChecked={accessIds.has(c.id)} /> {c.name}
                        </label>
                      ))}
                      {campaigns.length === 0 && <p className="text-xs text-slate-500">No campaigns yet.</p>}
                    </div>
                  </div>
                  <div className="flex gap-2 md:col-span-2">
                    <Button type="submit">Update</Button>
                  </div>
                </form>
                {admin.id !== session.user.id && (
                  <form action={deleteAdmin}>
                    <input type="hidden" name="adminId" value={admin.id} />
                    <Button type="submit" variant="destructive">
                      Delete
                    </Button>
                  </form>
                )}
              </div>
            );
          })}
          {admins.length === 0 && <p className="text-sm text-slate-600">No admins yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
