import { chromium } from "playwright";

const url = process.env.ADMIN_URL || "http://localhost:5177/";
const screenshotPath =
  process.env.SCREENSHOT_PATH || ".impeccable-assessment-b-preflight.png";

const consoleMessages = [];
const pageErrors = [];
let browser;

try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  page.on("console", (message) => {
    consoleMessages.push({
      type: message.type(),
      text: message.text(),
    });
  });
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  const response = await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(2500);

  const mutation = await page.evaluate(() => {
    document.title = "[impeccable-preflight] " + document.title;
    const script = document.createElement("script");
    script.textContent = "window.__impeccableMutationPreflight = true;";
    document.head.appendChild(script);
    return {
      titleChanged: document.title.startsWith("[impeccable-preflight]"),
      scriptFlag: window.__impeccableMutationPreflight === true,
    };
  });

  await page.screenshot({ path: screenshotPath, fullPage: true });

  const pageInfo = await page.evaluate(() => ({
    title: document.title,
    url: location.href,
    bodyText: document.body.innerText.slice(0, 1200),
    headings: [...document.querySelectorAll("h1,h2,h3")]
      .slice(0, 12)
      .map((node) => node.textContent?.trim() || ""),
    buttons: [...document.querySelectorAll("button")]
      .slice(0, 12)
      .map((node) => node.textContent?.trim() || node.getAttribute("aria-label") || ""),
    forms: document.querySelectorAll("form").length,
  }));

  console.log(
    JSON.stringify(
      {
        ok: true,
        responseStatus: response?.status() ?? null,
        mutation,
        screenshotPath,
        pageInfo,
        consoleMessages,
        pageErrors,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.log(
    JSON.stringify(
      {
        ok: false,
        error: error?.message || String(error),
        consoleMessages,
        pageErrors,
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
} finally {
  await browser?.close();
}
