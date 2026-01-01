import { consumeLink } from "@/lib/links";
import { checkRateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const userAgent = req.headers.get("user-agent") ?? undefined;

  if (!checkRateLimit(`consume:${ip}`, 5, 60_000)) {
    return NextResponse.json({ message: "Too many attempts" }, { status: 429 });
  }

  const result = await consumeLink(token, { ip, userAgent });
  if (!result.ok) {
    return NextResponse.json({ message: "Link expired or unavailable" }, { status: 400 });
  }

  return NextResponse.json({ redirectUrl: result.redirectUrl });
}
