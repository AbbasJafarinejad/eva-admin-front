import { redirect } from "next/navigation";
import { hasAdminSession } from "@/lib/session";
import { Dashboard } from "@/components/dashboard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!(await hasAdminSession())) redirect("/login");
  return <Dashboard />;
}
