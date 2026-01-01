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
          <p className="text-slate-600">This invite link is invalid or has expired.</p>
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
            This link is {link.status.toLowerCase()}. Please request a new invite from your admin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md space-y-6 rounded-2xl bg-white p-8 text-center shadow-lg">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">One-time invite</p>
        <h1 className="text-2xl font-semibold text-slate-900">Join the WhatsApp group</h1>
        <p className="text-slate-600">
          This link is personal and can be used once. Campaign: {link.campaign.name}
        </p>
        <ConsumeButton token={token} />
      </div>
    </div>
  );
}
