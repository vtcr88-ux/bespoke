// @ts-check
import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const adminOrigin = "http://localhost:4174";
const contentTypes = {
  ".css": "text/css",
  ".html": "text/html",
  ".js": "text/javascript",
  ".png": "image/png",
};

const item = {
  productId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
  name: "Produto real",
  sku: "PROD-REAL",
  quantity: 2,
  unitPriceInCents: 5000,
  subtotalInCents: 10000,
  imageUrl: "https://example.test/produto.png",
};

function order(overrides) {
  return {
    id: crypto.randomUUID(),
    publicReference: "PED-BASE-001",
    customerName: "Cliente",
    customerEmail: "cliente@example.test",
    customerPhone: "11999999999",
    status: "paid",
    salesChannel: "online",
    paymentStatus: "approved",
    shippingMode: "whatsapp_after_payment",
    shippingStatus: "awaiting_contact",
    contactStatus: "not_started",
    subtotalInCents: 10000,
    discountInCents: 0,
    shippingAmountInCents: null,
    totalInCents: 10000,
    currency: "BRL",
    shippingNotes: null,
    deliveryMethod: "undecided",
    deliveryAddress: null,
    pickupInstructions: null,
    shippingContactedAt: null,
    shippingArrangedAt: null,
    revenueConfirmedAt: "2026-08-03T15:00:00.000Z",
    archivedAt: null,
    createdAt: "2026-08-03T14:00:00.000Z",
    updatedAt: "2026-08-03T15:00:00.000Z",
    items: [item],
    ...overrides,
  };
}

async function prepareAdmin(page) {
  const distRoot = resolve(process.cwd(), "apps/admin/dist");
  let activeOrders = [
    order({ publicReference: "PED-AGO-03" }),
    order({
      publicReference: "PED-AGO-02",
      createdAt: "2026-08-02T10:00:00.000Z",
      updatedAt: "2026-08-02T10:00:00.000Z",
      salesChannel: "whatsapp",
      status: "contact_requested",
      paymentStatus: null,
      revenueConfirmedAt: null,
      totalInCents: 7500,
      subtotalInCents: 7500,
    }),
    order({
      publicReference: "PED-JUL-31",
      createdAt: "2026-07-31T10:00:00.000Z",
      updatedAt: "2026-07-31T10:00:00.000Z",
      revenueConfirmedAt: "2026-07-31T11:00:00.000Z",
      totalInCents: 5000,
      subtotalInCents: 5000,
    }),
  ];
  let archivedOrders = [];

  await page.route(`${adminOrigin}/**`, async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const assetPath = pathname.startsWith("/assets/")
      ? resolve(distRoot, `.${pathname}`)
      : resolve(distRoot, "index.html");
    if (
      assetPath !== resolve(distRoot, "index.html") &&
      !assetPath.startsWith(`${distRoot}${sep}`)
    ) {
      await route.fulfill({ status: 404, body: "Not found" });
      return;
    }
    await route.fulfill({
      body: await readFile(assetPath),
      contentType: contentTypes[extname(assetPath)] ?? "application/octet-stream",
    });
  });

  await page.route("**/catalog/categories", (route) =>
    route.fulfill({ json: { items: [] } }),
  );
  await page.route("**/admin/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const headers = {
      "access-control-allow-credentials": "true",
      "access-control-allow-headers": "content-type, x-csrf-token",
      "access-control-allow-methods": "GET, PATCH, POST, OPTIONS",
      "access-control-allow-origin": adminOrigin,
    };
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers });
      return;
    }
    if (url.pathname === "/admin/auth/session") {
      await route.fulfill({
        headers,
        json: {
          admin: { email: "owner@example.test", role: "owner" },
          csrfToken: "csrf-test",
          expiresAt: "2099-01-01T00:00:00.000Z",
        },
      });
      return;
    }
    if (url.pathname === "/admin/storefront") {
      await route.fulfill({ headers, json: { brandName: "Bespoke" } });
      return;
    }
    if (url.pathname === "/admin/products") {
      await route.fulfill({
        headers,
        json: {
          items: [
            ...Array.from({ length: 5 }, (_, index) => ({
              id: `active-${index}`,
              status: "active",
            })),
            ...Array.from({ length: 2 }, (_, index) => ({
              id: `inactive-${index}`,
              status: "inactive",
            })),
          ],
        },
      });
      return;
    }
    if (url.pathname === "/admin/overview") {
      const confirmed = activeOrders.filter((candidate) => candidate.revenueConfirmedAt);
      await route.fulfill({
        headers,
        json: {
          metrics: {
            confirmedRevenueInCents: confirmed.reduce((sum, candidate) => sum + candidate.totalInCents, 0),
            pendingOrders: 1,
            lowStockCount: 0,
            activeProducts: 5,
            activeStockUnits: 37,
            inventoryValueInCents: 2124500,
          },
          revenueByChannel: {
            online: confirmed.filter((candidate) => candidate.salesChannel === "online").reduce((sum, candidate) => sum + candidate.totalInCents, 0),
            whatsapp: confirmed.filter((candidate) => candidate.salesChannel === "whatsapp").reduce((sum, candidate) => sum + candidate.totalInCents, 0),
          },
          monthlyRevenue: [
            { month: "2026-08", onlineInCents: 10000, whatsappInCents: 0, totalInCents: 10000 },
            { month: "2026-07", onlineInCents: 5000, whatsappInCents: 0, totalInCents: 5000 },
          ],
          alerts: [],
          recentOrders: activeOrders.slice(0, 6),
        },
      });
      return;
    }
    if (url.pathname === "/admin/orders" && request.method() === "GET") {
      await route.fulfill({
        headers,
        json: { items: url.searchParams.get("archived") === "true" ? archivedOrders : activeOrders },
      });
      return;
    }
    if (url.pathname.endsWith("/whatsapp-revenue")) {
      const reference = decodeURIComponent(url.pathname.split("/").at(-2));
      activeOrders = activeOrders.map((candidate) =>
        candidate.publicReference === reference
          ? { ...candidate, revenueConfirmedAt: request.postDataJSON().confirmed ? "2026-08-13T12:00:00.000Z" : null }
          : candidate,
      );
      await route.fulfill({ headers, json: activeOrders.find((candidate) => candidate.publicReference === reference) });
      return;
    }
    if (url.pathname === "/admin/orders/archive") {
      const payload = request.postDataJSON();
      if (payload.archived) {
        archivedOrders = activeOrders.map((candidate) => ({ ...candidate, archivedAt: "2026-08-13T12:00:00.000Z" }));
        activeOrders = [];
      } else {
        activeOrders = archivedOrders.map((candidate) => ({ ...candidate, archivedAt: null }));
        archivedOrders = [];
      }
      await route.fulfill({ headers, json: { changed: payload.references.length } });
      return;
    }
    await route.fulfill({ headers, json: { items: [] } });
  });
}

