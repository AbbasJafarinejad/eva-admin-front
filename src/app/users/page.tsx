import { redirect } from "next/navigation";
import { hasAdminSession } from "@/lib/session";
import { AdminShell } from "@/components/admin-shell";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  if (!(await hasAdminSession())) redirect("/login");
  return (
    <AdminShell title="کاربران" subtitle="نمای کلی کاربران">
      <div className="rounded-2xl border border-separator bg-surface p-5 text-sm">
        <p className="text-muted">پشتیبانی از فهرست کاربران/فعال‌سازی/نرخ نگهداشت در API نهایی در حال آماده‌سازی است. در حال حاضر دادهٔ قابل‌اتکا برای این بخش از بک‌اند در دسترس نیست.</p>
      </div>
    </AdminShell>
  );
}

