"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card } from "@heroui/react";
import {
  ArrowClockwise,
  ChatCircleDots,
  Clock,
  Coin,
  DownloadSimple,
  Robot,
  SignOut,
  UsersThree,
  WarningCircle,
} from "@phosphor-icons/react";

type Overview = {
  period_days: number;
  users_total: number;
  active_users: number;
  rooms_total: number;
  messages_total: number;
  ai_calls: number;
  tokens_total: number;
  latency_avg_ms: number;
  provider_cost_usd: number | null;
  cost_is_estimated: boolean;
  silent_ai_calls: number;
  silent_ai_share: number;
  rooms_by_channel: Record<string, number>;
};
type Health = { status?: string; db?: string };

const number = new Intl.NumberFormat("fa-IR");
const money = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 4 });

function downloadMessage(code: string) {
  if (code === "prompt_logs_disabled") return "ثبت لاگ پرامپت روی سرور خاموش است.";
  if (code === "prompt_logs_not_found") return "هنوز فایل لاگی برای دانلود وجود ندارد.";
  if (code === "backend_unavailable" || code === "admin_not_configured" || code === "endpoint_unavailable") {
    return "ارتباط با بک‌اند برای دانلود برقرار نشد.";
  }
  if (code === "unauthorized") return "نشست منقضی شده؛ دوباره وارد شو.";
  return "دانلود لاگ انجام نشد. دوباره تلاش کن.";
}

