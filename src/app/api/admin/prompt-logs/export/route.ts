import { apiErrorResponse, requestAdminApi } from "@/lib/admin-api";
import { hasAdminSession } from "@/lib/session";

function buildQuery(search: string) {
  const params = new URLSearchParams(search);
  const out = new URLSearchParams();
  const allow = new Set(["from", "to", "source", "model", "status", "silence", "content", "format"]);
  for (const [k, v] of params.entries()) {
    if (!v || !allow.has(k)) continue;
    if (k === "from") out.set("start", v);
    else if (k === "to") out.set("end", v);
    else out.set(k, v);
  }
  if (!out.get("content")) out.set("content", "meta");
  if (!out.get("format")) out.set("format", "jsonl");
  const qs = out.toString();
  return { query: qs ? `?${qs}` : "", start: out.get("start") || "", end: out.get("end") || "" };
}

function makeFilename(start: string, end: string, content: string) {
  const s = (start || "").replaceAll("-", "");
  const e = (end || "").replaceAll("-", "");
  const tag = content === "full" ? "full" : "meta";
  return `eva-prompt-logs-${s || "start"}-${e || "end"}-${tag}.zip`;
}

export async function GET(request: Request) {
  try {
    if (!(await hasAdminSession())) {
      return Response.json({ error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }
    const url = new URL(request.url);
    const { query, start, end } = buildQuery(url.search);
    const content = new URLSearchParams(query.slice(1)).get("content") || "meta";
    const headers: Record<string, string> = {};
    if (content === "full") {
      const featureKey = process.env.ADMIN_FEATURE_PROMPT_FULL_EXPORT_KEY || "";
      if (featureKey.length < 16) {
        return Response.json({ error: "feature_disabled" }, { status: 503, headers: { "Cache-Control": "no-store" } });
      }
      headers["X-Admin-Feature-Key"] = featureKey;
    }
    const upstream = await requestAdminApi("v1/prompt-logs/export", query, { signal: request.signal, headers });
    const filename = makeFilename(start, end, content);
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

