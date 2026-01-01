import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: string }) {
  const tone: Record<string, string> = {
    ACTIVE: "bg-emerald-100 text-emerald-800",
    USED: "bg-blue-100 text-blue-800",
    DISABLED: "bg-amber-100 text-amber-800",
    EXPIRED: "bg-rose-100 text-rose-800",
  };
  return <Badge className={tone[status] ?? ""}>{status}</Badge>;
}
