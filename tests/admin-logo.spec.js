// @ts-check
import { expect, test } from "@playwright/test";

const adminUrl = "http://localhost:5174";
const publicUrl = "http://localhost:5173";

async function mockAuthenticatedAdmin(page) {
  await page.route("**/admin/**", async (route) => {
    const headers = {
      "access-control-allow-credentials": "true",
      "access-control-allow-headers": "content-type, x-csrf-token",
      "access-control-allow-methods": "GET, PATCH, POST, PUT, DELETE, OPTIONS",
      "access-control-allow-origin": "http://localhost:5174",
    };
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers });
      return;
    }

    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/admin/auth/session") {
      await route.fulfill({
        headers,
        json: {
          admin: { email: "owner@example.test", role: "owner" },
          csrfToken: "playwright-csrf-token",
          expiresAt: "2099-01-01T00:00:00.000Z",
        },
      });
      return;
    }
    if (pathname === "/admin/overview") {
      await route.fulfill({
        headers,
        json: {
          metrics: {
            confirmedRevenueInCents: 0,
            pendingOrders: 0,
            lowStockCount: 0,
            activeProducts: 0,
            inventoryValueInCents: 0,
          },
          alerts: [],
          recentOrders: [],
        },
      });
      return;
    }
    if (pathname === "/admin/storefront") {
      await route.fulfill({
        headers,
        json: { brandName: "Bespoke", adminFont: "signature" },
      });
      return;
    }
    await route.fulfill({ headers, json: { items: [] } });
  });
}

async function readLogoLayout(page) {
  return page.evaluate(() => {
    const frame = document.querySelector(".sidebar__logo-frame");
    const logo = document.querySelector(".sidebar__logo");
    if (
      !(frame instanceof HTMLElement) ||
      !(logo instanceof HTMLImageElement)
    ) {
      throw new Error("Logo administrativa nao encontrada");
    }

    const frameRect = frame.getBoundingClientRect();
    return {
      frameLeft: frameRect.left,
      frameRight: frameRect.right,
      frameWidth: frameRect.width,
      naturalHeight: logo.naturalHeight,
      naturalWidth: logo.naturalWidth,
      viewportWidth: document.documentElement.clientWidth,
    };
  });
}

test("nova logo fica restrita ao painel e responde aos breakpoints", async ({
  context,
  page,
}) => {
  test.setTimeout(60_000);
  await mockAuthenticatedAdmin(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(adminUrl, { waitUntil: "domcontentloaded" });

  const logo = page.getByAltText("Bespoke Admin");
  await expect(logo).toBeVisible();
  await expect(logo).toHaveAttribute("src", /bespoke-admin-logo/);

  const desktop = await readLogoLayout(page);
  expect(desktop.naturalWidth).toBe(1024);
  expect(desktop.naturalHeight).toBe(1024);
  expect(desktop.frameWidth).toBeCloseTo(120, 0);
  expect(desktop.frameLeft).toBeGreaterThanOrEqual(0);
  expect(desktop.frameRight).toBeLessThanOrEqual(desktop.viewportWidth);
  await page.screenshot({ path: "test-results/admin-logo-desktop.png" });

  await page.setViewportSize({ width: 1024, height: 900 });
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(logo).toBeVisible();
  const tablet = await readLogoLayout(page);
  expect(tablet.frameWidth).toBeCloseTo(52, 0);
  expect(tablet.frameRight).toBeLessThanOrEqual(tablet.viewportWidth);
  await page.screenshot({ path: "test-results/admin-logo-tablet.png" });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(logo).toBeVisible();
  const mobile = await readLogoLayout(page);
  expect(mobile.frameWidth).toBeCloseTo(92, 0);
  expect(mobile.frameRight).toBeLessThanOrEqual(mobile.viewportWidth);
  await page.screenshot({ path: "test-results/admin-logo-mobile.png" });

  const publicPage = await context.newPage();
  await publicPage.goto(publicUrl, { waitUntil: "domcontentloaded" });
  await expect(
    publicPage.locator('img[src*="bespoke-admin-logo"]'),
  ).toHaveCount(0);
  await publicPage.close();
});
