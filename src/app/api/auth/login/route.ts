import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { createSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

const attempts = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: Request) {
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  if (attempts.size > 5000) {
    for (const [address, entry] of attempts) if (entry.resetAt <= now) attempts.delete(address);
  }
  const current = attempts.get(ip);
  if (current && current.resetAt > now && current.count >= 8) return Response.json({ error: "too_many_attempts" }, { status: 429 });
  if (!current || current.resetAt <= now) attempts.set(ip, { count: 1, resetAt: now + 15 * 60_000 });
  else current.count += 1;

  try {
    const expected = process.env.ADMIN_DASHBOARD_PASSWORD || "";
    const { password } = await request.json() as { password?: unknown };
    if (expected.length < 16 || typeof password !== "string") return Response.json({ error: "unauthorized" }, { status: 401 });
    const expectedHash = createHash("sha256").update(expected).digest();
    const providedHash = createHash("sha256").update(password).digest();
    if (!timingSafeEqual(expectedHash, providedHash)) return Response.json({ error: "unauthorized" }, { status: 401 });
    const jar = await cookies();
    jar.set(SESSION_COOKIE, createSession(), sessionCookieOptions());
    attempts.delete(ip);
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
}
