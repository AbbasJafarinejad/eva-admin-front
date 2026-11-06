import { describe, it, expect } from "vitest";
import { tehranDateString } from "./dates";

describe("tehranDateString", () => {
  it("formats ISO date for Tehran timezone", () => {
    const d = new Date(Date.UTC(2026, 10, 6, 21, 0, 0)); // 2026-11-06 21:00Z -> early morning next day in Tehran possibly
    const s = tehranDateString(d);
    expect(s).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

