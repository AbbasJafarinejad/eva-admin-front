import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/session", () => ({ hasAdminSession: vi.fn() }));
import { hasAdminSession } from "@/lib/session";
import { GET } from "./route";

const BASE_URL = "https://upstream.test";
const VALID_KEY = "k".repeat(40);

describe("admin users usage list proxy", () => {
  beforeEach(() => {
    (hasAdminSession as any).mockReset();
    process.env.ADMIN_API_BASE_URL = BASE_URL;
    process.env.ADMIN_API_KEY = VALID_KEY;
  });
  afterEach(() => vi.restoreAllMocks());

  it("requires auth", async () => {
    (hasAdminSession as any).mockResolvedValue(false);
    const res = await GET(new Request("http://localhost/api/admin/users"));
    expect(res.status).toBe(401);
  });

  it("maps Tehran local dates to UTC [start,end) and forwards filters", async () => {
    (hasAdminSession as any).mockResolvedValue(true);
    const upstream = new Response(JSON.stringify({ items: [] }), { status: 200, headers: { "Content-Type": "application/json" } });
    const spy = vi.spyOn(global, "fetch" as any).mockResolvedValue(upstream as any);
    const res = await GET(new Request("http://localhost/api/admin/users?from=2026-11-01&to=2026-11-07&model=gpt&source=web&search=ali&page=2&limit=25"));
    expect(res.status).toBe(200);
    const calledUrl = (spy.mock.calls[0] as any[])[0] as string;
    expect(calledUrl.startsWith(`${BASE_URL}/v1/users/usage?`)).toBe(true);
    expect(calledUrl).toContain("start=2026-10-31T20%3A30%3A00.000Z");
    expect(calledUrl).toContain("end=2026-11-07T20%3A30%3A00.000Z");
    expect(calledUrl).toContain("model=gpt");
    expect(calledUrl).toContain("source=web");
    expect(calledUrl).toContain("search=ali");
    expect(calledUrl).toContain("page=2");
    expect(calledUrl).toContain("limit=25");
  });

  it("maps backend 404 to endpoint_unavailable", async () => {
    (hasAdminSession as any).mockResolvedValue(true);
    vi.spyOn(global, "fetch" as any).mockResolvedValue(new Response("missing", { status: 404 }) as any);
    const res = await GET(new Request("http://localhost/api/admin/users?from=2026-11-01&to=2026-11-07"));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "endpoint_unavailable" });
  });
});

