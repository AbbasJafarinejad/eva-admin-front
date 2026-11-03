import { hasAdminSession } from "@/lib/session";

export async function GET() {
  if (!(await hasAdminSession())) return Response.json({ error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const base = (process.env.ADMIN_BACKEND_URL || "").replace(/\/$/, "");
  if (!base) return Response.json({ error: "admin_not_configured" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  try {
    const upstream = await fetch(`${base}/health`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    const body = await upstream.json().catch(() => ({}));
    return Response.json(body, { status: upstream.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
