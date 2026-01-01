import { Resend } from "resend";

let resend: Resend | null = null;

function getResend(): Resend {
  if (resend) return resend;
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not set");
  }
  resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000"
  );
}

export async function sendInviteEmail(params: {
  to: string;
  name?: string | null;
  token: string;
  campaignName: string;
}) {
  const { to, name, token, campaignName } = params;
  const url = `${appBaseUrl()}/l/${token}`;
  const from = process.env.AUTH_EMAIL_FROM || "admin@example.com";
  const subject = `Your invite to ${campaignName}`;
  const html = `
    <p>Hello ${name || "there"},</p>
    <p>You have been invited to join a WhatsApp group. This link is personal and can be used once.</p>
    <p><a href="${url}">Join the WhatsApp group</a></p>
    <p>If you did not expect this email, you can ignore it.</p>
  `;
  await getResend().emails.send({ from, to, subject, html });
}
