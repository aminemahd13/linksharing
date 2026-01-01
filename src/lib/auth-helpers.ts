import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import { redirect } from "next/navigation";

export async function requireAdminSession(): Promise<Session> {
  const session = (await getServerSession(authOptions as any)) as Session | null;
  if (!session?.user) {
    redirect("/admin/login");
  }
  return session;
}
