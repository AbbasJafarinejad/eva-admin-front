import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/session", () => ({ hasAdminSession: vi.fn() }));
import { hasAdminSession } from "@/lib/session";
import { GET } from "./route";

const BASE_URL = "https://upstream.test";
const VALID_KEY = "k".repeat(40);

describe("prompt-logs export route", () => {
  beforeEach(() => {
    (hasAdminSession as any).mockReset();
    process.env.ADMIN_API_BASE_URL = BASE_URL;
    process.env.ADMIN_API_KEY = VALID_KEY;
    delete process.env.ADMIN_FEATURE_PROMPT_FULL_EXPORT_KEY;
  });
  afterEach(() => vi.restoreAllMocks());

  it("requires auth", async () => {
    (hasAdminSession as any).mockResolvedValue(false);
    const res = await GET(new Request("http://localhost/api/admin/prompt-logs/export"));
    expect(res.status).toBe(401);
  });

  it("streams meta ZIP with correct headers and forwards whitelisted params", async () => {
    (hasAdminSession as any).mockResolvedValue(true);
    const upstream = new Response(new ReadableStream(), { status: 200, headers: { "Content-Type": "application/zip", "X-Export-Truncated": "false", "X-Export-Count": "2" } });
    const spy = vi.spyOn(global, "fetch" as any).mockResolvedValue(upstream as any);
    const res = await GET(new Request("http://localhost/api/admin/prompt-logs/export?from=2026-11-01&to=2026-11-08&source=web&model=gpt&status=ok&silence=false&format=csv"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/zip");
    expect(res.headers.get("content-disposition")).toContain("eva-prompt-logs-20261101-20261108-meta.zip");
    expect(res.headers.get("x-export-truncated")).toBe("false");
    expect(res.headers.get("x-export-count")).toBe("2");
    const calledUrl = (spy.mock.calls[0] as any[])[0] as string;
    expect(calledUrl.startsWith(`${BASE_URL}/v1/prompt-logs/export?`)).toBe(true);
    expect(calledUrl).toContain("start=2026-10-31T20%3A30%3A00.000Z");
    expect(calledUrl).toContain("end=2026-11-08T20%3A30%3A00.000Z");
    expect(calledUrl).toContain("source=web");
    expect(calledUrl).toContain("model=gpt");
    expect(calledUrl).toContain("status=ok");
    expect(calledUrl).toContain("silence=false");
    expect(calledUrl).toContain("format=csv");
    expect(calledUrl).toContain("content=meta");
  });

  it("denies full ZIP when feature key unset", async () => {
    (hasAdminSession as any).mockResolvedValue(true);
    const res = await GET(new Request("http://localhost/api/admin/prompt-logs/export?from=2026-11-01&to=2026-11-08&content=full"));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "feature_disabled" });
  });

  it("forwards feature header for full ZIP when configured", async () => {
    process.env.ADMIN_FEATURE_PROMPT_FULL_EXPORT_KEY = "f".repeat(24);
    (hasAdminSession as any).mockResolvedValue(true);
    const upstream = new Response(new ReadableStream(), { status: 200, headers: { "Content-Type": "application/zip" } });
    const spy = vi.spyOn(global, "fetch" as any).mockResolvedValue(upstream as any);
    const res = await GET(new Request("http://localhost/api/admin/prompt-logs/export?from=2026-11-01&to=2026-11-08&content=full"));
    expect(res.status).toBe(200);
    const init = (spy.mock.calls[0] as any[])[1];
    expect(init.headers["X-Admin-Feature-Key"]).toBe("f".repeat(24));
  });
});

