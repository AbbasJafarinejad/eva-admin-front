import { apiErrorResponse, requestAdminApi } from "@/lib/admin-api";
import { hasAdminSession } from "@/lib/session";

type JsonValue = null | string | number | boolean | JsonValue[] | { [k: string]: JsonValue };

function redactString(value: string): string {
  let v = value;
  // Mask common secret patterns
  v = v.replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, "sk-****");
  v = v.replace(/\bBearer\s+[A-Za-z0-9._-]+\b/gi, "Bearer ****");
  v = v.replace(/\b(api[_-]?key)\s*[:=]\s*["']?([A-Za-z0-9._-]+)["']?/gi, "$1: ****");
  v = v.replace(/\b(authorization)\s*[:=]\s*["']?([A-Za-z0-9._\-\s]+)["']?/gi, "$1: ****");
  v = v.replace(/\b(password|pwd)\s*[:=]\s*["']?([^"\s]+)["']?/gi, "$1: ****");
  v = v.replace(/\b(token)\s*[:=]\s*["']?([^"\s]+)["']?/gi, "$1: ****");
  v = v.replace(/-----BEGIN [^-]+ PRIVATE KEY-----[\s\S]+?-----END [^-]+ PRIVATE KEY-----/g, "-----REDACTED PRIVATE KEY-----");
  return v;
}

function redactDeep(data: JsonValue): JsonValue {
  if (typeof data === "string") return redactString(data);
  if (Array.isArray(data)) return data.map((v) => redactDeep(v)) as JsonValue;
  if (data && typeof data === "object") {
    const out: Record<string, JsonValue> = {};
    for (const [k, v] of Object.entries(data)) {
      // Avoid echoing raw HTML in any key that looks like HTML content
      if (typeof v === "string" && (k === "html" || v.includes("<script") || v.includes("</"))) {
        out[k] = redactString(v).replace(/</g, "&lt;").replace(/>/g, "&gt;");
      } else {
        out[k] = redactDeep(v as JsonValue);
      }
    }
    return out;
  }
  return data;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!(await hasAdminSession())) return Response.json({ error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    const allowSensitive =
      (process.env.ADMIN_ALLOW_SENSITIVE_VIEWS || "").toLowerCase() === "true" ||
      (process.env.ADMIN_ALLOW_SENSITIVE_VIEWS || "") === "1";
    if (!allowSensitive) return Response.json({ error: "sensitive_view_disabled" }, { status: 403, headers: { "Cache-Control": "no-store" } });
    const featureKey = process.env.ADMIN_FEATURE_KEY || "";
    if (featureKey.length < 16) return Response.json({ error: "feature_key_unconfigured" }, { status: 403, headers: { "Cache-Control": "no-store" } });
    const { id } = await context.params;
    if (!id) return Response.json({ error: "bad_request" }, { status: 400, headers: { "Cache-Control": "no-store" } });
    const upstream = await requestAdminApi(`v1/prompt-turns/${encodeURIComponent(id)}`, "", {
      headers: { "X-Admin-Feature-Key": featureKey },
    });
    const body = await upstream.json().catch(() => ({}));
    const redacted = redactDeep(body as JsonValue);
    return Response.json(redacted, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

