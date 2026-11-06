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

  it("forwards only whitelisted filters and strips sensitive fields", async () => {
    (hasAdminSession as any).mockResolvedValue(true);
    const upstreamBody = {
      items: [
        { id: "t1", ts: "2026-11-06T10:00:00Z", channel: "web", model: "gpt", status: "ok", prompt: "secret", response: "text", latency_ms: 123 },
      ],
      next_page: 2,
    };
    vi.spyOn(global, "fetch" as any).mockResolvedValue(new Response(JSON.stringify(upstreamBody), { status: 200 }) as any);
    const res = await GET(new Request("http://localhost/api/admin/turns?foo=bar&page=1&page_size=50&channel=web&from=2026-11-01&to=2026-11-06"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items?.[0]?.prompt).toBeUndefined();
    expect(body.items?.[0]?.response).toBeUndefined();
    expect(body.items?.[0]?.id).toBe("t1");
    expect(body.next_page).toBe(2);
  });
});

