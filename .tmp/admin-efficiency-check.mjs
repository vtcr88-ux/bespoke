import { chromium } from "@playwright/test";

const adminUrl = process.env.ADMIN_URL ?? "http://127.0.0.1:5180";
const apiHosts = new Set(["127.0.0.1:3333", "localhost:3333"]);
const imageUrl = "http://127.0.0.1:3333/mock/product.svg";

const products = [
  makeProduct("00000000-0000-4000-8000-000000001001", "vestido-linho", 1),
  makeProduct("00000000-0000-4000-8000-000000001002", "bolsa-couro", 2),
  makeProduct("00000000-0000-4000-8000-000000001003", "colar-aurora", 3, {
    status: "inactive",
  }),
];

const orders = [
  makeOrder("AA-1001", 129900, "approved"),
  makeOrder("AA-1002", 45990, "pending"),
];

function makeProduct(id, slug, sortOrder, overrides = {}) {
  return {
    id,
    slug,
    sku: `SKU-${sortOrder}`,
    name:
      sortOrder === 1
        ? "Vestido Linho"
        : sortOrder === 2
          ? "Bolsa Couro"
          : "Colar Aurora",
    subtitle: "Edicao limitada",
    description:
      "Produto de curadoria autoral com informacoes suficientes para edicao e exportacao.",
    category: "Curadoria",
    categorySlug: "curadoria",
    priceInCents: 18990 + sortOrder * 1000,
    compareAtPriceInCents: null,
    stock: sortOrder === 2 ? 1 : 8,
    lowStockThreshold: 2,
    lowStockWarningEnabled: true,
    status: "active",
    lowStock: sortOrder === 2,
    imageUrl,
    imageAlt: "Produto em fundo claro",
    imageWidth: 1200,
    imageHeight: 900,
    imageContentType: "image/webp",
    imageSizeBytes: 1200,
    isFeatured: sortOrder < 3,
    sortOrder,
    ...overrides,
  };
}

function makeOrder(reference, totalInCents, paymentStatus) {
  return {
    id: `00000000-0000-4000-8000-000000002${reference.slice(-3)}`,
    publicReference: reference,
    customerName: "Cliente Aurora",
    customerEmail: "cliente@example.com",
    customerPhone: "5511999999999",
    status: paymentStatus === "approved" ? "paid" : "pending_payment",
    salesChannel: "online",
    paymentStatus,
    shippingMode: "manual",
    shippingStatus:
      paymentStatus === "approved" ? "awaiting_contact" : "awaiting_payment",
    contactStatus: "not_started",
    subtotalInCents: totalInCents,
    discountInCents: 0,
    shippingAmountInCents: null,
    totalInCents,
    currency: "BRL",
    shippingNotes: null,
    deliveryMethod: "undecided",
    deliveryAddress: null,
    pickupInstructions: null,
    shippingContactedAt: null,
    shippingArrangedAt: null,
    createdAt: "2026-08-06T12:00:00.000Z",
    updatedAt: "2026-08-06T12:15:00.000Z",
    items: [],
  };
}

