import { redirect } from "next/navigation";
import { hasAdminSession } from "@/lib/session";
import { UsageTable } from "@/components/usage-table";
import { AdminShell } from "@/components/admin-shell";

export const dynamic = "force-dynamic";
export default async function AIUsagePage() {
  if (!(await hasAdminSession())) redirect("/login");
  return <AdminShell title="مصرف و هزینه" subtitle="هزینه و تعداد درخواست‌ها"><UsageTable /></AdminShell>;
}
