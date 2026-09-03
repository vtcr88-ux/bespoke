import { expect, test } from "@playwright/test";

const homeUrl = "http://localhost:5173";
const settingsUrl = "http://127.0.0.1:3333/storefront/settings";

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
  { name: "mobile-small", width: 320, height: 568 },
];

test.describe("Home comercial responsiva", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 });

  for (const viewport of viewports) {
    test(`${viewport.name} preserva categorias, produtos, compra e rodape`, async ({
      page,
    }) => {
      const runtimeErrors = [];
      page.on("pageerror", (error) => runtimeErrors.push(error.message));

      const settingsResponse = await page.request.get(settingsUrl);
      expect(settingsResponse.ok()).toBe(true);
      const settings = await settingsResponse.json();
      await page.route("**/storefront/settings", (route) =>
        route.fulfill({
          json: { ...settings, productCardStyle: "ecommerce" },
        }),
      );

      await page.setViewportSize(viewport);
      await page.goto(homeUrl, { waitUntil: "domcontentloaded" });
      await expect(page.locator(".hero")).toBeVisible();
      await expect(page.locator(".home-page")).toHaveAttribute(
        "data-card-style",
        "ecommerce",
      );

      const categories = page.locator(".home-categories");
      await categories.scrollIntoViewIfNeeded();
      await expect(categories).toBeVisible({ timeout: 10_000 });
      await expect(
        categories.locator(".home-category-link").first(),
      ).toBeVisible();

      const featured = page.locator(".featured-collection");
      await featured.scrollIntoViewIfNeeded();
      await expect(featured.locator(".product-card").first()).toBeVisible({
        timeout: 10_000,
      });

      const commerce = page.locator(".home-commerce");
      await commerce.scrollIntoViewIfNeeded();
      await expect(commerce).toBeVisible();
      await expect(
        commerce.locator(".home-commerce__modes article"),
      ).toHaveCount(2);

      const footer = page.locator(".site-footer");
      await footer.scrollIntoViewIfNeeded();
      await expect(footer).toBeVisible();

      const layout = await page.evaluate(() => {
        const root = document.documentElement;
        const cards = [
          ...document.querySelectorAll(".product-grid--preview .product-card"),
        ]
          .slice(0, 2)
          .map((card) => card.getBoundingClientRect());
        const footerBrand = document
          .querySelector(".site-footer__brand")
          ?.getBoundingClientRect();
        const footerLinks = document
          .querySelector(".site-footer__links")
          ?.getBoundingClientRect();

        return {
          documentWidth: root.scrollWidth,
          viewportWidth: root.clientWidth,
          cardColumnsAligned:
            cards.length < 2 || Math.abs(cards[0].top - cards[1].top) <= 2,
          footerBrandLeft:
            !footerBrand || !footerLinks || footerBrand.left < footerLinks.left,
        };
      });

      expect(layout.documentWidth).toBeLessThanOrEqual(
        layout.viewportWidth + 1,
      );
      expect(layout.cardColumnsAligned).toBe(true);
      if (viewport.width <= 760) expect(layout.footerBrandLeft).toBe(true);
      expect(runtimeErrors).toEqual([]);

      await page.screenshot({
        fullPage: true,
        path: `test-results/home-commerce-${viewport.name}.png`,
      });
    });
  }
});
