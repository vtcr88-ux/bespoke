import { chromium } from "playwright";

const url = process.env.ADMIN_URL || "http://localhost:5177/";
const detectUrl = process.env.DETECT_URL || "http://localhost:8400/detect.js";
const screenshotPath =
  process.env.SCREENSHOT_PATH || ".impeccable-assessment-b-overlay.png";

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

  const preflight = await page.evaluate(() => {
    document.title = "[impeccable-inject] " + document.title;
    const script = document.createElement("script");
    script.textContent = "window.__impeccableInjectionPreflight = true;";
    document.head.appendChild(script);
    return {
      titleChanged: document.title.startsWith("[impeccable-inject]"),
      scriptFlag: window.__impeccableInjectionPreflight === true,
    };
  });

  const injection = await page.evaluate((src) => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = () => resolve({ loaded: true });
      script.onerror = () => resolve({ loaded: false, error: "script_error" });
      document.head.appendChild(script);
    });
  }, detectUrl);

  await page.waitForTimeout(3000);

  const scan = await page.evaluate(async () => {
    const api =
      window.impeccableDetectAsync ||
      window.impeccableDetect ||
      window.impeccableScan;
    let findings = null;
    let error = null;
    try {
      if (typeof api === "function") {
        findings = await api({ serialize: true });
      }
    } catch (scanError) {
      error = scanError?.message || String(scanError);
    }
    const overlayCount = document.querySelectorAll(
      ".impeccable-overlay, .impeccable-banner, .impeccable-label",
    ).length;
    return {
      apiAvailable: typeof api === "function",
      error,
      count: Array.isArray(findings) ? findings.length : null,
      findings: Array.isArray(findings) ? findings.slice(0, 50) : findings,
      overlayCount,
      bodyText: document.body.innerText.slice(0, 1200),
    };
  });

  await page.screenshot({ path: screenshotPath, fullPage: true });

  console.log(
    JSON.stringify(
      {
        ok: true,
        responseStatus: response?.status() ?? null,
        url: page.url(),
        detectUrl,
        preflight,
        injection,
        scan,
        screenshotPath,
        impeccableConsoleMessages: consoleMessages.filter((message) =>
          message.text.toLowerCase().includes("impeccable"),
        ),
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
        detectUrl,
        impeccableConsoleMessages: consoleMessages.filter((message) =>
          message.text.toLowerCase().includes("impeccable"),
        ),
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
