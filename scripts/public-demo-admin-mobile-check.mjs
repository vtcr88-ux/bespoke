import { chromium, devices } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const requestedUrl = process.argv[2]?.trim();

async function runtimeAddress() {
  const runtime = await readFile(".runtime/public-demo.json", "utf8")
    .then(JSON.parse)
    .catch(() => null);
  if (!runtime?.publicUrl || !runtime?.adminPath) {
    throw new Error(
      "O painel temporario nao esta ativo. Execute npm run demo:public.",
    );
  }
  const publicUrl = requestedUrl
    ? requestedUrl.replace(/\/$/, "")
    : runtime.publicUrl.replace(/\/$/, "");
  return {
    adminUrl: `${publicUrl}${runtime.adminPath}/`,
    publicUrl,
  };
}

function hasHorizontalOverflow(page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
}

async function gotoWithTunnelRetry(page, url, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });
      return;
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      await page.waitForTimeout(1_500 * attempt);
    }
  }
  throw lastError;
}

const { adminUrl, publicUrl } = await runtimeAddress();
const publicOrigin = new URL(publicUrl).origin;
const browser = await chromium.launch({ headless: true });
const errors = [];
const localRequests = [];

try {
  const context = await browser.newContext({
    ...devices["Pixel 7"],
    extraHTTPHeaders: {
      "ngrok-skip-browser-warning": "bespoke-admin-mobile-check",
    },
  });
  const page = await context.newPage();

  page.on("pageerror", (error) => errors.push(`Pagina: ${error.message}`));
  page.on("requestfailed", (request) => {
    const errorText = request.failure()?.errorText ?? "falha";
    if (errorText === "net::ERR_ABORTED") return;
    errors.push(
      `Requisicao: ${request.method()} ${request.url()} (${errorText})`,
    );
  });
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (["localhost", "127.0.0.1"].includes(url.hostname)) {
      localRequests.push(request.url());
    }
  });

  const predictableAdmin = await context.request.get(`${publicOrigin}/admin`, {
    headers: { "ngrok-skip-browser-warning": "bespoke-admin-mobile-check" },
  });
  if (predictableAdmin.status() !== 404) {
    throw new Error("O caminho previsivel /admin nao esta bloqueado.");
  }
  const staleAdmin = await context.request.get(
    `${publicOrigin}/painel-${"x".repeat(24)}/`,
    {
      headers: { "ngrok-skip-browser-warning": "bespoke-admin-mobile-check" },
    },
  );
  if (staleAdmin.status() !== 404) {
    throw new Error("Um caminho temporario inativo nao retornou 404.");
  }

  await gotoWithTunnelRetry(page, adminUrl);
  await page.getByRole("heading", { name: "Entrar no painel" }).waitFor();
  await page.getByLabel("E-mail").waitFor();
  await page.locator('input[name="password"]').waitFor();
  await page.getByRole("button", { name: "Entrar" }).waitFor();

  for (const viewport of [
    { width: 320, height: 700 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
  ]) {
    await page.setViewportSize(viewport);
    await page.reload({ waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.getByRole("heading", { name: "Entrar no painel" }).waitFor();
    if (await hasHorizontalOverflow(page)) {
      throw new Error(`Overflow horizontal no painel em ${viewport.width}px.`);
    }
  }

  await mkdir(resolve("test-results"), { recursive: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    fullPage: true,
    path: resolve("test-results/public-admin-mobile.png"),
  });

  if (localRequests.length > 0) {
    throw new Error(
      `O celular tentou acessar uma URL local: ${localRequests[0]}`,
    );
  }
  if (errors.length > 0) throw new Error(errors.join("\n"));

  console.log(`Painel testado: ${adminUrl}`);
  console.log("Dispositivo principal: Pixel 7 (Chrome mobile)");
  console.log("Login responsivo em 320px, 390px e 768px: ok");
  console.log("Caminho previsivel /admin: bloqueado");
  console.log("Caminho temporario inativo: bloqueado");
  console.log("Requisicoes locais indevidas: nenhuma");

  await context.close();
} finally {
  await browser.close();
}
