// @ts-check
import { expect, test } from "@playwright/test";

const publicUrl = (
  process.env.STOREFRONT_TEST_URL ?? "http://localhost:5173"
).replace(/\/$/, "");

async function scrollToBottomImmediately(page) {
  await page.evaluate(() => {
    const root = document.documentElement;
    const previousScrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    window.scrollTo(0, document.body.scrollHeight);
    root.style.scrollBehavior = previousScrollBehavior;
  });
}

async function expectPageAtTop(page) {
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeLessThanOrEqual(1);

  const dimensions = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.documentWidth).toBeLessThanOrEqual(
    dimensions.viewportWidth + 1,
  );
}

test.describe("Rolagem entre rotas da vitrine", () => {
  test.describe.configure({ mode: "serial", timeout: 45_000 });

  test.beforeEach(async ({ context }) => {
    if (!new URL(publicUrl).hostname.endsWith(".ngrok-free.dev")) return;
    await context.setExtraHTTPHeaders({
      "ngrok-skip-browser-warning": "bespoke-playwright",
    });
  });

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
  ]) {
    test(`abre catalogo e checkout pelo topo em ${viewport.width}px`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto(publicUrl, { waitUntil: "domcontentloaded" });
      await expect(page.locator(".site-footer")).toBeAttached();
      await scrollToBottomImmediately(page);
      await expect
        .poll(() => page.evaluate(() => window.scrollY))
        .toBeGreaterThan(0);

      if (viewport.width < 760) {
        await page.getByRole("button", { name: "Abrir menu" }).click();
        await page
          .locator(".main-nav--mobile")
          .getByRole("link", { name: "Catalogo", exact: true })
          .click();
      } else {
        await page
          .locator(".main-nav--desktop")
          .getByRole("link", { name: "Catalogo", exact: true })
          .click();
      }

      await expect(page).toHaveURL(/\/catalogo$/);
      await expect(page.locator(".catalog-page")).toBeVisible();
      await expectPageAtTop(page);

      const catalogResponse = await page.request.get(
        `${publicUrl}/api/catalog/products?limit=1`,
      );
      expect(catalogResponse.ok()).toBe(true);
      const product = (await catalogResponse.json()).items[0];
      expect(product).toBeTruthy();
      await page.evaluate((cartProduct) => {
        window.localStorage.setItem(
          "bespoke-cart-v1",
          JSON.stringify({
            state: {
              items: [
                {
                  id: cartProduct.id,
                  slug: cartProduct.slug,
                  name: cartProduct.name,
                  sku: cartProduct.sku,
                  priceInCents: cartProduct.priceInCents,
                  imageUrl: cartProduct.images[0].url,
                  quantity: 1,
                },
              ],
            },
            version: 0,
          }),
        );
      }, product);
      await page.goto(`${publicUrl}/carrinho`, {
        waitUntil: "domcontentloaded",
      });
      await expect(
        page.getByRole("heading", { name: "Carrinho" }),
      ).toBeVisible();

      const checkoutButton = page.getByRole("button", {
        name: /Comprar online/,
      });
      await scrollToBottomImmediately(page);
      await expect
        .poll(() => page.evaluate(() => window.scrollY))
        .toBeGreaterThan(0);
      await checkoutButton.scrollIntoViewIfNeeded();
      await expect
        .poll(() => page.evaluate(() => window.scrollY))
        .toBeGreaterThan(0);
      await checkoutButton.click();

      await expect(page).toHaveURL(/\/checkout$/);
      await expect(
        page.getByRole("heading", { name: /Finalize com acompanhamento/ }),
      ).toBeVisible();
      await expectPageAtTop(page);

      await page.screenshot({
        path: `test-results/storefront-route-top-${viewport.width}.png`,
        fullPage: false,
      });
    });
  }
});
