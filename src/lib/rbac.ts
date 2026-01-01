import type { Session } from "next-auth";

export function assertAdmin(session: Session | null, allowed: string[] = ["ADMIN", "OWNER"]) {
  if (!session?.user || !session.user.role || !allowed.includes(session.user.role)) {
    throw new Error("unauthorized");
  }
}
