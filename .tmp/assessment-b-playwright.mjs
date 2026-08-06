import { chromium } from "@playwright/test";

const targets = [
  { url: "http://localhost:5174", viewport: "desktop", size: { width: 1440, height: 900 } },
  { url: "http://localhost:5174", viewport: "mobile", size: { width: 390, height: 844 }, isMobile: true },
  { url: "http://127.0.0.1:5174", viewport: "desktop", size: { width: 1440, height: 900 } },
  { url: "http://127.0.0.1:5174", viewport: "mobile", size: { width: 390, height: 844 }, isMobile: true },
];

function compactText(value) {
  return value.replace(/\s+/g, " ").trim().slice(0, 1200);
}

const browser = await chromium.launch({ headless: true });
const results = [];

for (const target of targets) {
  const context = await browser.newContext({
    viewport: target.size,
    isMobile: target.isMobile ?? false,
  });
  const page = await context.newPage();
  const consoleMessages = [];
  const pageErrors = [];

  page.on("console", (message) => {
    consoleMessages.push({
      type: message.type(),
      text: message.text(),
    });
  });
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  const result = {
    url: target.url,
    viewport: target.viewport,
    size: target.size,
    status: "pending",
    finalUrl: null,
    title: null,
    h1: [],
    text: "",
    console: consoleMessages,
    pageErrors,
    error: null,
  };

  try {
    const response = await page.goto(target.url, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });
    await page.waitForTimeout(2500);
    result.status = response ? `${response.status()} ${response.statusText()}` : "no-response";
    result.finalUrl = page.url();
    result.title = await page.title().catch(() => null);
    result.h1 = await page.locator("h1").allTextContents().catch(() => []);
    result.text = compactText(await page.locator("body").innerText({ timeout: 3000 }).catch(() => ""));
  } catch (error) {
    result.status = "navigation-error";
    result.error = error instanceof Error ? error.message : String(error);
    result.finalUrl = page.url();
    result.title = await page.title().catch(() => null);
  }

  results.push(result);
  await context.close();
}

await browser.close();
console.log(JSON.stringify(results, null, 2));
