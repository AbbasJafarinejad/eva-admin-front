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
    out.set(k, v);
  }
  if (!out.get("format")) out.set("format", "csv");
  if (!out.get("scope")) out.set("scope", "meta");
  // Build forwarded query excluding local-only fields
  const fwd = new URLSearchParams();
  const map: Record<string, string> = { from: "start", to: "end", channel: "source", status: "status", model: "model", silence: "silence", limit: "limit" };
  for (const [k, v] of out.entries()) {
    const key = map[k];
    if (key && v) fwd.set(key, v);
  }
  const qs = fwd.toString();
  return { local: out, forwarded: qs ? `?${qs}` : "" };
}

export async function GET(request: Request) {
  try {
    if (!(await hasAdminSession())) return Response.json({ error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    const { search } = new URL(request.url);
    const { local, forwarded } = buildQuery(search);
    const fmt = local.get("format") || "csv";
    const scope = local.get("scope") || "meta";
    // Backend currently supports metadata exports only; deny anything else.
    if (scope !== "meta") {
      return Response.json({ error: "unsupported_export_scope" }, { status: 403, headers: { "Cache-Control": "no-store" } });
    }
    // Stream through; let backend decide row set and truncation. Use v1 endpoints.
    const path = fmt === "csv" ? "v1/prompt-turns.csv" : "v1/prompt-turns.jsonl";
    const upstream = await requestAdminApi(path, `${forwarded}`, { signal: request.signal });
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

