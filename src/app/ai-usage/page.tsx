import { redirect } from "next/navigation";
import { hasAdminSession } from "@/lib/session";
import { UsageTable } from "@/components/usage-table";

export const dynamic = "force-dynamic";
export default async function AIUsagePage() {
  if (!(await hasAdminSession())) redirect("/login");
  return <UsageTable />;
}
