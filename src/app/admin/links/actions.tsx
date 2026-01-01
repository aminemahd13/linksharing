"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";

async function call(id: string, action: string) {
  const res = await fetch(`/api/admin/links/${id}/${action}`, { method: "POST" });
  if (!res.ok) throw new Error("Request failed");
}

export function LinkActions({ id, status }: { id: string; status: string }) {
  const [loading, setLoading] = useState<string | null>(null);

  async function handle(action: string) {
    setLoading(action);
    try {
      await call(id, action);
      window.location.reload();
    } catch (e) {
      console.error(e);
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
      <Button size="sm" variant="outline" disabled={loading === "resend"} onClick={() => handle("resend")}>
        Resend
      </Button>
      <Button size="sm" variant="default" disabled={loading === "regenerate"} onClick={() => handle("regenerate")}>
        Regenerate
      </Button>
    </div>
  );
}