async function json(route, body) {
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function installRoutes(context) {
  await context.route("**/*", async (route) => {
    const requestUrl = new URL(route.request().url());
    if (!apiHosts.has(requestUrl.host)) return route.continue();

    if (requestUrl.pathname === "/mock/product.svg") {
      return route.fulfill({
        status: 200,
        contentType: "image/svg+xml",
        body: `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><rect width="1200" height="900" fill="#f6f0e6"/><circle cx="600" cy="450" r="240" fill="#c9a76d"/></svg>`,
      });
    }

    if (requestUrl.pathname === "/admin/auth/session") {
      return json(route, {
        admin: { email: "admin@atelieaurora.com.br", role: "owner" },
        csrfToken: "qa-token",
        expiresAt: "2026-08-06T23:59:59.000Z",
      });
    }

    if (requestUrl.pathname === "/admin/storefront") {
      return json(route, {
        brandName: "Atelie Aurora",
        adminFont: "signature",
      });
    }

    if (requestUrl.pathname === "/admin/products") {
      return json(route, { items: products });
    }

    if (requestUrl.pathname.startsWith("/admin/products/")) {
      return json(route, products[0]);
    }

    if (requestUrl.pathname === "/catalog/categories") {
      return json(route, {
        items: [
          {
            id: "00000000-0000-4000-8000-000000003001",
            slug: "curadoria",
            name: "Curadoria",
            description: null,
          },
        ],
      });
    }

    if (requestUrl.pathname === "/admin/orders") {
      return json(route, { items: orders });
    }

    if (requestUrl.pathname === "/admin/overview") {
      return json(route, {
        metrics: {
          confirmedRevenueInCents: 129900,
          pendingOrders: 1,
          lowStockCount: 1,
          activeProducts: 2,
          inventoryValueInCents: 889900,
        },
        alerts: [],
        recentOrders: orders,
      });
    }

    if (requestUrl.pathname === "/admin/runtime") {
      return json(route, {
        instanceId: "qa",
        publicApiUrl: "http://127.0.0.1:3333",
        publicWebUrl: "http://127.0.0.1:5179",
      });
    }

    return json(route, {});
  });
}

const browser = await chromium.launch();
const results = [];
try {
  const context = await browser.newContext({
    acceptDownloads: true,
    viewport: { width: 1440, height: 980 },
  });
  await installRoutes(context);
  const page = await context.newPage();
  const problems = [];
  page.on("pageerror", (error) => problems.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(message.text());
  });

  await page.goto(`${adminUrl}/produtos`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Produtos" }).waitFor();
  await page.keyboard.press("/");
  const focusedPlaceholder = await page.evaluate(
    () => document.activeElement?.getAttribute("placeholder") ?? "",
  );
  await page.keyboard.type("Bolsa");
  await page.getByRole("heading", { name: "Produtos" }).click();
  const filteredDownloadPromise = page.waitForEvent("download");
  await page.keyboard.press("Control+Shift+E");
  const filteredDownload = await filteredDownloadPromise;

  await page.getByLabel("Buscar produto").fill("");
  await page.locator(".filters-row select").first().selectOption("all");
  await page
    .getByRole("checkbox", { name: "Selecionar Vestido Linho" })
    .check();
  await page.getByRole("checkbox", { name: "Selecionar Bolsa Couro" }).check();
  await page.getByText("2 produtos selecionados").waitFor();
  await page.screenshot({
    path: ".tmp/efficiency-products-bulk-desktop.png",
    fullPage: true,
  });
  const selectedDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar selecionados" }).click();
  const selectedDownload = await selectedDownloadPromise;
  await page.getByRole("button", { name: "Pausar" }).click();
  await page.getByText("2 produtos pausados.").waitFor();
  await page.locator(".admin-page").click({ position: { x: 8, y: 8 } });
  await page.keyboard.press("n");
  await page.getByRole("button", { name: "Cadastrar produto" }).waitFor();
  await page.screenshot({ path: ".tmp/efficiency-products-desktop.png", fullPage: true });

  await page.goto(`${adminUrl}/relatorios`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Relatorios" }).waitFor();
  const salesDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Vendas CSV" }).click();
  const salesDownload = await salesDownloadPromise;
  const summaryDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Resumo CSV" }).click();
  const summaryDownload = await summaryDownloadPromise;
  await page.setViewportSize({ width: 390, height: 1100 });
  await page.screenshot({ path: ".tmp/efficiency-reports-mobile.png", fullPage: true });

  results.push({
    focusedPlaceholder,
    downloads: [
      filteredDownload.suggestedFilename(),
      selectedDownload.suggestedFilename(),
      salesDownload.suggestedFilename(),
      summaryDownload.suggestedFilename(),
    ],
    problems,
  });
  await context.close();
} finally {
  await browser.close();
}

console.log(JSON.stringify(results, null, 2));

if (results.some((result) => result.problems.length)) {
  process.exit(1);
}
