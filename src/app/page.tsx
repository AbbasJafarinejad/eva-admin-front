import { redirect } from "next/navigation";
import { hasAdminSession } from "@/lib/session";
import { Dashboard } from "@/components/dashboard";
import { AdminShell } from "@/components/admin-shell";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!(await hasAdminSession())) redirect("/login");
  return <AdminShell title="نمای کلی" subtitle="سلامت و آمار ایوا"><Dashboard /></AdminShell>;
}
