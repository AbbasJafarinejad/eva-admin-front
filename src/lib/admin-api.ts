import { hasAdminSession } from "@/lib/session";

export class AdminApiError extends Error {
  constructor(public status: number) { super(`Admin API returned ${status}`); }
}

export async function requestAdminApi(path: "overview" | "ai-usage" | "prompt-logs", query = "") {
  if (!(await hasAdminSession())) throw new AdminApiError(401);
  const base = (process.env.ADMIN_API_BASE_URL || "").replace(/\/$/, "");
  const key = process.env.ADMIN_API_KEY || "";
  if (!base || key.length < 32) throw new AdminApiError(503);
  let response: Response;
  try {
    response = await fetch(`${base}/${path}${query}`, {
      headers: { "X-Admin-Key": key, Accept: path === "prompt-logs" ? "application/zip" : "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(path === "prompt-logs" ? 60_000 : 15_000),
    });
  } catch {
    throw new AdminApiError(502);
  }
  if (!response.ok) throw new AdminApiError(response.status === 401 || response.status === 503 ? 502 : response.status);
  return response;
}

export function apiErrorResponse(error: unknown) {
  const status = error instanceof AdminApiError ? error.status : 500;
  const message = status === 401 ? "unauthorized" : status === 503 ? "admin_not_configured" : status === 502 ? "backend_unavailable" : "request_failed";
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}
