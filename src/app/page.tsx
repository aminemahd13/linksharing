import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-16 px-6 py-20 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl space-y-6">
          <div className="inline-flex rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/70">
            One-time WhatsApp access links
          </div>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
            Secure, auditable sharing links for every campaign.
          </h1>
          <p className="text-lg text-white/80">
            Generate single-use WhatsApp invites, email them automatically, and
            track every click with admin-friendly controls, audit logs, and
            granular status filters.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/admin/login"
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:scale-[1.01] hover:bg-slate-100"
            >
              Go to Admin Login
            </Link>
            <Link
              href="/admin/dashboard"
              className="rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:border-white"
            >
              View Dashboard
            </Link>
          </div>
          <div className="flex gap-6 text-sm text-white/70">
            <span>Atomic consume</span>
            <span>Token hashing</span>
            <span>Audit logs</span>
            <span>CSV imports</span>
          </div>
        </div>
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
          <p className="text-sm text-white/70">Live snapshot</p>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <div>
                <p className="text-sm text-white/60">January onboarding</p>
                <p className="text-lg font-semibold">42% used</p>
              </div>
              <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-semibold text-emerald-200">
                Active
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-white/60">Links sent</p>
                <p className="text-2xl font-semibold">120</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-white/60">Clicks last 24h</p>
                <p className="text-2xl font-semibold">19</p>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-white/60">Audit trail</p>
              <ul className="mt-2 space-y-2 text-sm text-white/80">
                <li>• Admin deactivated 3 links</li>
                <li>• New invite batch sent</li>
                <li>• 2 links regenerated</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
