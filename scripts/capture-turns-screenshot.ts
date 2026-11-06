import { chromium } from "@playwright/test";
import fs from "node:fs/promises";

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "fa-IR" });
  const page = await context.newPage();
  const url = "http://127.0.0.1:3000/turns?from=2026-11-01&to=2026-11-06&channel=web&limit=50";
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  // Wait for table to appear or error box
  await page.waitForSelector("table, [role='alert']", { timeout: 30000 });
  // Small delay to allow client fetch to complete
  await page.waitForTimeout(800);
  const outPath = "/opt/cursor/artifacts/eva-admin-turns-synthetic.png";
  await fs.mkdir("/opt/cursor/artifacts", { recursive: true });
  await page.screenshot({ path: outPath, fullPage: true });
  await browser.close();
  // eslint-disable-next-line no-console
  console.log(outPath);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

