/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { Card } from "@heroui/react";
import { useParams } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react";

export default function TurnDetailPage(_props: { params: Promise<{ id: string }> }) {
  const routeParams = useParams<{ id: string }>();
  const id = routeParams.id;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/turns/${encodeURIComponent(id)}`, { cache: "no-store", signal: controller.signal });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || "request_failed");
        }
        setData(await res.json());
        setError("");
      } catch {
        setError("نمایش جزئیات مجاز نیست یا در دسترس نیست.");
      } finally { setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [id]);

  return (
    <main className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-separator bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-accent/15 font-black text-accent">E</div>
            <div><p className="font-extrabold">جزئیات گفت‌وگو</p><p className="text-xs text-muted">نمایش امن؛ داده‌های حساس ممکن است سانسور شده باشند</p></div>
          </div>
          <a href="/turns" className="inline-flex items-center gap-2 rounded-xl border border-separator bg-surface px-4 py-2 text-sm font-semibold hover:border-accent/50"><ArrowLeft size={18} />بازگشت</a>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-10">
        {error && <div role="alert" className="mb-5 rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm">{error}</div>}
        <Card className="rounded-2xl border border-separator bg-surface p-5">
          {loading && <p className="text-sm text-muted">در حال بارگذاری…</p>}
          {!loading && data && (
            <div className="space-y-4 text-sm">
              <pre className="whitespace-pre-wrap break-words rounded-xl bg-surface-secondary p-4">{JSON.stringify(data, null, 2)}</pre>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}

