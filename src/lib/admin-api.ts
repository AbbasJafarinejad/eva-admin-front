import { hasAdminSession } from "@/lib/session";

export class AdminApiError extends Error {
  constructor(public status: number, public code?: string) {
    super(`Admin API returned ${status}${code ? ` (${code})` : ""}`);
  }
}

const KNOWN_404 = new Set([
  "prompt_logs_disabled",
  "prompt_logs_not_found",
]);

async function readErrorCode(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.clone().json()) as { detail?: unknown; error?: unknown };
    if (typeof body.detail === "string") return body.detail;
    if (typeof body.error === "string") return body.error;
  } catch {
    /* non-JSON */
  }
  return undefined;
}

export async function requestAdminApi(
  path:
    | "overview"
    | "ai-usage"
    | "prompt-logs"
    | "v1/prompt-turns"
    | "v1/prompt-turns.csv"
    | "v1/prompt-turns.jsonl"
    | `v1/prompt-turns/${string}`
    | "v1/prompt-logs/export"
    | "prompt-logs/export"
    | "v1/users/usage"
    | "users/usage"
    | "v1/backup"
    | "backup",
  query = "",
  options?: {
    signal?: AbortSignal;
    headers?: Record<string, string>;
    method?: "GET" | "POST";
  },
) {
  if (!(await hasAdminSession())) throw new AdminApiError(401, "unauthorized");
  const base = (process.env.ADMIN_API_BASE_URL || "").replace(/\/$/, "");
  const key = process.env.ADMIN_API_KEY || "";
  if (!base || key.length < 32) throw new AdminApiError(503, "admin_not_configured");
  // Call sites sometimes pass "v1/..." while ADMIN_API_BASE_URL already ends with /v1.
  const normalizedPath =
    base.endsWith("/v1") && path.startsWith("v1/") ? path.slice(3) : path;
  let response: Response;
  const method = options?.method || "GET";
  const defaultTimeoutMs =
    normalizedPath === "prompt-logs" ||
    normalizedPath === "backup" ||
    normalizedPath === "prompt-logs/export"
      ? 120_000
      : 15_000;
  const timeoutSignal = AbortSignal.timeout(defaultTimeoutMs);
  const finalSignal = options?.signal
    ? typeof (AbortSignal as unknown as { any?: unknown }).any === "function"
      ? (AbortSignal as unknown as { any: (signals: AbortSignal[]) => AbortSignal }).any([
          options.signal,
          timeoutSignal,
        ])
      : (() => {
          const controller = new AbortController();
          const abort = () => {
            if (!controller.signal.aborted) controller.abort();
          };
          options.signal!.addEventListener("abort", abort, { once: true });
          timeoutSignal.addEventListener("abort", abort, { once: true });
          return controller.signal;
        })()
    : timeoutSignal;
  try {
    const url = `${base}/${normalizedPath}${query}`;
    const isCsv = normalizedPath.endsWith(".csv");
    const isJsonl = normalizedPath.endsWith(".jsonl");
    const isBinaryExport =
      isCsv ||
      isJsonl ||
      normalizedPath === "prompt-logs" ||
      normalizedPath === "prompt-logs/export" ||
      normalizedPath === "backup";
    response = await fetch(url, {
      method,
      headers: {
        "X-Admin-Key": key,
        // Use */* for ZIP/binary exports. A narrow Accept: application/zip can
        // make some stacks reject JSON error bodies and surface as opaque 404s
        // that the BFF then remaps to endpoint_unavailable.
        Accept: isBinaryExport ? "*/*" : "application/json",
        ...(options?.headers ?? {}),
      } as Record<string, string>,
      cache: "no-store",
      signal: finalSignal,
    });
  } catch {
    if (finalSignal.aborted) throw new AdminApiError(504, "backend_timeout");
    throw new AdminApiError(502, "backend_unavailable");
  }
  if (!response.ok) {
    const detail = await readErrorCode(response);
    if (response.status === 401) throw new AdminApiError(502, "backend_auth_failed");
    if (response.status === 503) {
      throw new AdminApiError(503, detail || "backend_unavailable");
    }
    if (response.status === 500) throw new AdminApiError(502, "backend_error");
    if (response.status === 403) throw new AdminApiError(403, detail || "forbidden");
    if (response.status === 422) throw new AdminApiError(422, detail || "invalid_request");
    if (response.status === 404) {
      // Prompt-log ZIP uses 404 for disabled/missing files; never collapse those
      // (or FastAPI's generic "Not Found") into endpoint_unavailable.
      if (normalizedPath === "prompt-logs" || normalizedPath === "prompt-logs/export") {
        const code =
          detail && KNOWN_404.has(detail)
            ? detail
            : detail === "Not Found"
              ? "prompt_logs_not_found"
              : detail || "prompt_logs_not_found";
        throw new AdminApiError(404, code);
      }
      if (detail && KNOWN_404.has(detail)) throw new AdminApiError(404, detail);
      throw new AdminApiError(503, detail || "endpoint_unavailable");
    }
    throw new AdminApiError(response.status, detail || "request_failed");
  }
  return response;
}

export function apiErrorResponse(error: unknown) {
  const status = error instanceof AdminApiError ? error.status : 500;
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
