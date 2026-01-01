"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";

async function call(id: string, action: string) {
  const res = await fetch(`/api/admin/links/${id}/${action}`, { method: "POST" });
  if (!res.ok) {
    let msg = "Request failed";
    try {
      const data = await res.json();
      if (data?.message) msg = data.message;
    } catch {
      const text = await res.text();
      if (text) msg = text;
    }
    throw new Error(msg);
  }
  return res.json();
}

export function LinkActions({ id, status }: { id: string; status: string }) {
  const [loading, setLoading] = useState<string | null>(null);

  async function handle(action: string) {
    setLoading(action);
    try {
      const data = await call(id, action);
      if ((action === "regenerate" || action === "copy") && data?.url) {
        await navigator.clipboard.writeText(data.url);
      }
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert((e as Error).message || "Request failed");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" disabled={loading === "deactivate" || status === "DISABLED"} onClick={() => handle("deactivate")}>
        Deactivate
      </Button>
      <Button size="sm" variant="outline" disabled={loading === "reactivate" || status === "ACTIVE"} onClick={() => handle("reactivate")}>
        Reactivate
      </Button>
      <Button size="sm" variant="outline" disabled={loading === "copy"} onClick={() => handle("copy")}>
        Copy
      </Button>
      <Button size="sm" variant="outline" disabled={loading === "resend"} onClick={() => handle("resend")}>
        Resend
      </Button>
      <Button size="sm" variant="default" disabled={loading === "regenerate"} onClick={() => handle("regenerate")}>
        Regenerate & Copy
      </Button>
    </div>
  );
}
