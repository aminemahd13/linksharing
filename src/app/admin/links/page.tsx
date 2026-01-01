import { requireAdminSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

function formatDate(input: Date | null) {
  if (!input) return "—";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(input);
}

export default async function LinksPage({ searchParams }: { searchParams: { q?: string } }) {
  const session = await requireAdminSession();
  const orgId = session.user.orgId ?? "default-org";
  const term = searchParams.q?.toLowerCase() || "";
  const links = await prisma.inviteLink.findMany({
    where: {
      orgId,
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
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Link controls</p>
          <h1 className="text-2xl font-semibold text-slate-900">Invite links</h1>
        </div>
      </div>

      <form method="GET" className="flex items-center gap-3">
        <Input name="q" placeholder="Search by email" defaultValue={term} className="w-64" />
        <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white">Search</button>
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
                <TableHead>Status</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Used</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.map((link) => (
                <TableRow key={link.id}>
                  <TableCell>{link.recipient.email}</TableCell>
                  <TableCell><StatusBadge status={link.status} /></TableCell>
                  <TableCell>{link.campaign.name}</TableCell>
                  <TableCell>{formatDate(link.createdAt)}</TableCell>
                  <TableCell>{formatDate(link.usedAt)}</TableCell>
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
