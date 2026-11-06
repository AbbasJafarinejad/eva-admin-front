import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/session", () => ({ hasAdminSession: vi.fn() }));
import { hasAdminSession } from "@/lib/session";
import { GET } from "./route";

const BASE_URL = "https://upstream.test";
const VALID_KEY = "k".repeat(40);

describe("turns export route", () => {
  beforeEach(() => {
    (hasAdminSession as any).mockReset();
    process.env.ADMIN_API_BASE_URL = BASE_URL;
    process.env.ADMIN_API_KEY = VALID_KEY;
    delete process.env.ADMIN_ALLOW_SENSITIVE_EXPORTS;
  });
  afterEach(() => vi.restoreAllMocks());

  it("requires auth", async () => {
    (hasAdminSession as any).mockResolvedValue(false);
    const res = await GET(new Request("http://localhost/api/admin/turns/export"));
    expect(res.status).toBe(401);
  });

  it("streams CSV meta export and sets headers", async () => {
    (hasAdminSession as any).mockResolvedValue(true);
    const upstream = new Response(new ReadableStream(), { status: 200, headers: { "Content-Type": "text/csv" } });
    const spy = vi.spyOn(global, "fetch" as any).mockResolvedValue(upstream as any);
    const res = await GET(new Request("http://localhost/api/admin/turns/export?from=2026-11-01&to=2026-11-06&format=csv&scope=meta"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    expect(res.headers.get("content-disposition")).toContain("eva-turns.csv");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(spy).toHaveBeenCalledWith(`${BASE_URL}/turns/export?from=2026-11-01&to=2026-11-06&format=csv&scope=meta`, expect.objectContaining({
      headers: expect.objectContaining({ "X-Admin-Key": VALID_KEY, "Accept": "*/*" }),
    }));
  });

  it("denies sensitive scope when disabled", async () => {
    (hasAdminSession as any).mockResolvedValue(true);
    const res = await GET(new Request("http://localhost/api/admin/turns/export?format=jsonl&scope=full"));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "sensitive_export_disabled" });
  });
});

