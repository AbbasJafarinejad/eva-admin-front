import { apiErrorResponse, requestAdminApi } from "@/lib/admin-api";
import { hasAdminSession } from "@/lib/session";

function buildQuery(search: string) {
  const params = new URLSearchParams(search);
  const out = new URLSearchParams();
  // Forward only supported, non-sensitive filters to backend
  const allow = new Set(["page", "page_size", "from", "to", "channel", "status", "model"]);
  for (const [k, v] of params.entries()) {
    if (allow.has(k) && v) out.set(k, v);
  }
  const qs = out.toString();
  return qs ? `?${qs}` : "";
}

type JsonValue = null | string | number | boolean | JsonValue[] | { [k: string]: JsonValue };

function stripSensitiveFromItem(item: Record<string, JsonValue>) {
  const clone: Record<string, JsonValue> = {};
  const sensitiveKeys = new Set(["prompt", "response", "messages", "input", "output", "content", "trace", "raw", "html"]);
  for (const [k, v] of Object.entries(item)) {
    if (sensitiveKeys.has(k)) continue;
    if (typeof v === "string" && v.length > 512) continue; // avoid large text blobs in list
    clone[k] = v;
  }
  return clone;
}

function sanitizeListPayload(payload: unknown): unknown {
  if (Array.isArray(payload)) {
    return payload.map((v) => (v && typeof v === "object" ? stripSensitiveFromItem(v as Record<string, JsonValue>) : v));
  }
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.items)) {
      return {
        ...obj,
        items: obj.items.map((v) =>
          v && typeof v === "object" ? stripSensitiveFromItem(v as Record<string, JsonValue>) : v
        ),
      };
    }
  }
  return payload;
}

export async function GET(request: Request) {
  try {
    if (!(await hasAdminSession())) return Response.json({ error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    const search = new URL(request.url).search;
    const query = buildQuery(search);
    const upstream = await requestAdminApi("turns", query, { signal: request.signal });
    const body = await upstream.json().catch(() => ({}));
    const sanitized = sanitizeListPayload(body);
    return Response.json(sanitized, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

