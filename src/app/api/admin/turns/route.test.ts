import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/session", () => ({ hasAdminSession: vi.fn() }));
import { hasAdminSession } from "@/lib/session";
import { GET } from "./route";

const BASE_URL = "https://upstream.test";
const VALID_KEY = "k".repeat(40);

describe("turns list route", () => {
  beforeEach(() => {
    (hasAdminSession as any).mockReset();
    process.env.ADMIN_API_BASE_URL = BASE_URL;
    process.env.ADMIN_API_KEY = VALID_KEY;
  });
  afterEach(() => vi.restoreAllMocks());

  it("requires auth", async () => {
    (hasAdminSession as any).mockResolvedValue(false);
    const res = await GET(new Request("http://localhost/api/admin/turns"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });

  it("maps filters to v1/prompt-turns and strips sensitive fields", async () => {
    (hasAdminSession as any).mockResolvedValue(true);
    const upstreamBody = {
      truncated: true,
      items: [
        { oid: "t1", ts: "2026-11-06T10:00:00Z", source: "web", model: "gpt", status: "ok", prompt: "secret", response: "text", latency_ms: 123, tokens: 10, silence: false, routing_decision: "direct", nested: { secret: "x" } },
      ],
    };
    const spy = vi.spyOn(global, "fetch" as any).mockResolvedValue(new Response(JSON.stringify(upstreamBody), { status: 200 }) as any);
    const res = await GET(new Request("http://localhost/api/admin/turns?foo=bar&limit=50&channel=web&from=2026-11-01&to=2026-11-06"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.truncated).toBe(true);
    expect(body.items?.[0]?.prompt).toBeUndefined();
    expect(body.items?.[0]?.response).toBeUndefined();
    expect(body.items?.[0]?.oid).toBe("t1");
    expect((body.items?.[0] as any).nested).toBeUndefined();
    const calledUrl = (spy.mock.calls[0] as any[])[0] as string;
    expect(calledUrl.startsWith(`${BASE_URL}/v1/prompt-turns?`)).toBe(true);
    expect(calledUrl).toContain("start=2026-11-01");
    expect(calledUrl).toContain("end=2026-11-06");
    expect(calledUrl).toContain("source=web");
    expect(calledUrl).toContain("limit=50");
  });
});

