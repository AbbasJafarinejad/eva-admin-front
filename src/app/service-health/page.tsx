"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { Card } from "@heroui/react";

export default function ServiceHealthPage() {
  const [status, setStatus] = useState<{ status?: string; db?: string } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/admin/health", { cache: "no-store" }).then(async (r) => r.json()).then(setStatus).catch(() => setError("عدم دسترسی به وضعیت سرویس"));
  }, []);
  return (
    <AdminShell title="سلامت سرویس" subtitle="وضعیت API و پایگاه داده">
      <div className="rounded-2xl border border-separator bg-surface p-5">
        {error && <p role="alert" className="text-danger">{error}</p>}
        {!error && (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className={`size-2.5 rounded-full ${status?.status === "ok" ? "bg-success" : "bg-danger"}`} />
            <span className="font-bold">API:</span><span>{status?.status === "ok" ? "سالم" : "بررسی لازم"}</span>
            <span className="text-muted">·</span>
            <span className={`size-2.5 rounded-full ${status?.db === "ok" ? "bg-success" : "bg-danger"}`} />
            <span className="font-bold">پایگاه داده:</span><span>{status?.db === "ok" ? "سالم" : "بررسی لازم"}</span>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

