import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the admin session check to control auth in tests
vi.mock("@/lib/session", () => ({
  hasAdminSession: vi.fn(),
}));

import { GET } from "./route";
import { hasAdminSession } from "@/lib/session";

const BASE_URL = "https://upstream.test";
const VALID_KEY = "k".repeat(40);

function makeZipStream(chunks: string[]) {
  let pullCount = 0;
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (pullCount < chunks.length) {
        controller.enqueue(encoder.encode(chunks[pullCount++]));
      } else {
        controller.close();
      }
    },
  });
  return { stream, get pullCount() { return pullCount; } };
}

async function readBody(res: Response) {
  const reader = res.body!.getReader();
  const chunks: Uint8Array[] = [];
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const totalLength = chunks.reduce((n, c) => n + c.length, 0);
  const buffer = new Uint8Array(totalLength);
  let offset = 0;
  for (const c of chunks) { buffer.set(c, offset); offset += c.length; }
  return new TextDecoder().decode(buffer);
}

describe("admin prompt-logs route", () => {
  beforeEach(() => {
    (hasAdminSession as unknown as ReturnType<typeof vi.fn>).mockReset();
    // Default env
    process.env.ADMIN_API_BASE_URL = BASE_URL;
    process.env.ADMIN_API_KEY = VALID_KEY;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when admin session is missing", async () => {
    (hasAdminSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    const res = await GET(new Request("http://localhost/api/admin/prompt-logs"));
    expect(res.status).toBe(401);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = await res.json();
    expect(body).toEqual({ error: "unauthorized" });
  });

  it("returns 503 when admin API not configured", async () => {
    (hasAdminSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    process.env.ADMIN_API_BASE_URL = "";
    const res = await GET(new Request("http://localhost/api/admin/prompt-logs"));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body).toEqual({ error: "admin_not_configured" });
  });

  it("streams ZIP body without buffering", async () => {
    (hasAdminSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const { stream, pullCount } = makeZipStream(["abc", "def"]);
    const upstream = new Response(stream, { status: 200, headers: { "Content-Type": "application/zip" } });
    const fetchSpy = vi.spyOn(global, "fetch" as any).mockResolvedValue(upstream as any);

    const res = await GET(new Request("http://localhost/api/admin/prompt-logs"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/zip");
    expect(res.headers.get("content-disposition")).toContain("eva-prompt-logs.zip");
    expect(res.headers.get("cache-control")).toBe("no-store");
    // No pulls should have happened until we start reading our response body
    expect(pullCount).toBe(0);
    const text = await readBody(res);
    expect(text).toBe("abcdef");
    expect(fetchSpy).toHaveBeenCalledWith(`${BASE_URL}/prompt-logs`, expect.objectContaining({
      headers: expect.objectContaining({ "X-Admin-Key": VALID_KEY, "Accept": "*/*" }),
      cache: "no-store",
    }));
  });

  it("maps upstream 401 to 502 with safe code backend_auth_failed", async () => {
    (hasAdminSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    vi.spyOn(global, "fetch" as any).mockResolvedValue(new Response("nope", { status: 401 }) as any);

    const res = await GET(new Request("http://localhost/api/admin/prompt-logs"));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body).toEqual({ error: "backend_auth_failed" });
  });

  it("preserves upstream 503 (service unavailable) distinctly", async () => {
    (hasAdminSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    vi.spyOn(global, "fetch" as any).mockResolvedValue(new Response("down", { status: 503 }) as any);

    const res = await GET(new Request("http://localhost/api/admin/prompt-logs"));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body).toEqual({ error: "backend_unavailable" });
  });

  it("returns 502 backend_unavailable on network failure", async () => {
    (hasAdminSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    vi.spyOn(global, "fetch" as any).mockRejectedValue(new Error("network error"));
    const res = await GET(new Request("http://localhost/api/admin/prompt-logs"));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body).toEqual({ error: "backend_unavailable" });
  });

  it("returns 504 backend_timeout when request is already aborted", async () => {
    (hasAdminSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const controller = new AbortController();
    controller.abort();
    const fetchSpy = vi.spyOn(global, "fetch" as any).mockImplementation((_url: string, init: RequestInit) => {
      expect(init.signal && "aborted" in init.signal ? (init.signal as AbortSignal).aborted : false).toBe(true);
      throw new Error("aborted");
    });
    const req = new Request("http://localhost/api/admin/prompt-logs", { signal: controller.signal });
    const res = await GET(req);
    expect(res.status).toBe(504);
    expect(await res.json()).toEqual({ error: "backend_timeout" });
    expect(fetchSpy).toHaveBeenCalled();
  });

  it("avoids 406 Not Acceptable by sending Accept */* for exports", async () => {
    (hasAdminSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    // Simulate a backend that would otherwise serve octet-stream only
    const upstream = new Response(new ReadableStream(), { status: 200, headers: { "Content-Type": "application/octet-stream" } });
    const spy = vi.spyOn(global, "fetch" as any).mockResolvedValue(upstream as any);
    const res = await GET(new Request("http://localhost/api/admin/prompt-logs"));
    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledWith(`${BASE_URL}/prompt-logs`, expect.objectContaining({
      headers: expect.objectContaining({ Accept: "*/*" }),
    }));
  });
});

