"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ConsumeButton({ token }: { token: string }) {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    setStatus(null);
    const res = await fetch(`/api/l/${token}/consume`, {
      method: "POST",
    });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      window.location.href = data.redirectUrl as string;
      return;
    }
    const data = await res.json().catch(() => null);
    setStatus(data?.message || "This link is no longer valid.");
  }

  return (
    <div className="space-y-3">
      <Button onClick={handleClick} className="w-full" disabled={loading}>
        {loading ? "Checking..." : "Join the WhatsApp group"}
      </Button>
      {status && <p className="text-center text-sm text-red-600">{status}</p>}
    </div>
  );
}
