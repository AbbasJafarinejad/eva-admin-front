import { apiErrorResponse, requestAdminApi } from "@/lib/admin-api";
import { hasAdminSession } from "@/lib/session";

function buildQuery(search: string) {
  const params = new URLSearchParams(search);
  const out = new URLSearchParams();
  // Map UI filters to backend contract fields
  const map: Record<string, string> = {
    from: "start",
    to: "end",
    channel: "source",
    status: "status",
    model: "model",
    silence: "silence",
    limit: "limit",
  };
  for (const [k, v] of params.entries()) {
    const key = map[k];
    if (key && v) out.set(key, v);
  }
  if (!out.get("limit")) out.set("limit", "200"); // backend default
  const qs = out.toString();
  return qs ? `?${qs}` : "";
}

type MetaItem = {
  oid?: string;
  ts?: string;
  source?: string;
  model?: string;
  status?: string;
  latency_ms?: number;
  tokens?: number;
  silence?: boolean;
  routing_decision?: string;
};

function pickMeta(item: unknown): MetaItem {
  const src = (item && typeof item === "object" ? (item as Record<string, unknown>) : {}) as Record<string, unknown>;
  const out: MetaItem = {};
  if (typeof src.oid === "string") out.oid = src.oid;
  if (typeof src.ts === "string") out.ts = src.ts;
  if (typeof src.source === "string") out.source = src.source;
  if (typeof src.model === "string") out.model = src.model;
  if (typeof src.status === "string") out.status = src.status;
  if (typeof src.latency_ms === "number") out.latency_ms = src.latency_ms;
  if (typeof src.tokens === "number") out.tokens = src.tokens;
  if (typeof src.silence === "boolean") out.silence = src.silence;
  if (typeof src.routing_decision === "string") out.routing_decision = src.routing_decision;
  return out;
}

function sanitizeListPayload(payload: unknown): { schema_version?: string; truncated?: boolean; items?: MetaItem[] } {
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    const result: { schema_version?: string; truncated?: boolean; items?: MetaItem[] } = {};
    if (typeof obj.schema_version === "string") result.schema_version = obj.schema_version;
    if (typeof obj.truncated === "boolean") result.truncated = obj.truncated;
    if (Array.isArray(obj.items)) result.items = obj.items.map(pickMeta);
    return result;
  }
  return {};
}

export async function GET(request: Request) {
  try {
    if (!(await hasAdminSession())) return Response.json({ error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    const search = new URL(request.url).search;
    const query = buildQuery(search);
    const upstream = await requestAdminApi("v1/prompt-turns", query, { signal: request.signal });
    const body = await upstream.json().catch(() => ({}));
    const sanitized = sanitizeListPayload(body);
    return Response.json(sanitized, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

