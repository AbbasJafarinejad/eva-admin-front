import { apiErrorResponse, requestAdminApi } from "@/lib/admin-api";
import { hasAdminSession } from "@/lib/session";

function parseYMD(value?: string | null) {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { y, mo, d };
}

function buildQuery(search: string) {
  const params = new URLSearchParams(search);
  const out = new URLSearchParams();
  const allow = new Set(["from", "to", "days", "model", "channel", "q", "sort", "order", "page", "page_size"]);
  for (const [k, v] of params.entries()) if (v && allow.has(k)) out.set(k, v);
  // Tehran to UTC [start,end)
  const pf = parseYMD(out.get("from"));
  const pt = parseYMD(out.get("to"));
  const offsetMinutes = 210;
  const toUtcMs = (y: number, mo: number, d: number) => Date.UTC(y, mo - 1, d, 0, 0, 0) - offsetMinutes * 60_000;
  if (pf) out.set("start", new Date(toUtcMs(pf.y, pf.mo, pf.d)).toISOString());
  const endLocal = pt ? new Date(Date.UTC(pt.y, pt.mo - 1, pt.d + 1, 0, 0, 0)) : pf ? new Date(Date.UTC(pf.y, pf.mo - 1, pf.d + 1, 0, 0, 0)) : null;
  if (endLocal) out.set("end", new Date(endLocal.getTime() - offsetMinutes * 60_000).toISOString());
  out.delete("from"); out.delete("to");
  if (!out.get("page_size")) out.set("page_size", "50");
  if (!out.get("page")) out.set("page", "1");
  const qs = out.toString();
  return qs ? `?${qs}` : "";
}

export async function GET(request: Request) {
  try {
    if (!(await hasAdminSession())) return Response.json({ error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    const query = buildQuery(new URL(request.url).search);
    const upstream = await requestAdminApi("v1/users/usage", query, { signal: request.signal });
    // Pass through JSON; no-store to avoid caching user usage.
    const body = await upstream.json().catch(() => ({}));
    return Response.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

