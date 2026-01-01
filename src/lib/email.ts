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
  const subject = `You're invited to ${campaignName} on WhatsApp`;
  const html = `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.5;">
      <p style="margin: 0 0 12px;">Hi ${name || "there"},</p>
      <p style="margin: 0 0 12px;">You're invited to join the <strong>${campaignName}</strong> WhatsApp group. This link is just for you and works once.</p>
      <p style="margin: 16px 0; text-align: center;">
        <a href="${url}" style="background: #16a34a; color: #fff; padding: 12px 18px; border-radius: 8px; text-decoration: none; display: inline-block;">Open your invite</a>
      </p>
      <p style="margin: 0 0 8px; font-weight: 600;">Before you join:</p>
      <ul style="padding-left: 18px; margin: 0 0 12px; color: #334155;">
        <li style="margin-bottom: 6px;">Use this from the device where WhatsApp is installed.</li>
        <li style="margin-bottom: 6px;">The link is tied to ${to} and expires after the first successful use.</li>
      </ul>
      <p style="margin: 0 0 12px;">If the button above does not work, copy and paste this link in your browser: <br /><span style="color: #2563eb; word-break: break-all;">${url}</span></p>
      <p style="margin: 0; color: #475569;">Didn’t expect this? You can ignore this email and the invite will stay inactive.</p>
    </div>
  `;
  await getSmtp().sendMail({ from, to, subject, html });
}
