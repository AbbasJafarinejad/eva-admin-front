"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import { AdminShell } from "@/components/admin-shell";

function backupMessage(code: string) {
  if (code === "feature_disabled" || code === "feature_not_configured") {
    return "قابلیت پشتیبان روی سرور فعال نیست. کلید ADMIN_FEATURE_FULL_BACKUP_KEY را تنظیم کن.";
  }
  if (code === "invalid_backup_key") {
    return "رمز پشتیبان باید حداقل ۱۶ کاراکتر باشد.";
  }
  if (code === "pg_dump_not_available" || code === "pg_dump_failed") {
    return "ابزار pg_dump روی سرور در دسترس نیست یا خطا داد.";
  }
  if (code === "backend_unavailable" || code === "admin_not_configured") {
    return "ارتباط با بک‌اند برقرار نشد.";
  }
  if (code === "forbidden") return "مجوز پشتیبان‌گیری رد شد.";
  return "ایجاد پشتیبان انجام نشد. دوباره تلاش کن.";
}

export default function BackupsPage() {
  const [passphrase, setPassphrase] = useState("");
  const [includeLogs, setIncludeLogs] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [lastOk, setLastOk] = useState("");

  async function createBackup() {
    setCreating(true);
    setError("");
    setLastOk("");
    try {
      const response = await fetch(
        `/api/admin/backup?include_logs=${includeLogs ? "true" : "false"}`,
        {
          method: "POST",
          headers: { "X-Admin-Backup-Key": passphrase },
          cache: "no-store",
        },
      );
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
        setError(backupMessage(code));
        return;
      }
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match?.[1] || "eva-backup.eva.enc";
      const nonce = response.headers.get("X-Backup-Nonce") || "";
      const tag = response.headers.get("X-Backup-Tag") || "";
      const alg = response.headers.get("X-Backup-Alg") || "AES-256-GCM";
      if (!nonce || !tag) {
        setError("فایل رمزگذاری شد ولی nonce/tag برنگشت؛ بدون آن‌ها بازیابی ممکن نیست.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      // AES-GCM ciphertext alone is useless; keep nonce/tag beside the .enc file.
      const metaName = filename.replace(/\.eva\.enc$/i, "") + ".meta.json";
      const metaBlob = new Blob(
        [JSON.stringify({ alg, nonce, tag, ciphertext: filename }, null, 2)],
        { type: "application/json" },
      );
      const metaUrl = URL.createObjectURL(metaBlob);
      const metaLink = document.createElement("a");
      metaLink.href = metaUrl;
      metaLink.download = metaName;
      document.body.appendChild(metaLink);
      metaLink.click();
      metaLink.remove();
      URL.revokeObjectURL(metaUrl);
      setLastOk(`دانلود شد: ${filename} + ${metaName} (هر دو را نگه دار)`);
    } catch {
      setError(backupMessage("request_failed"));
    } finally {
      setCreating(false);
    }
  }

  return (
    <AdminShell title="پشتیبان‌ها" subtitle="پشتیبان‌گیری رمزگذاری‌شده از پایگاه داده و لاگ‌ها">
      <div className="space-y-4 rounded-2xl border border-separator bg-surface p-5 text-sm">
        <p className="text-muted">
          خروجی به‌صورت فایل رمزگذاری‌شده AES-256-GCM به‌همراه یک فایل{" "}
          <code className="text-xs">.meta.json</code> (حاوی nonce/tag) دانلود می‌شود. بدون هر دو فایل و
          رمز پشتیبان، بازیابی ممکن نیست. رمز روی سرور ذخیره نمی‌شود؛ هر سه را جای امن نگه دار.
        </p>
        <label className="grid gap-2">
          <span className="font-semibold">رمز پشتیبان (حداقل ۱۶ کاراکتر)</span>
          <input
            type="password"
            autoComplete="new-password"
            value={passphrase}
            onChange={(event) => setPassphrase(event.target.value)}
            className="h-11 rounded-xl border border-separator bg-background px-3"
            placeholder="رمز قوی برای رمزگشایی بعدی"
          />
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={includeLogs}
            onChange={(event) => setIncludeLogs(event.target.checked)}
          />
          <span>لاگ پرامپت را هم داخل پشتیبان بگذار</span>
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onPress={() => void createBackup()}
            isDisabled={creating || passphrase.length < 16}
            className="rounded-xl bg-accent px-4 py-2 font-bold text-white"
          >
            {creating ? "در حال ساخت…" : "ایجاد و دانلود پشتیبان"}
          </Button>
          <span className="text-xs text-muted">کلید قابلیت فقط سمت سرور است؛ رمز را خودت انتخاب می‌کنی.</span>
        </div>
        {error && (
          <div role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-danger">
            {error}
          </div>
        )}
        {lastOk && (
          <div className="rounded-xl border border-success/30 bg-success/10 p-3 text-success">{lastOk}</div>
        )}
      </div>
    </AdminShell>
  );
}
