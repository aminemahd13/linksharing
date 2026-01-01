import nodemailer from "nodemailer";

let smtpTransport: nodemailer.Transporter | null = null;

function getSmtp(): nodemailer.Transporter {
  if (smtpTransport) return smtpTransport;
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === "true";
  if (!host || !port) {
    throw new Error("SMTP_HOST/SMTP_PORT not set");
  }
  smtpTransport = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
  });
  return smtpTransport;
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
  const from = process.env.AUTH_EMAIL_FROM || "contact@mathmaroc.org";
  const subject = `Your invite to ${campaignName}`;
  const html = `
    <p>Hello ${name || "there"},</p>
    <p>You have been invited to join a WhatsApp group. This link is personal and can be used once.</p>
    <p><a href="${url}">Join the WhatsApp group</a></p>
    <p>If you did not expect this email, you can ignore it.</p>
  `;
  await getSmtp().sendMail({ from, to, subject, html });
}
