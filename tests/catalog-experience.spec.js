// @ts-check
import { expect, test } from "@playwright/test";

const publicUrl = "http://localhost:5173";
const settingsUrl = "http://127.0.0.1:3333/storefront/settings";

test.describe("Catalogo configuravel e responsivo", () => {
  test.describe.configure({ mode: "serial", timeout: 45_000 });

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ]) {
    test(`preserva hierarquia e navegacao em ${viewport.width}px`, async ({
      page,
    }) => {
      const response = await page.request.get(settingsUrl);
      expect(response.ok()).toBe(true);
      const settings = await response.json();
      await page.route("**/storefront/settings", (route) =>
        route.fulfill({
          json: {
            ...settings,
            catalogEyebrow: "Colecao atual",
            catalogTitle: "Escolhas para cada rotina",
            catalogDescription:
              "Compare produtos com calma e refine os resultados conforme sua necessidade.",
            catalogCardStyle: "ecommerce",
            catalogDensity: viewport.width === 1440 ? "compact" : "comfortable",
          },
        }),
      );
      await page.setViewportSize(viewport);
      await page.goto(`${publicUrl}/catalogo`, {
        waitUntil: "domcontentloaded",
      });

      await expect(
        page.getByRole("heading", { name: "Escolhas para cada rotina" }),
      ).toBeVisible();
      await expect(
        page.getByText("Colecao atual", { exact: true }),
      ).toBeVisible();
      await expect(page.locator(".product-card").first()).toBeVisible();
      await expect(page.locator(".catalog-page")).toHaveAttribute(
        "data-card-style",
        "ecommerce",
      );
      const productImages = page.locator(".product-card__image img");
      await expect(productImages).not.toHaveCount(0);
      for (let index = 0; index < (await productImages.count()); index += 1) {
        const image = productImages.nth(index);
        await image.scrollIntoViewIfNeeded();
        await expect
          .poll(() =>
            image.evaluate(
              (element) => element.complete && element.naturalWidth > 0,
            ),
          )
          .toBe(true);
      }
      expect(
        await productImages.evaluateAll((images) =>
          images.every(
            (image) =>
              new URL(image.currentSrc).origin === window.location.origin,
          ),
        ),
      ).toBe(true);

      const layout = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        introColumns: getComputedStyle(document.querySelector(".catalog-intro"))
          .gridTemplateColumns,
        viewportWidth: document.documentElement.clientWidth,
      }));
      expect(layout.documentWidth).toBeLessThanOrEqual(
        layout.viewportWidth + 1,
      );

      if (viewport.width <= 760) {
        expect(layout.introColumns.split(" ")).toHaveLength(1);
        await expect(
          page.getByRole("button", { name: "Abrir filtros" }),
        ).toBeVisible();
        const cards = page.locator(".product-card");
        const firstTop = await cards
          .first()
          .evaluate((element) => element.offsetTop);
        const firstRowCount = await cards.evaluateAll(
          (elements, top) =>
            elements.slice(0, 4).filter((element) => element.offsetTop === top)
              .length,
          firstTop,
        );
        expect(firstRowCount).toBe(Math.min(2, await cards.count()));
      } else {
        await expect(page.locator(".filters")).toBeVisible();
      }

      await page.screenshot({
        path: `test-results/catalog-${viewport.width}.png`,
      });
    });
  }
});
