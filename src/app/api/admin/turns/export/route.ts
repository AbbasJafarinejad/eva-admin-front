import { apiErrorResponse, requestAdminApi } from "@/lib/admin-api";
import { hasAdminSession } from "@/lib/session";

const allowSensitiveExport =
  (process.env.ADMIN_ALLOW_SENSITIVE_EXPORTS || "").toLowerCase() === "true" ||
  (process.env.ADMIN_ALLOW_SENSITIVE_EXPORTS || "") === "1";

function buildQuery(search: string) {
  const params = new URLSearchParams(search);
  const out = new URLSearchParams();
  const allow = new Set(["from", "to", "channel", "status", "model", "page", "page_size", "scope", "format"]);
  for (const [k, v] of params.entries()) {
    if (allow.has(k) && v) out.set(k, v);
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
    if (scope !== "meta" && !allowSensitiveExport) {
      return Response.json({ error: "sensitive_export_disabled" }, { status: 403, headers: { "Cache-Control": "no-store" } });
    }
    // Stream through; let backend decide row set and redaction
    const upstream = await requestAdminApi("turns", `/export${query}`, { signal: request.signal });
    const contentType = fmt === "csv" ? "text/csv; charset=utf-8" : "application/x-ndjson; charset=utf-8";
    const filename = `eva-turns.${fmt === "csv" ? "csv" : "jsonl"}`;
    return new Response(upstream.body, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

