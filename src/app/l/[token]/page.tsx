import { ConsumeButton } from "./consume-button";
import { getLinkByToken } from "@/lib/links";

export default async function InviteLanding({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = await getLinkByToken(token);

  if (!link) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md space-y-4 rounded-2xl bg-white p-8 text-center shadow-lg">
          <h1 className="text-2xl font-semibold">Link not found</h1>
          <p className="text-slate-600">
            This invite link is invalid or has expired. Check that you opened the latest link from your email, or ask your
            admin to send a new one.
          </p>
        </div>
      </div>
    );
  }

  if (link.status !== "ACTIVE") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md space-y-4 rounded-2xl bg-white p-8 text-center shadow-lg">
          <h1 className="text-2xl font-semibold">Link unavailable</h1>
          <p className="text-slate-600">
            This link is {link.status.toLowerCase()}. Please request a fresh invite from your admin so we can issue a new
            one-time link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md space-y-6 rounded-2xl bg-white p-8 text-center shadow-lg">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Personal invite</p>
        <h1 className="text-2xl font-semibold text-slate-900">You're almost in</h1>
        <p className="text-slate-600">
          This one-time link lets you join the WhatsApp group for {link.campaign.name}. It is tied to your invite email and
          works once.
        </p>
        <div className="space-y-2 rounded-lg bg-slate-50 p-4 text-left text-sm text-slate-700">
          <p className="font-semibold text-slate-800">What happens next</p>
          <ul className="list-disc space-y-1 pl-4">
            <li>We verify your invite and then open WhatsApp on this device.</li>
            <li>If prompted, confirm you want to join the group for {link.campaign.name}.</li>
            <li>If WhatsApp is not installed, open this link on your phone where WhatsApp is available.</li>
          </ul>
        </div>
        <p className="text-sm text-slate-500">If this wasn't you, simply close this page and the invite will remain unused.</p>
        <ConsumeButton token={token} />
      </div>
    </div>
  );
}
