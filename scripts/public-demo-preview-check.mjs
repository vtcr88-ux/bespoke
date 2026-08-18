import { chromium, devices } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const runtime = await readFile(".runtime/public-demo.json", "utf8")
  .then(JSON.parse)
  .catch(() => null);

if (!runtime?.publicUrl || !runtime?.adminPath) {
  throw new Error(
    "A demonstracao nao esta ativa. Execute npm run demo:public primeiro.",
  );
}

const publicUrl = runtime.publicUrl.replace(/\/$/, "");
const adminUrl = `${publicUrl}${runtime.adminPath}/aparencia?tab=composition`;
const browser = await chromium.launch({ headless: true });
const localRequests = [];
const browserErrors = [];
const browserLogs = [];
const protectedMediaRequests = [];

async function decodedImage(locator, label) {
  await locator.waitFor({ state: "attached", timeout: 30_000 });
  const result = await locator.evaluate(async (image) => {
    try {
      await image.decode();
    } catch {
      // naturalWidth below remains the source of truth for browser support.
    }
    return {
      complete: image.complete,
      naturalHeight: image.naturalHeight,
      naturalWidth: image.naturalWidth,
      source: image.currentSrc || image.src,
    };
  });
  if (!result.complete || result.naturalWidth <= 0 || result.naturalHeight <= 0) {
    throw new Error(`${label} nao foi decodificada: ${JSON.stringify(result)}`);
  }
  return result;
}

async function waitForPreviewLocation(frame, location) {
  const deadline = Date.now() + 15_000;
  let lastState = null;

  while (Date.now() < deadline) {
    lastState = await frame.locator("html").evaluate((element, expected) => {
      const selector =
        expected === "catalog"
          ? ".catalog-page"
          : expected === "reviews"
            ? ".reviews-section"
            : expected === "footer"
              ? ".site-footer"
              : ".hero";
      const target = document.querySelector(selector);
      const bounds = target?.getBoundingClientRect();
      return {
        catalogVisible: Boolean(document.querySelector(".catalog-page")),
        homeVisible: Boolean(document.querySelector(".home-page")),
        location: element.dataset.storefrontPreviewLocation ?? null,
        targetBottom: bounds?.bottom ?? null,
        targetTop: bounds?.top ?? null,
        viewportHeight: window.innerHeight,
      };
    }, location);

    const correctRoute =
      location === "catalog"
        ? lastState.catalogVisible && !lastState.homeVisible
        : lastState.homeVisible && !lastState.catalogVisible;
    const targetInViewport =
      lastState.targetTop !== null &&
      lastState.targetBottom !== null &&
      lastState.targetTop < lastState.viewportHeight &&
      lastState.targetBottom > 0;
    const targetAligned =
      location === "reviews"
        ? lastState.targetTop !== null && Math.abs(lastState.targetTop) <= 16
        : location === "footer"
          ? lastState.targetTop !== null &&
            lastState.targetTop <= lastState.viewportHeight / 2
          : targetInViewport;

    if (
      lastState.location === location &&
      correctRoute &&
      targetInViewport &&
      targetAligned
    ) {
      return lastState;
    }
    await new Promise((resolveTimeout) => setTimeout(resolveTimeout, 100));
  }

  throw new Error(
    `O preview nao chegou ao destino ${location}: ${JSON.stringify(lastState)}`,
  );
}