export function Dashboard() {
  const [days, setDays] = useState(() => {
    if (typeof window === "undefined") return 30;
    const value = Number(new URLSearchParams(window.location.search).get("days") || 30);
    return value === 7 || value === 30 || value === 90 ? value : 30;
  });
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);

  async function downloadPromptLogs() {
    setDownloading(true);
    setDownloadError("");
    try {
      const response = await fetch("/api/admin/prompt-logs", { cache: "no-store" });
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!response.ok) {
        let code = "request_failed";
        try {
          const body = (await response.json()) as { error?: string };
          if (body.error) code = body.error;
        } catch {
          /* ignore */
        }
        setDownloadError(downloadMessage(code));
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "eva-prompt-logs.zip";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError(downloadMessage("request_failed"));
    } finally {
      setDownloading(false);
    }
  }

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [response, healthResponse] = await Promise.all([
        fetch(`/api/admin/overview?days=${days}`, { cache: "no-store" }),
        fetch("/api/admin/health", { cache: "no-store" }),
      ]);
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!response.ok) throw new Error("overview_unavailable");
      setData((await response.json()) as Overview);
      setHealth(healthResponse.ok ? ((await healthResponse.json()) as Health) : { status: "unavailable" });
      setError("");
      const url = new URL(window.location.href);
      url.searchParams.set("days", String(days));
      window.history.replaceState(null, "", url);
    } catch {
      setError("آمار از سرور دریافت نشد. ارتباط بک‌اند را بررسی کن.");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 60_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/login");
  }

  const cards = [
    {
      title: "کل کاربران",
      value: data ? number.format(data.users_total) : "—",
      hint: `فعال در ${number.format(days)} روز: ${number.format(data?.active_users ?? 0)}`,
      Icon: UsersThree,
    },
    {
      title: "گفت‌وگوها",
      value: data ? number.format(data.rooms_total) : "—",
      hint: `${number.format(data?.messages_total ?? 0)} پیام`,
      Icon: ChatCircleDots,
    },
    {
      title: "درخواست‌های هوش مصنوعی",
      value: data ? number.format(data.ai_calls) : "—",
      hint: `${number.format(data?.tokens_total ?? 0)} توکن`,
      Icon: Robot,
    },
    {
      title: "هزینه",
      value: data?.provider_cost_usd == null ? "ثبت نشده" : `$${money.format(data.provider_cost_usd)}`,
      hint:
        data?.provider_cost_usd == null
          ? "هنوز هزینه‌ای برای این بازه ثبت نشده"
          : data.cost_is_estimated
            ? "شامل تخمین بر اساس نرخ مدل"
            : "بر اساس هزینهٔ گزارش‌شدهٔ ارائه‌دهنده",
      Icon: Coin,
    },
    {
      title: "پاسخ بی‌صدا",
      value: data ? `${number.format(Number(data.silent_ai_share.toFixed(1)))}٪` : "—",
      hint: `${number.format(data?.silent_ai_calls ?? 0)} مورد`,
      Icon: WarningCircle,
    },
    {
      title: "میانگین پاسخ",
      value: data ? `${number.format(data.latency_avg_ms)} ms` : "—",
      hint: "زمان پاسخ هوش مصنوعی",
      Icon: Clock,
    },
  ];

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-end gap-2">
        <select
          aria-label="بازهٔ زمانی"
          value={days}
          onChange={(event) => setDays(Number(event.target.value))}
          className="h-10 rounded-xl border border-separator bg-surface px-3 text-sm"
        >
          <option value={7}>۷ روز</option>
          <option value={30}>۳۰ روز</option>
          <option value={90}>۹۰ روز</option>
        </select>
        <Button isIconOnly variant="secondary" aria-label="تازه‌سازی" onPress={() => void refresh()} className="size-10 rounded-xl">
          <ArrowClockwise size={18} />
        </Button>
        <Button isIconOnly variant="ghost" aria-label="خروج" onPress={() => void logout()} className="size-10 rounded-xl">
          <SignOut size={18} />
        </Button>
      </div>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <p className="text-sm text-muted">آمار کلی؛ مصرف و فعالیت {number.format(days)} روز گذشته</p>
        <div className="flex flex-wrap gap-2">
          <a
            href="/turns"
            className="inline-flex h-10 items-center rounded-xl border border-separator bg-surface px-4 text-sm font-semibold transition hover:border-accent/50"
          >
            لاگ‌ها و خروجی‌ها
          </a>
          <a
            href={`/ai-usage?days=${days}`}
            className="inline-flex h-10 items-center rounded-xl border border-separator bg-surface px-4 text-sm font-semibold transition hover:border-accent/50"
          >
            مصرف هوش مصنوعی
          </a>
          <Button
            onPress={() => void downloadPromptLogs()}
            isDisabled={downloading}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-bold text-white"
          >
            <DownloadSimple size={18} />
            {downloading ? "در حال دانلود…" : "دانلود لاگ پرامپت"}
          </Button>
        </div>
      </div>
      <Card className="mb-5 flex-row flex-wrap items-center gap-3 rounded-2xl border border-separator bg-surface p-4 text-sm">
        <span className={`size-2.5 rounded-full ${health?.status === "ok" ? "bg-success" : "bg-danger"}`} />
        <span className="font-bold">وضعیت سرویس:</span>
        <span>API {health?.status === "ok" ? "سالم" : "بررسی لازم"}</span>
        <span className="text-muted">·</span>
        <span>پایگاه داده {health?.db === "ok" ? "سالم" : "بررسی لازم"}</span>
        <span className="mr-auto text-xs text-muted">به‌روزرسانی خودکار هر دقیقه</span>
      </Card>
      {error && <div role="alert" className="mb-5 rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm">{error}</div>}
      {downloadError && (
        <div role="alert" className="mb-5 rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm">
          {downloadError}
        </div>
      )}
      <div aria-live="polite" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ title, value, hint, Icon }) => (
          <Card key={title} className="gap-4 rounded-2xl border border-separator bg-surface p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-muted">{title}</p>
              <span className="grid size-10 place-items-center rounded-xl bg-accent/10 text-accent">
                <Icon size={21} weight="duotone" />
              </span>
            </div>
            <div>
              <p className="text-2xl font-black tabular-nums">{loading && !data ? "…" : value}</p>
              <p className="mt-1 text-xs text-muted">{hint}</p>
            </div>
          </Card>
        ))}
      </div>
      <Card className="mt-5 gap-3 rounded-2xl border border-separator bg-surface p-5">
        <h2 className="font-bold">کانال‌های گفت‌وگو</h2>
        <div className="flex flex-wrap gap-3">
          {Object.entries(data?.rooms_by_channel ?? {}).map(([channel, count]) => (
            <span key={channel} className="rounded-xl bg-surface-secondary px-4 py-2 text-sm">
              {channel}: <b>{number.format(count)}</b>
            </span>
          ))}
          {!Object.keys(data?.rooms_by_channel ?? {}).length && (
            <p className="text-sm text-muted">داده‌ای برای نمایش نیست.</p>
          )}
        </div>
      </Card>
      <p className="mt-6 text-xs leading-6 text-muted">
        لاگ پرامپت می‌تواند متن خصوصی گفت‌وگوهای کاربران را داشته باشد. فایل دانلودشده را فقط در جای امن نگه دار.
      </p>
    </div>
  );
}
