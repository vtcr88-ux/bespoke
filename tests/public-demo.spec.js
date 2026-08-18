// @ts-check
import { expect, test } from "@playwright/test";

const publicDemoUrl = (process.env.PUBLIC_DEMO_URL ?? "").replace(/\/$/, "");

test.describe("Demonstracao publica", () => {
  test.skip(!publicDemoUrl, "Defina PUBLIC_DEMO_URL para testar o tunel publico.");
  test.describe.configure({ mode: "serial", timeout: 60_000 });
  test.use({
    extraHTTPHeaders: { "ngrok-skip-browser-warning": "true" },
  });

  for (const viewport of [
    { name: "mobile", width: 390, height: 844 },
    { name: "tablet", width: 820, height: 1180 },
    { name: "desktop", width: 1440, height: 900 },
  ]) {
    test(`carrega a vitrine e os uploads em ${viewport.name}`, async ({
      page,
    }) => {
      const failedResponses = [];
      page.on("response", (response) => {
        if (
          response.url().startsWith(publicDemoUrl) &&
          response.status() >= 400
        ) {
          failedResponses.push(`${response.status()} ${response.url()}`);
        }
      });

      await page.setViewportSize(viewport);
      const response = await page.goto(publicDemoUrl, {
        waitUntil: "domcontentloaded",
      });

      expect(response?.status()).toBe(200);
      await expect(page.locator(".site-header")).toBeVisible();
      await expect(page.locator(".hero")).toBeVisible();
      await page.waitForLoadState("load");

      const managedImages = page.locator(
        `img[src^="${publicDemoUrl}/uploads/images/"]`,
      );
      expect(await managedImages.count()).toBeGreaterThan(0);
      await expect
        .poll(async () =>
          managedImages.evaluateAll((images) =>
            images.every(
              (image) =>
                image instanceof HTMLImageElement && image.naturalWidth > 0,
            ),
          ),
        )
        .toBe(true);

      const logoImages = page.locator(
        '.brand__mark img[src*="variant=logo"]',
      );
      expect(await logoImages.count()).toBeGreaterThan(0);
      await expect
        .poll(async () =>
          logoImages.first().evaluate(
            (image) =>
              image instanceof HTMLImageElement &&
              image.naturalWidth > image.naturalHeight,
          ),
        )
        .toBe(true);

      await page.locator(".site-footer").scrollIntoViewIfNeeded();
      await expect(page.locator(".site-footer")).toBeVisible();

      const layout = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
      }));
      expect(layout.documentWidth).toBeLessThanOrEqual(
        layout.viewportWidth + 1,
      );
      expect(failedResponses).toEqual([]);

      await page.screenshot({
        path: `test-results/public-demo-${viewport.name}.png`,
        fullPage: true,
      });
    });
  }

  test("adiciona um produto e abre o carrinho automaticamente no celular", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${publicDemoUrl}/catalogo`, {
      waitUntil: "domcontentloaded",
    });

    const addButton = page.locator(".product-card__button").first();
    await addButton.scrollIntoViewIfNeeded();
    await expect(addButton).toBeVisible();
    await addButton.click();

    await expect(page).toHaveURL(`${publicDemoUrl}/carrinho`);
    await expect(page.locator(".cart-line").first()).toBeVisible();
    const layout = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
    }));
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
    await page.screenshot({
      path: "test-results/public-demo-cart-mobile.png",
      fullPage: true,
    });
  });

  test("mantem o painel administrativo fora do tunel", async ({ request }) => {
    const [pageResponse, apiResponse] = await Promise.all([
      request.get(`${publicDemoUrl}/admin`),
      request.get(`${publicDemoUrl}/api/admin/storefront`),
    ]);

    expect(pageResponse.status()).toBe(404);
    expect(apiResponse.status()).toBe(404);
  });
});
