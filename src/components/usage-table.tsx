"use client";

import { useEffect, useState } from "react";
import { Card } from "@heroui/react";

type Row = { day: string; model: string; calls: number; tokens: number; prompt_tokens: number; completion_tokens: number; latency_avg_ms: number; provider_cost_usd: number | null };
const fmt = new Intl.NumberFormat("fa-IR");

export function UsageTable() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { fetch("/api/admin/ai-usage?days=30", { cache: "no-store" }).then(async (r) => { if (r.status === 401) { window.location.assign("/login"); return []; } if (!r.ok) throw new Error(); return r.json() as Promise<Row[]>; }).then(setRows).catch(() => setError("دادهٔ مصرف دریافت نشد.")); }, []);
  return <main className="mx-auto min-h-dvh max-w-7xl px-5 py-8 sm:px-8">
    <a href="/" className="text-sm font-semibold text-accent">← بازگشت به نمای کلی</a>
    <h1 className="mt-4 text-2xl font-black">مصرف هوش مصنوعی</h1><p className="mt-2 text-sm text-muted">هزینه و تعداد درخواست‌ها در ۳۰ روز گذشته</p>
    {error && <p role="alert" className="mt-5 text-danger">{error}</p>}
    <Card className="mt-6 overflow-x-auto rounded-2xl border border-separator bg-surface p-2">
      <table className="w-full min-w-[760px] text-right text-sm"><thead className="text-muted"><tr>{["روز", "مدل", "درخواست", "ورودی", "خروجی", "کل توکن", "میانگین زمان", "هزینهٔ ثبت‌شده"].map((h) => <th key={h} className="border-b border-separator px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
        <tbody>{rows.map((row, i) => <tr key={`${row.day}-${row.model}-${i}`} className="border-b border-separator last:border-0"><td className="px-4 py-3">{row.day}</td><td className="px-4 py-3">{row.model}</td><td className="px-4 py-3">{fmt.format(row.calls)}</td><td className="px-4 py-3">{fmt.format(row.prompt_tokens)}</td><td className="px-4 py-3">{fmt.format(row.completion_tokens)}</td><td className="px-4 py-3">{fmt.format(row.tokens)}</td><td className="px-4 py-3">{fmt.format(row.latency_avg_ms)} ms</td><td className="px-4 py-3">{row.provider_cost_usd == null ? "—" : `$${row.provider_cost_usd}`}</td></tr>)}
          {!rows.length && !error && <tr><td colSpan={8} className="px-4 py-10 text-center text-muted">در حال دریافت…</td></tr>}</tbody>
      </table>
    </Card>
  </main>;
}
