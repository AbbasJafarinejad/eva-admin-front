import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "eva_admin_session";
const maxAge = Number(process.env.SESSION_MAX_AGE_SECONDS || 28800);

function sessionSecret() {
  const value = process.env.ADMIN_SESSION_SECRET || "";
  if (value.length < 32) throw new Error("Admin session secret is not configured");
  return value;
}

function signature(value: string) {
  return createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}

export function createSession() {
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + maxAge })).toString("base64url");
  const signed = `v1.${payload}`;
  return `${signed}.${signature(signed)}`;
}

function isValidSession(token?: string) {
  if (!token) return false;
  try {
    const [version, payload, received, extra] = token.split(".");
    if (version !== "v1" || !payload || !received || extra) return false;
    const expected = Buffer.from(signature(`${version}.${payload}`));
    const actual = Buffer.from(received);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return false;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp?: number };
    return typeof data.exp === "number" && data.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export async function hasAdminSession() {
  const jar = await cookies();
  return isValidSession(jar.get(SESSION_COOKIE)?.value);
}

export function sessionCookieOptions() {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, path: "/", maxAge };
}
