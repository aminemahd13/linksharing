import { requireAdminSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { UsageChart } from "@/components/charts/usage-chart";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/admin/logout-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";

function formatDate(input: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(input);
}

export default async function AdminDashboardPage() {
  const session = await requireAdminSession();
  const orgId = session.user.orgId ?? "default-org";
  const orgFilter = { orgId };

  // eslint-disable-next-line react-hooks/purity
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [total, active, used, disabled, expired, recentLinks, auditLogs, usageRaw, campaigns] =
    await prisma.$transaction([
      prisma.inviteLink.count({ where: { ...orgFilter } }),
      prisma.inviteLink.count({ where: { ...orgFilter, status: "ACTIVE" } }),
      prisma.inviteLink.count({ where: { ...orgFilter, status: "USED" } }),
      prisma.inviteLink.count({ where: { ...orgFilter, status: "DISABLED" } }),
      prisma.inviteLink.count({ where: { ...orgFilter, status: "EXPIRED" } }),
      prisma.inviteLink.findMany({
        where: { ...orgFilter },
        include: {
          recipient: true,
          campaign: { include: { group: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.auditLog.findMany({
        where: { ...orgFilter },
        include: { admin: true },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      prisma.inviteLink.findMany({
        where: { ...orgFilter, usedAt: { gte: since } },
        select: { usedAt: true },
      }),
      prisma.campaign.findMany({
        where: { ...orgFilter },
        include: { inviteLinks: true, group: true },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
    ]);

  const usageData = Array.from({ length: 7 }).map((_, idx) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - idx));
    const key = date.toISOString().slice(0, 10);
    const usedCount = usageRaw.filter((u) => u.usedAt && u.usedAt.toISOString().startsWith(key)).length;
    return { day: formatDate(date), used: usedCount };
  });

  const usedPercent = total === 0 ? 0 : Math.round((used / total) * 100);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Welcome back</p>
            <h1 className="text-3xl font-semibold text-slate-900">Admin dashboard</h1>
          </div>
          <div className="flex gap-3">
            {session.user.role === "OWNER" && (
              <Button asChild variant="outline">
                <Link href="/admin/admins">Admin control panel</Link>
              </Button>
            )}
            <Button asChild variant="outline">
              <Link href="/admin/groups">Manage groups</Link>
            </Button>
            <Button asChild>
              <Link href="/admin/campaigns">New campaign</Link>
            </Button>
          <LogoutButton />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardDescription>Total links</CardDescription>
              <CardTitle className="text-3xl">{total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Active</CardDescription>
              <CardTitle className="text-3xl">{active}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Used</CardDescription>
              <CardTitle className="text-3xl">{used}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Disabled / Expired</CardDescription>
              <CardTitle className="text-3xl">{disabled + expired}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Usage (7 days)</CardTitle>
                <CardDescription>{usedPercent}% links used overall</CardDescription>
              </div>
              <Badge variant="outline">Used last 7d: {usageRaw.length}</Badge>
            </CardHeader>
            <CardContent>
              <UsageChart data={usageData} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>Audit log excerpts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700">
              {auditLogs.map((log) => (
                <div key={log.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900">{log.action}</span>
                    <span className="text-xs text-slate-500">{formatDate(log.createdAt)}</span>
                  </div>
                  <p className="text-slate-600">
                    {log.entityType} {log.entityId || "-"}
                  </p>
                  <p className="text-xs text-slate-500">by {log.admin?.email ?? "system"}</p>
                </div>
              ))}
              {auditLogs.length === 0 && <p className="text-slate-500">No activity yet.</p>}
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <div>
                <CardTitle>Latest links</CardTitle>
                <CardDescription>Search and filter in Links tab.</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/links">Open links</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Used</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentLinks.map((link) => (
                      <TableRow key={link.id}>
                        <TableCell>{link.recipient.email}</TableCell>
                        <TableCell>
                          <StatusBadge status={link.status} />
                        </TableCell>
                        <TableCell>{link.campaign.name}</TableCell>
                        <TableCell>
                          {link.usedAt ? formatDate(link.usedAt) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {recentLinks.length === 0 && (
                  <p className="py-6 text-sm text-slate-500">No links yet. Create a campaign to start.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between">
              <div>
                <CardTitle>Campaigns</CardTitle>
                <CardDescription>Status snapshot</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/campaigns">Manage</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {campaigns.map((campaign) => {
                const sent = campaign.inviteLinks.length;
                const usedLinks = campaign.inviteLinks.filter((l) => l.status === "USED").length;
                const pct = sent === 0 ? 0 : Math.round((usedLinks / sent) * 100);
                return (
                  <div key={campaign.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500">{campaign.group?.name || "Group"}</p>
                        <p className="text-lg font-semibold text-slate-900">{campaign.name}</p>
                      </div>
                      <Badge variant="secondary">{campaign.status}</Badge>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
                      <span>{sent} links</span>
                      <span>{usedLinks} used ({pct}%)</span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {campaigns.length === 0 && <p className="text-sm text-slate-500">No campaigns yet.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
