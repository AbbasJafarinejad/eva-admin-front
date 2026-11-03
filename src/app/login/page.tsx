import { redirect } from "next/navigation";
import { hasAdminSession } from "@/lib/session";
import { LoginForm } from "@/components/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await hasAdminSession()) redirect("/");
  return <LoginForm />;
}
