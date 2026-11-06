import { apiErrorResponse, requestAdminApi } from "@/lib/admin-api";
import { hasAdminSession } from "@/lib/session";

function parseYMD(value: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { y, mo, d };
}

function tehranStartEndUtc(from?: string, to?: string) {
  // Iran has no DST since 2022; Tehran offset is +03:30 year-round.
  const offsetMinutes = 210; // 3.5 hours
  const toUtcMs = (y: number, mo: number, d: number) => Date.UTC(y, mo - 1, d, 0, 0, 0) - offsetMinutes * 60_000;
  let startISO = "", endISO = "";
  const pf = from ? parseYMD(from) : null;
  const pt = to ? parseYMD(to) : null;
  if (pf) startISO = new Date(toUtcMs(pf.y, pf.mo, pf.d)).toISOString();
  const endLocal = pt
    ? new Date(Date.UTC(pt.y, pt.mo - 1, pt.d + 1, 0, 0, 0))
    : pf
      ? new Date(Date.UTC(pf.y, pf.mo - 1, pf.d + 1, 0, 0, 0))
      : null;
  if (endLocal) endISO = new Date(endLocal.getTime() - offsetMinutes * 60_000).toISOString();
  return { startISO, endISO };
}

function buildQuery(search: string) {
  const params = new URLSearchParams(search);
  const out = new URLSearchParams();
  const allow = new Set(["from", "to", "source", "model", "status", "silence", "content", "format"]);
  for (const [k, v] of params.entries()) {
    if (!v || !allow.has(k)) continue;
    out.set(k, v);
  }
  if (!out.get("content")) out.set("content", "meta");
  if (!out.get("format")) out.set("format", "jsonl");
  const { startISO, endISO } = tehranStartEndUtc(out.get("from") || undefined, out.get("to") || undefined);
  const fwd = new URLSearchParams();
  if (startISO) fwd.set("start", startISO);
  if (endISO) fwd.set("end", endISO);
  for (const k of ["source", "model", "status", "silence", "content", "format"] as const) {
    const v = out.get(k);
    if (v) fwd.set(k, v);
  }
  const qs = fwd.toString();
  return {
    query: qs ? `?${qs}` : "",
    start: startISO,
    end: endISO,
    content: out.get("content") || "meta",
    fromLocal: (out.get("from") || "").replaceAll("-", ""),
    toLocal: (out.get("to") || "").replaceAll("-", ""),
  };
}

function makeFilename(fromLocal: string, toLocal: string, content: string) {
  const s = fromLocal || "start";
  const e = toLocal || "end";
  const tag = content === "full" ? "full" : "meta";
  return `eva-prompt-logs-${s || "start"}-${e || "end"}-${tag}.zip`;
}

export async function GET(request: Request) {
  try {
    if (!(await hasAdminSession())) {
      return Response.json({ error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }
    const url = new URL(request.url);
    const { query, start, end, content, fromLocal, toLocal } = buildQuery(url.search);
    const headers: Record<string, string> = {};
    if (content === "full") {
      const featureKey = process.env.ADMIN_FEATURE_PROMPT_FULL_EXPORT_KEY || "";
      if (featureKey.length < 16) {
        return Response.json({ error: "feature_disabled" }, { status: 503, headers: { "Cache-Control": "no-store" } });
      }
      headers["X-Admin-Feature-Key"] = featureKey;
    }
    const upstream = await requestAdminApi("v1/prompt-logs/export", query, { signal: request.signal, headers });
    const filename = makeFilename(fromLocal, toLocal, content);
    // Propagate known export coverage headers if present (e.g., X-Export-Truncated, X-Export-Count)
    const xTruncated = upstream.headers.get("X-Export-Truncated") || "";
    const xCount = upstream.headers.get("X-Export-Count") || "";
    return new Response(upstream.body, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        ...(xTruncated ? { "X-Export-Truncated": xTruncated } : {}),
        ...(xCount ? { "X-Export-Count": xCount } : {}),
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

