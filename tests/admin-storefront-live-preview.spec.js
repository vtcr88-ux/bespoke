// @ts-check
import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const adminOrigin = "http://localhost:5174";

async function prepareAdmin(page) {
  const devStore = JSON.parse(
    await readFile(
      resolve(process.cwd(), "database/dev-commerce-store.json"),
      "utf8",
    ),
  );
  let settings = structuredClone(devStore.storefront);
  const corsHeaders = {
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": "content-type, x-csrf-token",
    "access-control-allow-methods": "GET, PATCH, POST, OPTIONS",
    "access-control-allow-origin": adminOrigin,
  };

  await page.route("**/admin/**", async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }

    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/admin/auth/session") {
      await route.fulfill({
        headers: corsHeaders,
        json: {
          admin: { email: "owner@example.test", role: "owner" },
          csrfToken: "playwright-csrf-token",
          expiresAt: "2099-01-01T00:00:00.000Z",
        },
      });
      return;
    }

    if (
      pathname === "/admin/storefront" &&
      route.request().method() === "PATCH"
    ) {
      settings = {
        ...settings,
        ...route.request().postDataJSON(),
      };
      await route.fulfill({ headers: corsHeaders, json: settings });
      return;
    }

    await route.fulfill({
      headers: corsHeaders,
      json: pathname === "/admin/storefront" ? settings : { items: [] },
    });
  });
}

