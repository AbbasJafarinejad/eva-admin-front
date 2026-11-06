/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { Card } from "@heroui/react";

type Overview = {
  users_total: number;
  active_users: number;
  rooms_by_channel: Record<string, number>;
};

export default function UsersPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/admin/overview?days=30", { cache: "no-store" })
      .then(async (r) => (r.ok ? (r.json() as Promise<Overview>) : Promise.reject()))
      .then(setData)
      .catch(() => setError("دادهٔ کاربران از سرور دریافت نشد."));
  }, []);
  return (
    <AdminShell title="کاربران" subtitle="نمای کلی کاربران و فعالیت">
      <div className="space-y-4 p-1">
        {error && <div role="alert" className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm">{error}</div>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="rounded-2xl border border-separator bg-surface p-5">
            <p className="text-sm text-muted">کل کاربران</p>
            <p className="mt-2 text-2xl font-black">{data ? new Intl.NumberFormat("fa-IR").format(data.users_total) : "—"}</p>
          </Card>
          <Card className="rounded-2xl border border-separator bg-surface p-5">
            <p className="text-sm text-muted">کاربران فعال (۳۰ روز)</p>
            <p className="mt-2 text-2xl font-black">{data ? new Intl.NumberFormat("fa-IR").format(data.active_users) : "—"}</p>
          </Card>
        </div>
        <Card className="rounded-2xl border border-separator bg-surface p-5">
          <p className="font-bold">کانال‌ها</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(data?.rooms_by_channel ?? {}).map(([ch, n]) => (
              <span key={ch} className="rounded-xl bg-surface-secondary px-3 py-1 text-sm">{ch}: <b>{new Intl.NumberFormat("fa-IR").format(n)}</b></span>
            ))}
            {!Object.keys(data?.rooms_by_channel ?? {}).length && <p className="text-sm text-muted">داده‌ای برای نمایش نیست.</p>}
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}

