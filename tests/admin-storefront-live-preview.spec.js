// @ts-check
/* global document, getComputedStyle, performance, process, structuredClone, URL, window */
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

    if (pathname === "/admin/runtime") {
      await route.fulfill({
        headers: corsHeaders,
        json: {
          instanceId: "playwright-store",
          publicApiUrl: "http://localhost:3333",
          publicWebUrl: "https://example.ngrok-free.dev",
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

test("menu da Vitrine acompanha a rolagem em todas as telas", async ({
  page,
}) => {
  await prepareAdmin(page);

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 768, height: 1024 },
    { width: 375, height: 667 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${adminOrigin}/aparencia`, {
      waitUntil: "domcontentloaded",
    });

    const tabs = page.locator(".appearance-tabs");
    await expect(tabs).toBeVisible();
    await expect(tabs).toHaveCSS("position", "static");

    await tabs.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      window.scrollTo({
        top: window.scrollY + bounds.bottom + 32,
        behavior: "instant",
      });
    });

    await expect
      .poll(() =>
        tabs.evaluate((element) => element.getBoundingClientRect().bottom),
      )
      .toBeLessThan(0);
  }
});

test("Vendas organiza e salva a experiencia comercial da Home", async ({
  page,
}) => {
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

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${adminOrigin}/aparencia?tab=sales`, {
    waitUntil: "domcontentloaded",
  });

  await expect(page.getByRole("tab", { name: "Vendas" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page
    .locator("#appearance-panel-sales")
    .getByLabel("Titulo da secao")
    .fill("Escolha por categoria");
  await page
    .getByLabel("Descricao dos produtos em destaque")
    .fill("Produtos selecionados para uma compra simples e segura.");
  const productShowcaseSection = page.locator("section.editor-section").filter({
    has: page.getByRole("heading", { name: "Vitrine de produtos" }),
  });
  await productShowcaseSection
    .getByLabel("Colunas no celular")
    .selectOption("2");
  await productShowcaseSection
    .getByLabel("Descricao nos cards")
    .selectOption("compact");
  await productShowcaseSection
    .getByLabel("Estilo visual dos cards")
    .selectOption("ecommerce");
  await expect(
    page.locator(".appearance-preview__card--ecommerce"),
  ).toBeAttached();
  await page
    .getByLabel("Titulo da compra pelo WhatsApp")
    .fill("Atendimento pelo WhatsApp");
  await page.screenshot({
    fullPage: true,
    path: "test-results/admin-sales-desktop.png",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("heading", { name: "Navegacao por categorias" })
    .scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    )
    .toBeLessThanOrEqual(1);
  await page.screenshot({
    fullPage: true,
    path: "test-results/admin-sales-mobile.png",
  });
  await page.getByRole("button", { name: "Salvar vitrine" }).click();

  await expect.poll(() => savedSettings).not.toBeNull();
  expect(savedSettings).toMatchObject({
    categoryTitle: "Escolha por categoria",
    featuredDescription:
      "Produtos selecionados para uma compra simples e segura.",
    homeProductColumnsMobile: 2,
    homeProductDescriptionMode: "compact",
    productCardStyle: "ecommerce",
    commerceWhatsappTitle: "Atendimento pelo WhatsApp",
  });
  expect(savedSettings.homeSections).toHaveLength(5);
  expect(savedSettings.homeSections.map((section) => section.id)).toEqual(
    expect.arrayContaining([
      "manifesto",
      "navigation",
      "featured",
      "categories",
      "commerce",
    ]),
  );
});

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
  const layoutTab = page.getByRole("tab", { name: /Layout da Home/ });
  await layoutTab.scrollIntoViewIfNeeded();
  await layoutTab.click();
  await expect(layoutTab).toHaveAttribute("aria-selected", "true");

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

  const previewCard = previewFrame
    .locator(".product-card--home-preview")
    .first();
  await expect(previewCard).toBeVisible({ timeout: 20_000 });
  const shadowBefore = await previewCard.evaluate(
    (element) => getComputedStyle(element).boxShadow,
  );
  await page
    .getByRole("textbox", { name: "Sombras", exact: true })
    .fill("#58243a");
  await expect
    .poll(() =>
      previewFrame
        .locator(".home-page")
        .evaluate((element) =>
          getComputedStyle(element).getPropertyValue("--home-shadow").trim(),
        ),
    )
    .toBe("#58243a");
  await expect
    .poll(() =>
      previewCard.evaluate((element) => getComputedStyle(element).boxShadow),
    )
    .not.toBe(shadowBefore);

  await expect(page.getByLabel("Cor do rodape")).toBeHidden();
  await page.getByRole("tab", { name: "Rodape" }).click();
  const footerInput = page.getByLabel("Cor do rodape");
  await expect(footerInput).toBeVisible();
  const nextFooter =
    (await footerInput.inputValue()).toLowerCase() === "#4a2034"
      ? "#68364a"
      : "#4a2034";
  await footerInput.fill(nextFooter);
  await layoutTab.click();
  await expect(livePreview).toHaveAttribute(
    "data-live-preview-status",
    "synced",
    { timeout: 20_000 },
  );
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
  const mobileManifestoDividerToggle = page.getByLabel(
    "Exibir divisor do manifesto em celulares",
  );
  const editorialNavigation = previewFrame.locator(".home-editorial-nav");
  const editorialStatement = previewFrame.locator(".editorial-statement");
  await expect(mobileNavigationToggle).not.toBeChecked();
  await expect(mobileManifestoDividerToggle).not.toBeChecked();
  await expect(editorialNavigation).toBeVisible();
  await page.getByRole("button", { name: "Celular" }).click();
  await expect
    .poll(() => previewFrame.locator("html").evaluate(() => window.innerWidth))
    .toBe(390);
  await expect(editorialNavigation).toBeHidden();
  await expect(editorialStatement).toHaveAttribute(
    "data-mobile-divider-enabled",
    "false",
  );
  await expect
    .poll(() =>
      editorialStatement.evaluate(
        (element) => getComputedStyle(element, "::after").display,
      ),
    )
    .toBe("none");
  await mobileManifestoDividerToggle.check();
  await expect(editorialStatement).toHaveAttribute(
    "data-mobile-divider-enabled",
    "true",
  );
  await expect
    .poll(() =>
      editorialStatement.evaluate(
        (element) => getComputedStyle(element, "::after").display,
      ),
    )
    .not.toBe("none");
  const manifestoRhythm = await editorialStatement.evaluate((element) => ({
    dividerMarginTop: Number.parseFloat(
      getComputedStyle(element, "::after").marginTop,
    ),
    paddingTop: Number.parseFloat(getComputedStyle(element).paddingTop),
  }));
  expect(manifestoRhythm.dividerMarginTop).toBeCloseTo(
    manifestoRhythm.paddingTop,
    0,
  );
  await mobileManifestoDividerToggle.uncheck();
  const manifestoWithoutDividerRhythm = await editorialStatement.evaluate(
    (element) => ({
      paddingBottom: Number.parseFloat(getComputedStyle(element).paddingBottom),
      paddingTop: Number.parseFloat(getComputedStyle(element).paddingTop),
    }),
  );
  expect(manifestoWithoutDividerRhythm.paddingBottom).toBeCloseTo(
    manifestoWithoutDividerRhythm.paddingTop,
    0,
  );
  await mobileNavigationToggle.check();
  await expect(editorialNavigation).toBeVisible();
  await mobileNavigationToggle.uncheck();
  await expect(editorialNavigation).toBeHidden();
  await editorialStatement.evaluate((element) =>
    element.scrollIntoView({ block: "end", behavior: "instant" }),
  );
  await livePreview.screenshot({
    path: "test-results/admin-composition-mobile-navigation-hidden.png",
  });
  await page.getByRole("button", { name: "Desktop" }).click();
  await expect(editorialNavigation).toBeVisible();
  await expect
    .poll(() =>
      editorialStatement.evaluate(
        (element) => getComputedStyle(element, "::after").display,
      ),
    )
    .not.toBe("none");

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
  await page.getByRole("tab", { name: "Movimento" }).click();

  const cardsEffect = page.getByLabel("Efeito de Cards de produtos");
  const previewCanvas = page.locator(".appearance-preview__canvas");
  await cardsEffect.selectOption("static");
  await expect(
    page.locator('.appearance-preview__card[data-motion-effect="static"]'),
  ).toBeVisible();

  await page.getByRole("tab", { name: "Layout da Home" }).click();
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

  await page.getByRole("tab", { name: "Movimento" }).click();
  const canvasBeforeChange = await previewCanvas.elementHandle();
  await cardsEffect.selectOption("cascade");
  await expect
    .poll(() => canvasBeforeChange?.evaluate((element) => element.isConnected))
    .toBe(false);
  await expect(
    page.locator('.appearance-preview__card[data-motion-effect="cascade"]'),
  ).toBeVisible();

  await page.getByRole("tab", { name: "Layout da Home" }).click();
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

  await page.getByRole("tab", { name: "Movimento" }).click();
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
    manifestoDividerMobileEnabled: false,
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

test("Avaliacoes sincronizam do editor ao preview publico", async ({
  page,
}) => {
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

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${adminOrigin}/aparencia`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("tab", { name: "Avaliacoes" }).click();
  await page.getByLabel("Exibir avaliacoes na Home").check();
  await page.getByLabel("Etiqueta da secao").fill("Relatos verificados");
  await page.getByLabel("Titulo da secao").fill("Quem comprou recomenda");
  await page.getByRole("button", { name: "Nova avaliacao" }).click();
  await page.getByLabel("Nome na avaliacao 1").fill("Cliente teste");
  await page.getByLabel("Contexto da avaliacao 1").fill("Compra verificada");
  await page.getByLabel("Nota da avaliacao 1").selectOption("5");
  await page
    .getByLabel("Relato da avaliacao 1")
    .fill("Atendimento claro, cuidadoso e consistente durante toda a compra.");

  await expect(page.locator(".appearance-preview__reviews")).toBeVisible();
  await page.getByRole("tab", { name: "Layout da Home" }).click();
  const livePreview = page.locator(".storefront-live-preview");
  const previewFrame = page.frameLocator(".storefront-live-preview iframe");
  await expect(livePreview).toHaveAttribute(
    "data-live-preview-status",
    "synced",
    { timeout: 20_000 },
  );
  await page.getByRole("button", { name: "Catalogo", exact: true }).click();
  await expect(previewFrame.locator("html")).toHaveAttribute(
    "data-storefront-preview-location",
    "catalog",
  );
  await expect(previewFrame.locator(".catalog-page")).toBeInViewport({
    ratio: 0.4,
  });
  await page.getByRole("button", { name: "Avaliacoes" }).click();
  await expect(previewFrame.locator("html")).toHaveAttribute(
    "data-storefront-preview-location",
    "reviews",
  );
  await expect(previewFrame.locator(".catalog-page")).toHaveCount(0);
  await expect(previewFrame.locator(".reviews-section")).toBeInViewport({
    ratio: 0.4,
  });
  await expect(previewFrame.locator(".review-card")).toHaveCount(2);
  await expect(
    previewFrame.getByRole("heading", { name: "Quem comprou recomenda" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Salvar vitrine" }).click();
  await expect.poll(() => savedSettings).not.toBeNull();
  expect(savedSettings).toMatchObject({
    reviewsEnabled: true,
    reviewsEyebrow: "Relatos verificados",
    reviewsTitle: "Quem comprou recomenda",
    reviewsItems: [
      {
        author: "Cliente teste",
        context: "Compra verificada",
        rating: 5,
        enabled: true,
      },
    ],
  });
});

test("Cabecalho aplica a paleta escolhida na pagina publica", async ({
  context,
  page,
}) => {
  test.setTimeout(90_000);
  await prepareAdmin(page);
  const runtimeErrors = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  let savedSettings = null;
  page.on("request", (request) => {
    if (
      request.method() === "PATCH" &&
      new URL(request.url()).pathname === "/admin/storefront"
    ) {
      savedSettings = request.postDataJSON();
    }
  });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${adminOrigin}/aparencia?tab=header`, {
    waitUntil: "domcontentloaded",
  });
  const headerFont = page.getByLabel("Fonte do cabecalho");
  await expect(headerFont.locator("option")).toHaveText([
    "Sans moderna",
    "Serif classica",
    "Sans humanista",
    "Serif editorial",
  ]);
  await headerFont.selectOption("classic");
  await page.getByLabel("Fundo do cabecalho").fill("#e7f0ed");
  await page.getByLabel("Textos do cabecalho").fill("#173c31");
  await page.getByLabel("Destaque do cabecalho").fill("#d7b56d");
  await page.getByLabel("Cores dos botoes").selectOption("custom");
  await page.getByLabel("Fundo dos botoes do cabecalho").fill("#102820");
  const headerButtonText = page.getByLabel("Texto dos botoes do cabecalho");
  await headerButtonText.fill("#d7b56d");
  await headerButtonText.blur();

  await page.getByRole("button", { name: "Salvar vitrine" }).click();
  await expect.poll(() => savedSettings).not.toBeNull();
  expect(runtimeErrors).toEqual([]);
  expect(savedSettings).toMatchObject({
    headerBackgroundColor: "#e7f0ed",
    headerTextColor: "#173c31",
    headerAccentColor: "#d7b56d",
    headerButtonMode: "custom",
    headerButtonBackgroundColor: "#102820",
    headerButtonTextColor: "#d7b56d",
    headerFontFamily: "classic",
  });

  const publicPage = await context.newPage();
  await publicPage.route("**/storefront/settings", (route) =>
    route.fulfill({ json: savedSettings }),
  );
  await publicPage.setViewportSize({ width: 1280, height: 900 });
  await publicPage.goto("http://localhost:5173", {
    waitUntil: "domcontentloaded",
  });
  const headerTokens = await publicPage
    .locator(".store-shell")
    .evaluate((element) => ({
      accent: getComputedStyle(element)
        .getPropertyValue("--color-header-accent")
        .trim(),
      background: getComputedStyle(element)
        .getPropertyValue("--color-header-background")
        .trim(),
      buttonForeground: getComputedStyle(element)
        .getPropertyValue("--color-header-button-foreground")
        .trim(),
      font: getComputedStyle(element).getPropertyValue("--header-font").trim(),
      foreground: getComputedStyle(element)
        .getPropertyValue("--color-header-foreground")
        .trim(),
    }));
  expect(headerTokens).toEqual({
    accent: "#d7b56d",
    background: "#e7f0ed",
    buttonForeground: "#d7b56d",
    font: 'Georgia, "Times New Roman", serif',
    foreground: "#173c31",
  });

  await publicPage.setViewportSize({ width: 390, height: 844 });
  await expect(
    publicPage.getByRole("button", { name: "Abrir menu" }),
  ).toBeVisible();
  expect(
    await publicPage
      .locator("html")
      .evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
  ).toBe(true);
  await publicPage.screenshot({
    path: "test-results/header-palette-mobile.png",
  });
  await publicPage.close();
});

test("Fontes e cores de Home, manifesto e Catalogo persistem sem aliases duplicados", async ({
  context,
  page,
}) => {
  test.setTimeout(120_000);
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
  await page.goto(`${adminOrigin}/aparencia?tab=content`, {
    waitUntil: "domcontentloaded",
  });

  const manifestoFont = page.getByLabel("Fonte do bloco 1");
  await expect(manifestoFont.locator("option")).toHaveText([
    "Herdar estilo do manifesto",
    "Sans moderna",
    "Serif classica",
    "Sans humanista",
    "Serif editorial",
  ]);
  await manifestoFont.selectOption("humanist");

  const featuredEyebrowStyle = page.getByRole("group", {
    name: "Etiqueta dos destaques",
    exact: true,
  });
  const featuredFont = featuredEyebrowStyle.getByLabel("Fonte do texto");
  await expect(featuredFont.locator("option")).toHaveText([
    "Padrao deste elemento",
    "Sans moderna",
    "Serif classica",
    "Sans humanista",
    "Serif editorial",
  ]);
  await featuredFont.selectOption("editorial");
  await featuredEyebrowStyle.getByLabel("Usar cor da paleta").uncheck();
  await featuredEyebrowStyle.getByLabel("Cor personalizada").fill("#6b1f3a");

  await page.getByRole("tab", { name: "Catalogo" }).click();
  const catalogTitleStyle = page.getByRole("group", {
    name: "Titulo do catalogo",
    exact: true,
  });
  await catalogTitleStyle.getByLabel("Fonte do texto").selectOption("classic");
  await catalogTitleStyle.getByLabel("Usar cor da paleta").uncheck();
  await catalogTitleStyle.getByLabel("Cor personalizada").fill("#173c31");

  await page.getByRole("button", { name: "Salvar vitrine" }).click();
  await expect.poll(() => savedSettings).not.toBeNull();
  expect(savedSettings.manifestoItems[0].fontFamily).toBe("humanist");
  expect(savedSettings.homeTextStyles.featuredEyebrow).toMatchObject({
    color: "#6b1f3a",
    fontFamily: "editorial",
  });
  expect(savedSettings.catalogTextStyles.title).toMatchObject({
    color: "#173c31",
    fontFamily: "classic",
  });

  const publicPage = await context.newPage();
  await publicPage.route("**/storefront/settings", (route) =>
    route.fulfill({ json: savedSettings }),
  );
  await publicPage.setViewportSize({ width: 1280, height: 900 });
  await publicPage.goto("http://localhost:5173", {
    waitUntil: "domcontentloaded",
  });
  await expect(
    publicPage.locator(".editorial-statement__line").first(),
  ).toBeVisible({
    timeout: 20_000,
  });
  await expect(publicPage.locator(".featured-collection")).toBeVisible({
    timeout: 20_000,
  });
  const homeTypography = await publicPage.evaluate(() => {
    const featured = document.querySelector(
      ".section-heading--featured .section-heading__copy > p",
    );
    const manifesto = document.querySelector(".editorial-statement__line");
    return {
      featuredColor: featured ? getComputedStyle(featured).color : "",
      featuredFont: featured ? getComputedStyle(featured).fontFamily : "",
      manifestoFont: manifesto ? getComputedStyle(manifesto).fontFamily : "",
    };
  });
  expect(homeTypography.featuredColor).toBe("rgb(107, 31, 58)");
  expect(homeTypography.featuredFont).toContain("Palatino");
  expect(homeTypography.manifestoFont).toContain("Trebuchet MS");

  await publicPage.goto("http://localhost:5173/catalogo", {
    waitUntil: "domcontentloaded",
  });
  const catalogTitle = publicPage.locator(".catalog-intro h1");
  await expect(catalogTitle).toHaveCSS("color", "rgb(23, 60, 49)");
  expect(
    await catalogTitle.evaluate(
      (element) => getComputedStyle(element).fontFamily,
    ),
  ).toContain("Georgia");
  await publicPage.close();
});

test("busca global localiza paginas e etapas sem alterar configuracoes", async ({
  page,
}) => {
  await prepareAdmin(page);
  let storefrontUpdates = 0;
  page.on("request", (request) => {
    if (
      request.method() === "PATCH" &&
      new URL(request.url()).pathname === "/admin/storefront"
    ) {
      storefrontUpdates += 1;
    }
  });

  await page.goto(`${adminOrigin}/aparencia?tab=brand`, {
    waitUntil: "domcontentloaded",
  });
  const search = page.getByPlaceholder("Buscar pagina ou configuracao");
  await expect(search).toBeVisible();
  await page.waitForTimeout(500);
  await search.fill("catalogo");
  await page.getByRole("option", { name: /Catalogo da vitrine/ }).click();
  await expect(page).toHaveURL(/\/aparencia\?tab=catalog/);
  await expect(page.getByRole("tab", { name: "Catalogo" })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  await search.fill("cabecalho");
  await page.getByRole("option", { name: /Cabecalho da vitrine/ }).click();
  await expect(page).toHaveURL(/\/aparencia\?tab=header/);
  await expect(page.getByRole("tab", { name: "Cabecalho" })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  await search.fill("configuracao inexistente");
  await expect(
    page.getByText("Nenhuma pagina ou configuracao encontrada."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Limpar busca" }).click();
  await expect(search).toHaveValue("");
  expect(storefrontUpdates).toBe(0);
});

test("Cabecalho e Catalogo mantem configuracoes visuais independentes", async ({
  context,
  page,
}) => {
  test.setTimeout(120_000);
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
  await page.goto(`${adminOrigin}/aparencia?tab=header`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByRole("tab", { name: "Cabecalho" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.getByLabel("Fundo do cabecalho").fill("#123c35");
  await page.getByLabel("Fonte do cabecalho").selectOption("humanist");
  await page.getByRole("slider", { name: "Altura do cabecalho" }).fill("84");
  await page
    .getByRole("slider", { name: "Largura maxima da logo" })
    .fill("340");
  await page
    .getByRole("combobox", { name: "Visual dos botoes", exact: true })
    .selectOption("outline");
  await page
    .getByRole("slider", { name: "Arredondamento dos botoes" })
    .fill("12");

  await page.getByRole("tab", { name: "Catalogo" }).click();
  await page.getByLabel("Fundo do catalogo").fill("#edf4f0");
  await page.getByLabel("Texto principal do catalogo").fill("#173c31");
  await page.getByLabel("Destaque do catalogo").fill("#28785f");
  await page.getByLabel("Estilo dos cards do catalogo").selectOption("minimal");
  await page.getByLabel("Proporcao das imagens").selectOption("portrait");
  await page
    .getByLabel("Visual dos botoes do catalogo")
    .selectOption("outline");
  await page.getByLabel("Colunas no celular").selectOption("1");
  await page
    .getByRole("group", { name: "Titulo do catalogo", exact: true })
    .getByRole("slider", { name: "Tamanho do texto" })
    .fill("70");

  await page.getByRole("tab", { name: "Layout da Home" }).click();
  await page.getByRole("button", { name: "Restaurar esta etapa" }).click();
  await page.getByRole("tab", { name: "Cabecalho" }).click();
  await expect(page.getByLabel("Fundo do cabecalho")).toHaveValue("#123C35");
  await page.getByRole("tab", { name: "Catalogo" }).click();
  await expect(page.getByLabel("Fundo do catalogo")).toHaveValue("#EDF4F0");

  const livePreview = page.locator(".storefront-live-preview");
  const previewFrame = page.frameLocator(".storefront-live-preview iframe");
  await expect(
    page.getByRole("button", { name: "Catalogo", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(livePreview).toHaveAttribute(
    "data-live-preview-status",
    "synced",
    { timeout: 20_000 },
  );
  await expect(previewFrame.locator(".catalog-page")).toBeVisible();
  await expect(previewFrame.locator(".catalog-page")).toHaveAttribute(
    "data-image-ratio",
    "portrait",
  );
  await page.getByRole("button", { name: "Celular" }).click();
  await expect
    .poll(() => previewFrame.locator("html").evaluate(() => window.innerWidth))
    .toBe(390);
  await expect(previewFrame.locator(".catalog-intro")).toBeVisible();
  await expect(
    previewFrame.getByText(/\d+ produtos? carregados?/, { exact: true }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(previewFrame.locator(".product-card").first()).toBeVisible();
  expect(
    await previewFrame
      .locator("html")
      .evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
  ).toBe(true);
  await livePreview.screenshot({
    path: "test-results/admin-catalog-live-preview-mobile.png",
  });

  await page.getByRole("button", { name: "Salvar vitrine" }).click();
  await expect.poll(() => savedSettings).not.toBeNull();
  expect(savedSettings).toMatchObject({
    headerBackgroundColor: "#123c35",
    headerFontFamily: "humanist",
    headerHeight: 84,
    headerLogoWidth: 340,
    headerButtonStyle: "outline",
    headerButtonRadius: 12,
    catalogBackgroundColor: "#edf4f0",
    catalogTextColor: "#173c31",
    catalogAccentColor: "#28785f",
    catalogCardStyle: "minimal",
    catalogImageRatio: "portrait",
    catalogButtonStyle: "outline",
    catalogColumnsMobile: 1,
  });
  expect(savedSettings.catalogTextStyles.title.fontSize).toBe(70);
  expect(savedSettings.homeSurfaceColor).not.toBe("#edf4f0");

  const publicPage = await context.newPage();
  await publicPage.route("**/storefront/settings", (route) =>
    route.fulfill({ json: savedSettings }),
  );
  await publicPage.setViewportSize({ width: 390, height: 844 });
  await publicPage.goto("http://localhost:5173", {
    waitUntil: "domcontentloaded",
  });
  await expect(publicPage.locator(".site-header")).toHaveAttribute(
    "data-button-style",
    "outline",
  );
  expect(
    await publicPage.locator(".store-shell").evaluate((element) => ({
      header: getComputedStyle(element)
        .getPropertyValue("--color-header-background")
        .trim(),
      home: getComputedStyle(element)
        .getPropertyValue("--color-home-surface-alt")
        .trim(),
    })),
  ).toMatchObject({ header: "#123c35" });

  await publicPage.goto("http://localhost:5173/catalogo", {
    waitUntil: "domcontentloaded",
  });
  const catalogTokens = await publicPage
    .locator(".catalog-page")
    .evaluate((element) => ({
      background: getComputedStyle(element)
        .getPropertyValue("--catalog-background")
        .trim(),
      columns: getComputedStyle(element)
        .getPropertyValue("--catalog-columns-mobile")
        .trim(),
      titleSize: getComputedStyle(element)
        .getPropertyValue("--catalog-text-title-size")
        .trim(),
    }));
  expect(catalogTokens).toEqual({
    background: "#edf4f0",
    columns: "1",
    titleSize: "70px",
  });
  await publicPage.close();
});
