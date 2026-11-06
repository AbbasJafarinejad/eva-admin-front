import { hasAdminSession } from "@/lib/session";

export class AdminApiError extends Error {
  constructor(public status: number, public code?: string) {
    super(`Admin API returned ${status}${code ? ` (${code})` : ""}`);
  }
}

export async function requestAdminApi(
  path: "overview" | "ai-usage" | "prompt-logs",
  query = "",
  options?: { signal?: AbortSignal }
) {
  if (!(await hasAdminSession())) throw new AdminApiError(401);
  const base = (process.env.ADMIN_API_BASE_URL || "").replace(/\/$/, "");
  const key = process.env.ADMIN_API_KEY || "";
  if (!base || key.length < 32) throw new AdminApiError(503);
  let response: Response;
  // Prefer a caller-provided signal (so the route can tie it to the client connection),
  // otherwise apply sensible per-endpoint timeouts.
  const defaultTimeoutMs = path === "prompt-logs" ? 60_000 : 15_000;
  const timeoutSignal = AbortSignal.timeout(defaultTimeoutMs);
  const finalSignal =
    options?.signal
      ? ("any" in AbortSignal ? (AbortSignal as any).any([options.signal, timeoutSignal]) as AbortSignal : (() => {
          const controller = new AbortController();
          const abort = () => { if (!controller.signal.aborted) controller.abort(); };
          options.signal!.addEventListener("abort", abort, { once: true });
          timeoutSignal.addEventListener("abort", abort, { once: true });
          return controller.signal;
        })())
      : timeoutSignal;
  try {
    response = await fetch(`${base}/${path}${query}`, {
      headers: { "X-Admin-Key": key, Accept: path === "prompt-logs" ? "application/zip" : "application/json" },
      cache: "no-store",
      signal: finalSignal,
    });
  } catch {
    // Distinguish a timeout/abort from other network failures without leaking details
    if (finalSignal.aborted) throw new AdminApiError(504, "backend_timeout");
    throw new AdminApiError(502, "backend_unavailable");
  }
  if (!response.ok) {
    // Never surface upstream 401 to the browser — avoid logging admins out on backend key mismatch.
    if (response.status === 401) throw new AdminApiError(502, "backend_auth_failed");
    // Preserve upstream 503 to indicate service unavailability distinctly from "not configured".
    if (response.status === 503) throw new AdminApiError(503, "backend_unavailable");
    // Upstream 404: endpoint/feature not available on backend
    if (response.status === 404) throw new AdminApiError(503, "endpoint_unavailable");
    // Upstream 500: backend error; surface as bad gateway
    if (response.status === 500) throw new AdminApiError(502, "backend_error");
    // Upstream 403: forbidden for this admin key/context
    if (response.status === 403) throw new AdminApiError(403, "forbidden");
    throw new AdminApiError(response.status);
  }
  return response;
}

export function apiErrorResponse(error: unknown) {
  const status = error instanceof AdminApiError ? error.status : 500;
  // If a safe code was provided, prefer that for the response body; otherwise map from status.
  const code =
    error instanceof AdminApiError && error.code
      ? error.code
      : status === 401
        ? "unauthorized"
        : status === 403
          ? "forbidden"
        : status === 503
          ? "admin_not_configured"
          : status === 502
            ? "backend_unavailable"
            : status === 504
              ? "backend_timeout"
              : "request_failed";
  return Response.json({ error: code }, { status, headers: { "Cache-Control": "no-store" } });
}
