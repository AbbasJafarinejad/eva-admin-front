/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useState, ChangeEvent } from "react";
import { Button, Card } from "@heroui/react";
import { DownloadSimple, FunnelSimple } from "@phosphor-icons/react";

type TurnMeta = {
  oid: string;
  ts?: string;
  source?: string;
  model?: string;
  status?: string;
  latency_ms?: number;
  tokens?: number;
  silence?: boolean;
  routing_decision?: string;
};

type ListResponse = { items?: TurnMeta[]; next_page?: number } | { error: string };

export default function TurnsPage() {
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [channel, setChannel] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [model, setModel] = useState<string>("");
  const [limit, setLimit] = useState<number>(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [data, setData] = useState<TurnMeta[]>([]);
  const [truncated, setTruncated] = useState<boolean>(false);
  const [demo, setDemo] = useState<boolean>(false);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (channel) p.set("channel", channel);
    if (status) p.set("status", status);
    if (model) p.set("model", model);
    p.set("limit", String(limit));
    return p.toString();
  }, [from, to, channel, status, model, limit]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/turns?${query}`, { cache: "no-store", signal: controller.signal });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || "request_failed");
        }
        const body = (await res.json()) as any as { items?: TurnMeta[]; truncated?: boolean } | { error: string };
        if ("error" in body) throw new Error(body.error);
        setData((body as any).items || []);
        setTruncated(Boolean((body as any).truncated));
        setError("");
      } catch {
        setError("دریافت فهرست گفت‌وگوها ناموفق بود.");
      } finally {
        setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [query]);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      setDemo(params.get("demo") === "1");
    } catch {}
  }, []);

  const exportCsvHref = `/api/admin/turns/export?${query}&format=csv&scope=meta`;
  const exportJsonlHref = `/api/admin/turns/export?${query}&format=jsonl&scope=meta`;

  return (
    <main className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-separator bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-accent/15 font-black text-accent">E</div>
            <div><p className="font-extrabold">تحلیل گفت‌وگوها</p><p className="text-xs text-muted">نمایش فراداده؛ متن‌ها تنها با مجوز</p></div>
          </div>
          <div className="flex items-center gap-2">
            {demo && <span className="rounded-xl bg-warning/20 px-3 py-1 text-xs font-bold text-warning">نمونهٔ آزمایشی</span>}
            <a href={exportCsvHref} className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-bold text-white transition hover:opacity-90">
              <DownloadSimple size={18} />خروجی CSV
            </a>
            <a href={exportJsonlHref} className="inline-flex h-10 items-center gap-2 rounded-xl border border-separator bg-surface px-4 text-sm font-semibold transition hover:border-accent/50">
              <DownloadSimple size={18} />JSONL
            </a>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
        <Card className="mb-5 gap-3 rounded-2xl border border-separator bg-surface p-4">
          <div className="flex items-center gap-2 text-sm font-bold"><FunnelSimple size={18} />فیلترها</div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm"><span className="text-muted">از تاریخ</span><input type="date" value={from} onChange={(e: ChangeEvent<HTMLInputElement>) => setFrom(e.target.value)} className="h-10 rounded-xl border border-separator bg-surface px-3" /></label>
            <label className="flex flex-col gap-1 text-sm"><span className="text-muted">تا تاریخ</span><input type="date" value={to} onChange={(e: ChangeEvent<HTMLInputElement>) => setTo(e.target.value)} className="h-10 rounded-xl border border-separator bg-surface px-3" /></label>
            <label className="flex flex-col gap-1 text-sm"><span className="text-muted">منبع</span><input placeholder="web/telegram/..." value={channel} onChange={(e: ChangeEvent<HTMLInputElement>) => setChannel(e.target.value)} className="h-10 rounded-xl border border-separator bg-surface px-3" /></label>
            <label className="flex flex-col gap-1 text-sm"><span className="text-muted">وضعیت</span><input placeholder="ok/error" value={status} onChange={(e: ChangeEvent<HTMLInputElement>) => setStatus(e.target.value)} className="h-10 rounded-xl border border-separator bg-surface px-3" /></label>
            <label className="flex flex-col gap-1 text-sm"><span className="text-muted">مدل</span><input placeholder="gpt-4o-mini/..." value={model} onChange={(e: ChangeEvent<HTMLInputElement>) => setModel(e.target.value)} className="h-10 rounded-xl border border-separator bg-surface px-3" /></label>
            <label className="flex items-center gap-2 text-sm text-muted">
              حداکثر ردیف‌ها
              <select aria-label="حداکثر ردیف‌ها" value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="h-10 rounded-xl border border-separator bg-surface px-3">
                {[25, 50, 100, 200].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          </div>
        </Card>

        {error && <div role="alert" className="mb-5 rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm">{error}</div>}
        <Card className="rounded-2xl border border-separator bg-surface p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-right text-sm">
              <thead className="sticky top-0 bg-surface-secondary">
                <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:font-semibold [&>th]:text-muted">
                  <th>زمان</th>
                  <th>شناسه</th>
                  <th>منبع</th>
                  <th>مدل</th>
                  <th>وضعیت</th>
                  <th>تاخیر (ms)</th>
                  <th>توکن‌ها</th>
                  <th>سکوت</th>
                  <th>مسیر</th>
                </tr>
              </thead>
              <tbody className="[&>tr:nth-child(even)]:bg-surface-secondary/40">
                {!loading && data.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-6 text-center text-muted">داده‌ای برای نمایش نیست.</td></tr>
                )}
                {data.map((t) => (
                  <tr key={t.oid} className="cursor-pointer hover:bg-accent/10" onClick={() => window.location.assign(`/turns/${encodeURIComponent(t.oid)}`)}>
                    <td className="px-4 py-3 tabular-nums">{t.ts ? new Date(t.ts).toLocaleString("fa-IR") : "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{t.oid}</td>
                    <td className="px-4 py-3">{t.source || "—"}</td>
                    <td className="px-4 py-3">{t.model || "—"}</td>
                    <td className="px-4 py-3">{t.status || "—"}</td>
                    <td className="px-4 py-3 tabular-nums">{t.latency_ms ?? "—"}</td>
                    <td className="px-4 py-3 tabular-nums">{t.tokens ?? "—"}</td>
                    <td className="px-4 py-3">{t.silence == null ? "—" : (t.silence ? "بله" : "خیر")}</td>
                    <td className="px-4 py-3">{t.routing_decision || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between gap-3 p-4 text-xs text-muted">
            <span>فهرست فقط فراداده را نشان می‌دهد. متن‌ها صرفاً با مجوز ویژه و ثبت رویداد قابل مشاهده است.</span>
            {truncated && <span className="font-bold text-warning">نمایش دم‌آخر: داده‌ها به {limit} ردیف اخیر محدود شده‌اند.</span>}
          </div>
        </Card>

        <Card className="mt-6 rounded-2xl border border-separator bg-surface p-4 text-sm">
          <p className="font-bold">راهنمای خروجی داده</p>
          <p className="mt-2 text-muted">CSV (UTF-8) و JSONL برای ابزارهای تحلیل. ستون‌ها (در صورت موجود بودن): oid, ts (UTC), source, model, status, latency_ms, tokens, silence, routing_decision.</p>
          <p className="mt-1 text-muted">برای جلوگیری از حملات فرمولی، هر مقدار CSV که با = یا + یا - یا @ شروع شود با ' پیشوند امن می‌شود.</p>
        </Card>
      </div>
    </main>
  );
}

