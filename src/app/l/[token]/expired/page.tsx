export default function ExpiredPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md space-y-4 rounded-2xl bg-white p-8 text-center shadow-lg">
        <h1 className="text-2xl font-semibold">Link expired</h1>
        <p className="text-slate-600">This invite is no longer active. Contact your admin for a fresh link.</p>
      </div>
    </div>
  );
}
