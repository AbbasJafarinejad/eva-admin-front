/* eslint-disable @next/next/no-img-element */
"use client";

import { AdminShell } from "@/components/admin-shell";
import { useState } from "react";

export default function BackupsPage() {
  const [creating, setCreating] = useState(false);
  // Placeholder UI — no API calls yet; awaits backend contract for create/status/download
  return (
    <AdminShell title="پشتیبان‌ها" subtitle="پشتیبان‌گیری امن و قابل بازیابی">
      <div className="space-y-4 rounded-2xl border border-separator bg-surface p-5 text-sm">
        <p className="text-muted">
          پشتیبان‌گیری کامل با رمزنگاری در حال پیاده‌سازی سمت سرور است. این بخش ایجاد/وضعیت/دانلود پشتیبان رمزگذاری‌شده، بازهٔ پوشش و نگهداشت را پس از آماده‌شدن API نمایش می‌دهد.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            aria-disabled="true"
            disabled
            className="cursor-not-allowed rounded-xl border border-separator bg-surface-secondary px-4 py-2 font-semibold text-muted"
            title="به‌زودی با قرارداد بک‌اند؛ اجرای پشتیبان‌گیری تنها با کلیک آگاهانه کاربر"
            onClick={() => setCreating(true)}
          >
            ایجاد پشتیبان جدید
          </button>
          <span className="text-xs text-warning">فاقد API فعال · بدون بارگذاری در مرورگر · کلید/رمز هرگز سمت کاربر</span>
        </div>
        <div className="rounded-xl border border-separator p-4">
          <p className="font-bold">آخرین وضعیت</p>
          <ul className="mt-2 space-y-1 text-muted">
            <li>آخرین موفق: —</li>
            <li>اندازهٔ تقریبی: —</li>
            <li>پوشش بازه: —</li>
            <li>خطا/گزارش: —</li>
          </ul>
        </div>
      </div>
    </AdminShell>
  );
}

