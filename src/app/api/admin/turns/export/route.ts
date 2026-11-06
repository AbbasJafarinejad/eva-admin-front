import { apiErrorResponse, requestAdminApi } from "@/lib/admin-api";
import { hasAdminSession } from "@/lib/session";

const allowSensitiveExport =
  (process.env.ADMIN_ALLOW_SENSITIVE_EXPORTS || "").toLowerCase() === "true" ||
  (process.env.ADMIN_ALLOW_SENSITIVE_EXPORTS || "") === "1";

function buildQuery(search: string) {
  const params = new URLSearchParams(search);
  const out = new URLSearchParams();
  const allow = new Set(["from", "to", "channel", "status", "model", "silence", "limit", "scope", "format"]);
  for (const [k, v] of params.entries()) {
    if (!v || !allow.has(k)) continue;
    // Map to backend field names
    if (k === "from") out.set("start", v);
    else if (k === "to") out.set("end", v);
    else if (k === "channel") out.set("source", v);
    else out.set(k, v);
  }
  if (!out.get("format")) out.set("format", "csv");
  if (!out.get("scope")) out.set("scope", "meta");
  const qs = out.toString();
  return qs ? `?${qs}` : "";
}

export async function GET(request: Request) {
  try {
    if (!(await hasAdminSession())) return Response.json({ error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    const { search } = new URL(request.url);
    const query = buildQuery(search);
    const fmt = new URLSearchParams(query.slice(1)).get("format") || "csv";
    const scope = new URLSearchParams(query.slice(1)).get("scope") || "meta";
    // Backend currently supports metadata exports only; deny anything else.
    if (scope !== "meta") {
      return Response.json({ error: "unsupported_export_scope" }, { status: 403, headers: { "Cache-Control": "no-store" } });
    }
    // Stream through; let backend decide row set and truncation. Use v1 endpoints.
    const path = fmt === "csv" ? "v1/prompt-turns.csv" : "v1/prompt-turns.jsonl";
    const upstream = await requestAdminApi(path, `${query}`, { signal: request.signal });
    const contentType = fmt === "csv" ? "text/csv; charset=utf-8" : "application/x-ndjson; charset=utf-8";
    const filename = `eva-turns.${fmt === "csv" ? "csv" : "jsonl"}`;
    // Propagate X-Export-Truncated for visibility
    const truncated = upstream.headers.get("X-Export-Truncated") || "";
    return new Response(upstream.body, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        ...(truncated ? { "X-Export-Truncated": truncated } : {}),
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

