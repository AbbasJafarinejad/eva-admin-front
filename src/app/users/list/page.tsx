/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useState, ChangeEvent } from "react";
import { AdminShell } from "@/components/admin-shell";
import { Card } from "@heroui/react";
import { tehranDateString } from "@/lib/dates";

type UserRow = {
  user_id: string;
  display_name?: string;
  messages?: number;
  ai_calls?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  tokens?: number;
  provider_cost_usd?: number | null;
};

export default function UsersListPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [model, setModel] = useState("");
  const [channel, setChannel] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"" | "tokens" | "ai_calls" | "messages" | "cost">("");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [rows, setRows] = useState<UserRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [demo, setDemo] = useState(false);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (model) p.set("model", model);
    if (channel) p.set("channel", channel);
    if (q) p.set("q", q);
    if (sort) p.set("sort", sort);
    if (order) p.set("order", order);
    p.set("page", String(page));
    p.set("page_size", String(pageSize));
    return p.toString();
  }, [from, to, model, channel, q, sort, order, page, pageSize]);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      setDemo(params.get("demo") === "1");
    } catch {}
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/users?${qs}`, { cache: "no-store", signal: controller.signal });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || "request_failed");
        }
        const body = await res.json().catch(() => ({})) as { items?: UserRow[] };
        setRows(body.items ?? []);
        setError("");
      } catch {
        setError("فهرست کاربران/مصرف در حال حاضر در دسترس نیست.");
      } finally { setLoading(false); }
    }
    if (!demo) void load();
    return () => controller.abort();
  }, [qs, demo]);

  const number = new Intl.NumberFormat("fa-IR");

  return (
    <AdminShell title="فهرست کاربران" subtitle="مصرف توکن‌ها و فعالیت">
      <div className="mb-3 flex items-center justify-between gap-3 px-1 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="rounded-xl border border-separator px-3 py-2" onClick={() => {
            const d = new Date(); const iso = tehranDateString(d); setFrom(iso); setTo(iso);
          }}>امروز</button>
          <button type="button" className="rounded-xl border border-separator px-3 py-2" onClick={() => {
            const d = new Date(); d.setDate(d.getDate() - 1); const iso = tehranDateString(d); setFrom(iso); setTo(iso);
          }}>دیروز</button>
          <button type="button" className="rounded-xl border border-separator px-3 py-2" onClick={() => {
            const end = new Date(); const start = new Date(); start.setDate(end.getDate() - 6);
            setFrom(tehranDateString(start)); setTo(tehranDateString(end));
          }}>۷ روز گذشته</button>
          <span className="rounded-xl bg-surface-secondary px-3 py-2 text-muted">بازهٔ دلخواه:</span>
          <label className="flex items-center gap-2">
            از<input type="date" className="h-8 rounded-xl border border-separator bg-surface px-2" value={from} onChange={(e: ChangeEvent<HTMLInputElement>) => setFrom(e.target.value)} />
          </label>
          <label className="flex items-center gap-2">
            تا<input type="date" className="h-8 rounded-xl border border-separator bg-surface px-2" value={to} onChange={(e: ChangeEvent<HTMLInputElement>) => setTo(e.target.value)} />
          </label>
          <input placeholder="مدل" className="h-8 rounded-xl border border-separator bg-surface px-2" value={model} onChange={(e) => setModel(e.target.value)} />
          <input placeholder="منبع" className="h-8 rounded-xl border border-separator bg-surface px-2" value={channel} onChange={(e) => setChannel(e.target.value)} />
          <input placeholder="جست‌وجو (نام نمایشی)" className="h-8 rounded-xl border border-separator bg-surface px-2" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="h-8 rounded-xl border border-separator bg-surface px-2" value={sort} onChange={(e) => setSort(e.target.value as any)}>
            <option value="">مرتب‌سازی</option>
            <option value="tokens">توکن</option>
            <option value="ai_calls">تماس‌های AI</option>
            <option value="messages">پیام‌ها</option>
            <option value="cost">هزینه</option>
          </select>
          <select className="h-8 rounded-xl border border-separator bg-surface px-2" value={order} onChange={(e) => setOrder(e.target.value as any)}>
            <option value="desc">نزولی</option>
            <option value="asc">صعودی</option>
          </select>
          <label className="flex items-center gap-2">
            صفحه<input type="number" min={1} className="h-8 w-16 rounded-xl border border-separator bg-surface px-2" value={page} onChange={(e) => setPage(Number(e.target.value) || 1)} />
          </label>
          <label className="flex items-center gap-2">
            اندازه<select className="h-8 rounded-xl border border-separator bg-surface px-2" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
              {[25, 50, 100, 200].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        </div>
        {demo && <span className="rounded-xl bg-warning/20 px-3 py-1 text-warning">نمونهٔ آزمایشی</span>}
      </div>
      <Card className="overflow-x-auto rounded-2xl border border-separator bg-surface p-0">
        <table className="min-w-full text-right text-sm">
          <thead className="sticky top-0 bg-surface-secondary">
            <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:font-semibold [&>th]:text-muted">
              <th>شناسه</th>
              <th>نام نمایشی</th>
              <th>پیام‌ها</th>
              <th>تماس‌های AI</th>
              <th>توکن ورودی</th>
              <th>توکن خروجی</th>
              <th>کل توکن</th>
              <th>هزینه (USD)</th>
            </tr>
          </thead>
          <tbody className="[&>tr:nth-child(even)]:bg-surface-secondary/40">
            {demo && rows.length === 0 && (
              <>
                {[
                  { user_id: "u_1", display_name: "کاربر نمونه ۱", messages: 34, ai_calls: 12, prompt_tokens: 300, completion_tokens: 450, tokens: 750, provider_cost_usd: 0.23 },
                  { user_id: "u_2", display_name: "ali@example.com", messages: 20, ai_calls: 8, prompt_tokens: 120, completion_tokens: 200, tokens: 320, provider_cost_usd: null },
                ].map((r) => (
                  <tr key={r.user_id}>
                    <td className="px-4 py-3 font-mono text-xs">{r.user_id}</td>
                    <td className="px-4 py-3">{r.display_name ?? "—"}</td>
                    <td className="px-4 py-3 tabular-nums">{number.format(r.messages ?? 0)}</td>
                    <td className="px-4 py-3 tabular-nums">{number.format(r.ai_calls ?? 0)}</td>
                    <td className="px-4 py-3 tabular-nums">{number.format(r.prompt_tokens ?? 0)}</td>
                    <td className="px-4 py-3 tabular-nums">{number.format(r.completion_tokens ?? 0)}</td>
                    <td className="px-4 py-3 tabular-nums">{number.format(r.tokens ?? 0)}</td>
                    <td className="px-4 py-3">{r.provider_cost_usd == null ? "—" : `$${r.provider_cost_usd}`}</td>
                  </tr>
                ))}
              </>
            )}
            {!demo && rows.map((r) => (
              <tr key={r.user_id}>
                <td className="px-4 py-3 font-mono text-xs">{r.user_id}</td>
                <td className="px-4 py-3">{r.display_name ?? "—"}</td>
                <td className="px-4 py-3 tabular-nums">{r.messages == null ? "—" : number.format(r.messages)}</td>
                <td className="px-4 py-3 tabular-nums">{r.ai_calls == null ? "—" : number.format(r.ai_calls)}</td>
                <td className="px-4 py-3 tabular-nums">{r.prompt_tokens == null ? "—" : number.format(r.prompt_tokens)}</td>
                <td className="px-4 py-3 tabular-nums">{r.completion_tokens == null ? "—" : number.format(r.completion_tokens)}</td>
                <td className="px-4 py-3 tabular-nums">{r.tokens == null ? "—" : number.format(r.tokens)}</td>
                <td className="px-4 py-3">{r.provider_cost_usd == null ? "—" : `$${r.provider_cost_usd}`}</td>
              </tr>
            ))}
            {!loading && !demo && rows.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-muted">داده‌ای برای نمایش نیست.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
      {error && <p className="mt-3 text-xs text-warning">دادهٔ کاربران/مصرف در حال حاضر در دسترس نیست.</p>}
    </AdminShell>
  );
}