try {
  const context = await browser.newContext({
    ...devices["Pixel 7"],
  });
  const gatePage = await context.newPage();
  await gatePage.goto(publicUrl, {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });
  const visitButton = gatePage
    .getByText("Visit Site", { exact: true })
    .first();
  const hasInterstitial = await visitButton
    .waitFor({ state: "visible", timeout: 8_000 })
    .then(() => true)
    .catch(() => false);
  if (hasInterstitial) {
    await visitButton.click();
    await gatePage.locator(".store-shell").waitFor({
      state: "visible",
      timeout: 30_000,
    });
  }
  await gatePage.close();

  const settingsResponse = await context.request.get(
    `${publicUrl}/api/storefront/settings`,
    {
      headers: {
        "ngrok-skip-browser-warning": "bespoke-live-preview-check",
      },
    },
  );
  if (!settingsResponse.ok()) {
    throw new Error("A configuracao publica da vitrine nao respondeu.");
  }
  const settings = await settingsResponse.json();
  const page = await context.newPage();

  page.on("pageerror", (error) => {
    browserErrors.push(error.message);
  });
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      browserLogs.push(`${message.type()}: ${message.text()}`);
    }
  });

  page.on("request", (request) => {
    const requestUrl = new URL(request.url());
    if (["localhost", "127.0.0.1"].includes(requestUrl.hostname)) {
      localRequests.push(request.url());
    }
    if (
      requestUrl.pathname.startsWith("/uploads/images/") &&
      request.headers()["ngrok-skip-browser-warning"] ===
        "bespoke-storefront-preview-media"
    ) {
      protectedMediaRequests.push(request.url());
    }
  });

  await page.route("**/*", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname.endsWith("/admin/auth/session")) {
      await route.fulfill({
        json: {
          admin: { email: "preview-check@example.test", role: "owner" },
          csrfToken: "preview-check-token",
          expiresAt: "2099-01-01T00:00:00.000Z",
        },
      });
      return;
    }
    if (pathname.endsWith("/admin/runtime")) {
      await route.fulfill({
        json: {
          instanceId: "public-demo-check",
          publicApiUrl: `${publicUrl}/api`,
          publicWebUrl: publicUrl,
        },
      });
      return;
    }
    if (pathname.endsWith("/admin/storefront")) {
      await route.fulfill({ json: settings });
      return;
    }
    await route.continue();
  });

  await page.goto(adminUrl, {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });

  const preview = page.locator(".storefront-live-preview");
  try {
    await preview.waitFor({ state: "visible", timeout: 30_000 });
  } catch (error) {
    await mkdir(resolve("test-results"), { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve("test-results/public-admin-live-preview-error.png"),
    });
    const visibleText = (await page.locator("body").innerText()).slice(0, 1_500);
    throw new Error(
      [
        `O painel nao exibiu o preview em ${page.url()}.`,
        `Titulo: ${await page.title()}`,
        `Conteudo visivel: ${visibleText || "(vazio)"}`,
        `Erros do navegador: ${browserErrors.join(" | ") || "nenhum"}`,
        error instanceof Error ? error.message : String(error),
      ].join("\n"),
    );
  }
  try {
    await page.waitForFunction(
      () =>
        document
          .querySelector(".storefront-live-preview")
          ?.getAttribute("data-live-preview-status") === "synced",
      undefined,
      { timeout: 30_000 },
    );
  } catch (error) {
    await mkdir(resolve("test-results"), { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve("test-results/public-admin-live-preview-sync-error.png"),
    });
    throw new Error(
      [
        `O preview permaneceu no estado ${await preview.getAttribute("data-live-preview-status")}.`,
        `Conteudo do componente: ${(await preview.innerText()).slice(0, 1_500)}`,
        `Erros do navegador: ${browserErrors.join(" | ") || "nenhum"}`,
        `Console: ${browserLogs.join(" | ") || "sem avisos"}`,
        error instanceof Error ? error.message : String(error),
      ].join("\n"),
    );
  }

  const frame = page.frameLocator(".storefront-live-preview iframe");
  const frameElement = page.locator(".storefront-live-preview iframe");
  const sourceDocument = await frameElement.getAttribute("srcdoc");
  if (!sourceDocument?.includes("__BESPOKE_EMBEDDED_STOREFRONT_PREVIEW__")) {
    throw new Error("O Admin nao utilizou o transporte protegido do preview.");
  }
  await frame.locator(".store-shell").waitFor({ state: "visible" });
  await frame.locator(".hero").waitFor({ state: "visible" });

  for (const device of ["Desktop", "Tablet", "Celular"]) {
    await page.getByRole("button", { name: device, exact: true }).click();
    const expected = { Desktop: "desktop", Tablet: "tablet", Celular: "mobile" }[
      device
    ];
    await page.waitForFunction(
      (value) =>
        document
          .querySelector(".storefront-live-preview")
          ?.getAttribute("data-live-preview-device") === value,
      expected,
    );
  }

  const logo = await decodedImage(
    frame.locator(".brand--header .brand__mark img"),
    "Logo do Header",
  );
  const heroSource = await decodedImage(
    frame.locator(".hero__product-source-preload"),
    "Imagem-fonte dos produtos da Hero",
  );
  if (!logo.source.startsWith("blob:") || !heroSource.source.startsWith("blob:")) {
    throw new Error(
      `Os uploads do preview movel nao usaram URLs locais protegidas: ${JSON.stringify({ logo, heroSource })}`,
    );
  }
  const productLayerSources = await frame
    .locator(".hero__product-image image")
    .evaluateAll((images) => images.map((image) => image.getAttribute("href")));
  if (
    productLayerSources.length !== 3 ||
    productLayerSources.some((source) => !source?.startsWith("blob:"))
  ) {
    throw new Error("As tres camadas dos produtos da Hero nao foram restauradas.");
  }

  await page.getByRole("button", { name: "Catalogo", exact: true }).click();
  await waitForPreviewLocation(frame, "catalog");
  const catalogImages = frame.locator(".product-card__image img");
  await catalogImages.first().waitFor({ state: "attached", timeout: 30_000 });
  const catalogImageCount = await catalogImages.count();
  if (catalogImageCount === 0) {
    throw new Error("O Catalogo nao exibiu imagens de produtos.");
  }
  for (let index = 0; index < catalogImageCount; index += 1) {
    const catalogImage = await decodedImage(
      catalogImages.nth(index),
      `Imagem ${index + 1} do Catalogo`,
    );
    if (!catalogImage.source.startsWith("blob:")) {
      throw new Error(
        `A imagem ${index + 1} do Catalogo nao usou o carregamento protegido.`,
      );
    }
  }
  await page.screenshot({
    fullPage: true,
    path: resolve("test-results/public-admin-live-preview-catalog.png"),
  });

  await page.getByRole("button", { name: "Avaliacoes", exact: true }).click();
  await waitForPreviewLocation(frame, "reviews");
  await page.screenshot({
    fullPage: true,
    path: resolve("test-results/public-admin-live-preview-reviews.png"),
  });

  await page.getByRole("button", { name: "Rodape", exact: true }).click();
  await waitForPreviewLocation(frame, "footer");
  await page.getByRole("button", { name: "Topo", exact: true }).click();
  await waitForPreviewLocation(frame, "top");

  await mkdir(resolve("test-results"), { recursive: true });
  await page.screenshot({
    fullPage: true,
    path: resolve("test-results/public-admin-live-preview.png"),
  });

  if (localRequests.length > 0) {
    throw new Error(`O preview remoto tentou acessar ${localRequests[0]}.`);
  }
  if (protectedMediaRequests.length < 3) {
    throw new Error("O preview nao protegeu todos os uploads dinamicos esperados.");
  }
  if (browserErrors.length > 0) {
    throw new Error(`O preview gerou erro no navegador: ${browserErrors.join(" | ")}`);
  }

  console.log(`Preview testado: ${adminUrl}`);
  console.log("Home real no iframe: sincronizada");
  console.log("Primeiro acesso do ngrok: autorizado como no navegador real");
  console.log("Interstitial do ngrok dentro do iframe: contornado");
  console.log("Chrome movel Pixel 7 e preview 390 x 844: ok");
  console.log("Logo, tres produtos da Hero e imagens do Catalogo: carregados");
  console.log("Navegacao Topo, Catalogo, Avaliacoes e Rodape: funcional");
  console.log("Requisicoes para localhost: nenhuma");
  await context.close();
} finally {
  await browser.close();
}
