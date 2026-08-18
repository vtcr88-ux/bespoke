import { chromium, devices } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const requestedUrl = process.argv[2]?.trim();

async function activePublicUrl() {
  if (requestedUrl) return requestedUrl.replace(/\/$/, "");
  const response = await fetch("http://127.0.0.1:4040/api/tunnels", {
    signal: AbortSignal.timeout(2_000),
  });
  if (!response.ok) throw new Error("O inspetor local do ngrok nao respondeu.");
  const payload = await response.json();
  const tunnel = payload.tunnels?.find((item) => item.proto === "https");
  if (!tunnel?.public_url) throw new Error("Nenhum tunel HTTPS esta ativo.");
  return tunnel.public_url.replace(/\/$/, "");
}

const publicUrl = await activePublicUrl();
const publicOrigin = new URL(publicUrl).origin;
const browser = await chromium.launch({ headless: true });
const errors = [];
const localRequests = [];
const apiResponses = new Map();

try {
  const context = await browser.newContext({
    ...devices["Pixel 7"],
    extraHTTPHeaders: {
      "ngrok-skip-browser-warning": "bespoke-mobile-check",
    },
  });
  const page = await context.newPage();

  page.on("pageerror", (error) => errors.push(`Pagina: ${error.message}`));
  page.on("requestfailed", (request) => {
    const errorText = request.failure()?.errorText ?? "falha";
    if (errorText === "net::ERR_ABORTED") return;
    errors.push(`Requisicao: ${request.method()} ${request.url()} (${errorText})`);
  });
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (["localhost", "127.0.0.1"].includes(url.hostname)) {
      localRequests.push(request.url());
    }
  });
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.origin === publicOrigin && url.pathname.startsWith("/api/")) {
      apiResponses.set(url.pathname, response.status());
    }
  });

  await page.goto(publicUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/storefront/settings" &&
      response.ok(),
    { timeout: 20_000 },
  );
  await page.locator(".site-header").waitFor({ state: "visible" });
  await page.locator(".product-card").first().waitFor({ state: "visible" });

  await page.waitForTimeout(15_000);
  await page.reload({ waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.locator(".site-header").waitFor({ state: "visible" });
  await page.goto(`${publicUrl}/catalogo`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  await page.locator(".product-card").first().waitFor({ state: "visible" });

  await mkdir(resolve("test-results"), { recursive: true });
  await page.screenshot({
    fullPage: true,
    path: resolve("test-results/public-demo-mobile.png"),
  });

  if (localRequests.length > 0) {
    throw new Error(`O celular tentou acessar uma URL local: ${localRequests[0]}`);
  }
  if (errors.length > 0) throw new Error(errors.join("\n"));

  console.log(`Endereco testado: ${publicUrl}`);
  console.log("Dispositivo: Pixel 7 (Chrome mobile)");
  console.log("Home inicial: ok");
  console.log("Home apos espera e recarga: ok");
  console.log("Catalogo: ok");
  console.log("Requisicoes locais indevidas: nenhuma");
  for (const [path, status] of [...apiResponses].sort()) {
    console.log(`${path}: ${status}`);
  }

  await context.close();
} finally {
  await browser.close();
}