test("Composicao mostra a Home real em desktop, tablet e celular", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await prepareAdmin(page);
  const storefrontUpdates = [];
  page.on("request", (request) => {
    if (
      request.method() === "PATCH" &&
      new URL(request.url()).pathname === "/admin/storefront"
    ) {
      storefrontUpdates.push(request.url());
    }
  });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${adminOrigin}/aparencia`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("tab", { name: "Composicao" }).click();

  const livePreview = page.locator(".storefront-live-preview");
  const previewFrame = page.frameLocator(".storefront-live-preview iframe");
  await expect(livePreview).toHaveAttribute(
    "data-live-preview-status",
    "synced",
    { timeout: 20_000 },
  );
  await expect(previewFrame.locator(".hero")).toBeVisible();
  await expect(previewFrame.locator(".home-page")).toBeVisible();
  await expect(previewFrame.locator(".home-composition")).toBeAttached();

  const accentInput = page.getByLabel("Cor de destaque");
  const footerInput = page.getByLabel("Cor do rodape");
  const previewFooter = previewFrame.locator(".site-footer");
  const footerBefore = await previewFooter.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  const nextAccent =
    (await accentInput.inputValue()).toLowerCase() === "#2f6f74"
      ? "#a34252"
      : "#2f6f74";
  await accentInput.fill(nextAccent);
  await expect(livePreview).toHaveAttribute(
    "data-live-preview-status",
    "synced",
  );
  await expect
    .poll(() =>
      previewFrame
        .locator(".store-shell")
        .evaluate((element) =>
          getComputedStyle(element)
            .getPropertyValue("--color-brand-accent")
            .trim(),
        ),
    )
    .toBe(nextAccent);
  expect(
    await previewFooter.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    ),
  ).toBe(footerBefore);

  const nextFooter =
    (await footerInput.inputValue()).toLowerCase() === "#4a2034"
      ? "#68364a"
      : "#4a2034";
  await footerInput.fill(nextFooter);
  await expect
    .poll(() =>
      previewFrame
        .locator(".store-shell")
        .evaluate((element) =>
          getComputedStyle(element)
            .getPropertyValue("--color-footer-background")
            .trim(),
        ),
    )
    .toBe(nextFooter);
  expect(
    await previewFooter.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    ),
  ).not.toBe(footerBefore);

  await page.getByLabel("Espacamento entre secoes").selectOption("airy");
  await expect(previewFrame.locator(".home-page")).toHaveAttribute(
    "data-home-spacing",
    "airy",
  );

  const mobileNavigationToggle = page.getByLabel(
    "Exibir atalhos da Home em celulares",
  );
  const editorialNavigation = previewFrame.locator(".home-editorial-nav");
  await expect(mobileNavigationToggle).not.toBeChecked();
  await expect(editorialNavigation).toBeVisible();
  await page.getByRole("button", { name: "Celular" }).click();
  await expect
    .poll(() => previewFrame.locator("html").evaluate(() => window.innerWidth))
    .toBe(390);
  await expect(editorialNavigation).toBeHidden();
  await mobileNavigationToggle.check();
  await expect(editorialNavigation).toBeVisible();
  await mobileNavigationToggle.uncheck();
  await expect(editorialNavigation).toBeHidden();
  await livePreview.screenshot({
    path: "test-results/admin-composition-mobile-navigation-hidden.png",
  });
  await page.getByRole("button", { name: "Desktop" }).click();
  await expect(editorialNavigation).toBeVisible();

  const featuredSection = page
    .locator(".section-order-editor article")
    .filter({ hasText: "Produtos em destaque" });
  await featuredSection.getByLabel("Exibir").uncheck();
  await expect(previewFrame.locator(".home-section--featured")).toHaveCount(0);

  for (const device of [
    { label: "Desktop", width: 1440 },
    { label: "Tablet", width: 768 },
    { label: "Celular", width: 390 },
  ]) {
    await page.getByRole("button", { name: device.label }).click();
    await expect
      .poll(() =>
        previewFrame.locator("html").evaluate(() => window.innerWidth),
      )
      .toBe(device.width);
    expect(
      await previewFrame
        .locator("html")
        .evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
    ).toBe(true);
    await page.getByRole("button", { name: "Rodape" }).click();
    await expect(previewFrame.locator("html")).toHaveAttribute(
      "data-storefront-preview-location",
      "footer",
    );
    await expect(previewFrame.locator(".site-footer")).toBeInViewport({
      ratio: 0.5,
    });
    await page.getByRole("button", { name: "Topo" }).click();
    await expect(previewFrame.locator("html")).toHaveAttribute(
      "data-storefront-preview-location",
      "top",
    );
    await expect(previewFrame.locator(".hero")).toBeInViewport({ ratio: 0.5 });
  }

  await page.screenshot({
    fullPage: true,
    path: "test-results/admin-composition-live-preview-desktop.png",
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(livePreview).toBeVisible();
  await expect(page.getByRole("button", { name: "Celular" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await livePreview.scrollIntoViewIfNeeded();
  await expect(previewFrame.locator(".hero")).toBeVisible();
  await page.getByRole("button", { name: "Rodape" }).click();
  await expect(previewFrame.locator(".site-footer")).toBeInViewport({
    ratio: 0.5,
  });
  await page.waitForTimeout(300);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth + 1,
    ),
  ).toBe(true);
  await page.screenshot({
    fullPage: true,
    path: "test-results/admin-composition-live-preview-mobile.png",
  });
  await livePreview.screenshot({
    path: "test-results/admin-composition-live-preview-mobile-footer.png",
  });

  expect(storefrontUpdates).toEqual([]);
});

test("Motion Home reaplica o preview e salva cada bloco", async ({ page }) => {
  test.setTimeout(90_000);
  await prepareAdmin(page);
  let savedSettings = null;
  page.on("request", (request) => {
    if (
      request.method() === "PATCH" &&
      new URL(request.url()).pathname === "/admin/storefront"
    ) {
      savedSettings = request.postDataJSON();
    }
  });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${adminOrigin}/aparencia`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("tab", { name: "Motion" }).click();

  const cardsEffect = page.getByLabel("Efeito de Cards de produtos");
  const previewCanvas = page.locator(".appearance-preview__canvas");
  await cardsEffect.selectOption("static");
  await expect(
    page.locator('.appearance-preview__card[data-motion-effect="static"]'),
  ).toBeVisible();

  await page.getByRole("tab", { name: "Composicao" }).click();
  const livePreview = page.locator(".storefront-live-preview");
  const previewFrame = page.frameLocator(".storefront-live-preview iframe");
  await expect(livePreview).toHaveAttribute(
    "data-live-preview-status",
    "synced",
    { timeout: 20_000 },
  );
  const cards = previewFrame.locator(
    ".product-grid--preview .product-card--home-preview",
  );
  await expect(cards.first()).toBeAttached({ timeout: 20_000 });
  expect(
    await cards
      .first()
      .evaluate((element) => getComputedStyle(element).opacity),
  ).toBe("1");

  await page.getByRole("tab", { name: "Motion" }).click();
  const canvasBeforeChange = await previewCanvas.elementHandle();
  await cardsEffect.selectOption("cascade");
  await expect
    .poll(() => canvasBeforeChange?.evaluate((element) => element.isConnected))
    .toBe(false);
  await expect(
    page.locator('.appearance-preview__card[data-motion-effect="cascade"]'),
  ).toBeVisible();

  await page.getByRole("tab", { name: "Composicao" }).click();
  await expect(livePreview).toHaveAttribute(
    "data-live-preview-status",
    "synced",
    { timeout: 20_000 },
  );
  await expect(cards.first()).toBeAttached({ timeout: 20_000 });
  expect(
    await cards
      .first()
      .evaluate((element) => getComputedStyle(element).opacity),
  ).toBe("0");

  const staggeredOpacity = await cards.evaluateAll(
    (elements) =>
      new Promise((resolve) => {
        const firstCard = elements[0];
        if (!firstCard) {
          resolve([]);
          return;
        }
        const deadline = performance.now() + 1_000;
        firstCard.scrollIntoView({ block: "start" });

        function sample() {
          const opacities = elements
            .slice(0, 4)
            .map((element) => Number(getComputedStyle(element).opacity));
          if ((opacities[0] ?? 0) > 0 || performance.now() >= deadline) {
            resolve(opacities);
            return;
          }
          window.requestAnimationFrame(sample);
        }

        window.requestAnimationFrame(sample);
      }),
  );
  expect(staggeredOpacity[0]).toBeGreaterThan(staggeredOpacity[3]);

  await page.getByRole("tab", { name: "Motion" }).click();
  await page.getByLabel("Intensidade do movimento").selectOption("expressive");
  await page.getByLabel("Efeito de Manifesto editorial").selectOption("soft");
  await page.getByLabel("Efeito de Atalhos da loja").selectOption("structured");
  await page
    .getByLabel("Efeito de Cabecalho dos destaques")
    .selectOption("subtle");
  await page.getByLabel("Efeito de Cards de produtos").selectOption("cascade");
  await page.getByLabel("Efeito de Rodape").selectOption("static");
  await page.screenshot({
    fullPage: true,
    path: "test-results/admin-motion-home-configured.png",
  });
  await page.getByRole("button", { name: "Salvar vitrine" }).click();

  await expect.poll(() => savedSettings).not.toBeNull();
  expect(savedSettings).toMatchObject({
    editorialNavigationMobileEnabled: false,
    homeMotionEnabled: true,
    homeMotionIntensity: "expressive",
    homeMotionPreset: "soft",
    homeMotionByBlock: {
      manifesto: "soft",
      navigation: "structured",
      featuredHeading: "subtle",
      productCards: "cascade",
      footer: "static",
    },
  });
  await expect(
    page.getByText("Configuracoes da vitrine salvas."),
  ).toBeVisible();
});