test("Pedidos e Relatorios usam periodos, receita real e historico reversivel", async ({ page }) => {
  test.setTimeout(120_000);
  await prepareAdmin(page);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${adminOrigin}/`);
  const activeMetric = page.locator(".metric-card").filter({ hasText: "Produtos ativos" });
  await expect(activeMetric).toContainText("5");
  await expect(activeMetric).toContainText("37 unidades");
  await expect(activeMetric).not.toContainText("R$ 21.245,00");
  await expect(page.locator(".metric-card").filter({ hasText: "Valor do estoque ativo" })).toContainText("R$ 21.245,00");

  await page.goto(`${adminOrigin}/pedidos`);
  await expect(
    page.locator(".order-history").getByText("agosto de 2026", { exact: false }),
  ).toBeVisible();
  await expect(page.getByText("julho de 2026", { exact: false })).toBeVisible();
  await expect(page.locator(".order-history__day")).toHaveCount(3);
  await page
    .locator(".order-history__day")
    .filter({ hasText: "PED-AGO-02" })
    .locator("summary")
    .click();
  await page.getByRole("button", { name: "Confirmar venda" }).click();
  await expect(page.getByText("Receita do pedido atualizada.")).toBeVisible();

  await page.getByRole("button", { name: "Arquivar historico atual" }).click();
  await page.locator(".delete-confirmation").getByRole("button", { name: "Confirmar" }).click();
  await expect(page.getByText(/3 pedidos arquivados/)).toBeVisible();
  await page.getByRole("button", { name: "Ver arquivados" }).click();
  await expect(page.getByText("PED-AGO-03")).toBeVisible();
  await page.getByRole("button", { name: "Restaurar este historico" }).click();
  await page.locator(".delete-confirmation").getByRole("button", { name: "Confirmar" }).click();
  await expect(page.getByText(/3 pedidos restaurados/)).toBeVisible();
  await page.getByRole("button", { name: "Ver atuais" }).click();
  await expect(page.getByText("PED-AGO-03")).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${adminOrigin}/relatorios`);
  await expect(page.getByRole("heading", { name: "Receita confirmada por mes" })).toBeVisible();
  const activeProductsExport = page
    .locator(".report-export-actions > div")
    .filter({ hasText: "produtos ativos" });
  await expect(activeProductsExport).toContainText("5");
  await expect(activeProductsExport).toContainText(
    "2 preservados somente no historico",
  );
  await expect(activeProductsExport).not.toContainText(/^7$/);

  const inventoryMetric = page
    .locator(".metric-card")
    .filter({ hasText: "Valor do estoque ativo" });
  const inventoryDimensions = await inventoryMetric.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(inventoryDimensions.scrollWidth).toBeLessThanOrEqual(
    inventoryDimensions.clientWidth,
  );
  await expect(
    page.locator(".monthly-revenue").getByText("agosto de 2026", { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pedidos por mes e dia" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.screenshot({ path: "test-results/admin-orders-reporting-mobile.png", fullPage: true });
});
