import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/session", () => ({ hasAdminSession: vi.fn() }));
import { hasAdminSession } from "@/lib/session";
import { GET } from "./route";

const BASE_URL = "https://upstream.test";
const VALID_KEY = "k".repeat(40);

describe("turns detail route", () => {
  beforeEach(() => {
    (hasAdminSession as any).mockReset();
    process.env.ADMIN_API_BASE_URL = BASE_URL;
    process.env.ADMIN_API_KEY = VALID_KEY;
    delete process.env.ADMIN_ALLOW_SENSITIVE_VIEWS;
  });
  afterEach(() => vi.restoreAllMocks());

  it("requires auth", async () => {
    (hasAdminSession as any).mockResolvedValue(false);
    const res = await GET(new Request("http://localhost/api/admin/turns/x"), { params: { id: "x" } as any });
    expect(res.status).toBe(401);
  });

  it("fails closed when sensitive disabled", async () => {
    (hasAdminSession as any).mockResolvedValue(true);
    const res = await GET(new Request("http://localhost/api/admin/turns/x"), { params: { id: "x" } as any });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "sensitive_view_disabled" });
  });

  it("redacts secrets and escapes html when enabled", async () => {
    process.env.ADMIN_ALLOW_SENSITIVE_VIEWS = "true";
    (hasAdminSession as any).mockResolvedValue(true);
    const upstream = {
      id: "x",
      prompt: "User bearer Bearer abc.def token sk-THISISASECRET",
      response: "<script>alert(1)</script>",
    };
    vi.spyOn(global, "fetch" as any).mockResolvedValue(new Response(JSON.stringify(upstream), { status: 200 }) as any);
    const res = await GET(new Request("http://localhost/api/admin/turns/x"), { params: { id: "x" } as any });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(JSON.stringify(body)).not.toContain("Bearer abc.def");
    expect(JSON.stringify(body)).not.toContain("sk-THISISASECRET");
    expect(JSON.stringify(body)).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });
});

