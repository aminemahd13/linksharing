import { requireAdminSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LinkActions } from "./actions";
import { Input } from "@/components/ui/input";
import Link from "next/link";

type StatusFilter = "ALL" | "ACTIVE" | "USED" | "DISABLED" | "EXPIRED";

async function getAllowedCampaignIds(adminId: string, role: string): Promise<string[] | null> {
  if (role === "OWNER") return null; // null -> no restriction
  const access = await prisma.adminCampaignAccess.findMany({ where: { adminId }, select: { campaignId: true } });
  return access.map((a) => a.campaignId);
}

function formatDate(input: Date | null) {
  if (!input) return "—";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(input);
}

export default async function LinksPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: StatusFilter; campaignId?: string }> }) {
  const session = await requireAdminSession();
  const orgId = session.user.orgId ?? "default-org";
  const { q, status, campaignId } = await searchParams;
  const term = q?.toLowerCase() || "";
  const statusFilter: StatusFilter = status && ["ACTIVE", "USED", "DISABLED", "EXPIRED"].includes(status as StatusFilter)
    ? (status as StatusFilter)
    : "ALL";
  const allowedCampaignIds = await getAllowedCampaignIds(session.user.id, session.user.role ?? "");
  const campaignFilter = campaignId || undefined;

  let scopedCampaignIds: string[] | undefined = allowedCampaignIds ?? undefined;
  if (campaignFilter) {
    scopedCampaignIds = scopedCampaignIds ? scopedCampaignIds.filter((id) => id === campaignFilter) : [campaignFilter];
  }

  const campaigns = await prisma.campaign.findMany({
    where: { orgId, ...(allowedCampaignIds ? { id: { in: allowedCampaignIds } } : {}) },
    orderBy: { createdAt: "desc" },
  });
  const links = await prisma.inviteLink.findMany({
    where: {
      orgId,
      campaignId: scopedCampaignIds ? { in: scopedCampaignIds } : undefined,
      status: statusFilter === "ALL" ? undefined : statusFilter,
      recipient: term
        ? {
            email: {
              contains: term,
              mode: "insensitive",
            },
          }
        : undefined,
    },
    include: {
      recipient: true,
      campaign: true,
    },
    orderBy: [
      { createdAt: "desc" },
      { usedAt: "desc" },
    ],
    take: 200,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Link controls</p>
          <h1 className="text-2xl font-semibold text-slate-900">Invite links</h1>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/dashboard">Back to dashboard</Link>
        </Button>
      </div>

      <form method="GET" className="flex items-center gap-3">
        <Input name="q" placeholder="Search by email" defaultValue={term} className="w-64" />
        <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white">Search</button>
        <select name="status" defaultValue={statusFilter} className="h-10 rounded-md border border-slate-200 px-3 text-sm">
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="USED">Used</option>
          <option value="DISABLED">Disabled</option>
          <option value="EXPIRED">Expired</option>
        </select>
        <select name="campaignId" defaultValue={campaignFilter || ""} className="h-10 rounded-md border border-slate-200 px-3 text-sm">
          <option value="">All campaigns</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Recent links</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Link</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Used</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.map((link) => (
                <TableRow key={link.id}>
                  <TableCell>{link.recipient.email}</TableCell>
                  <TableCell className="max-w-xs truncate text-xs text-slate-600">
                    {link.status === "ACTIVE" ? (
                      <span className="italic text-emerald-700">Use Copy or Regenerate & Copy</span>
                    ) : (
                      <span className="italic">Reactivate or Regenerate to copy</span>
                    )}
                  </TableCell>
                  <TableCell><StatusBadge status={link.status} /></TableCell>
                  <TableCell>{link.campaign.name}</TableCell>
                  <TableCell>{formatDate(link.createdAt)}</TableCell>
                  <TableCell>{formatDate(link.usedAt)}</TableCell>
                  <TableCell className="text-xs text-slate-700">{link.usedAt ? "Used" : "Not used yet"}</TableCell>
                  <TableCell>
                    <LinkActions id={link.id} status={link.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {links.length === 0 && <p className="py-4 text-sm text-slate-600">No links yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
