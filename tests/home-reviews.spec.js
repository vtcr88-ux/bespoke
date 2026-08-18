// @ts-check
import { expect, test } from "@playwright/test";

const homeUrl = "http://localhost:5173";
const settingsUrl = "http://127.0.0.1:3333/storefront/settings";

async function configuredReviews(page) {
  const response = await page.request.get(settingsUrl);
  expect(response.ok()).toBe(true);
  const settings = await response.json();

  return {
    ...settings,
    reviewsEnabled: true,
    reviewsEyebrow: "Relatos reais",
    reviewsTitle: "Experiencias compartilhadas",
    reviewsSpeedSeconds: 24,
    reviewsBackgroundColor: "#f3efe8",
    reviewsCardColor: "#ffffff",
    homeMotionByBlock: {
      ...settings.homeMotionByBlock,
      reviews: "soft",
    },
    reviewsItems: [
      {
        id: "00000000-0000-4000-8000-000000000501",
        author: "Cliente um",
        context: "Compra verificada",
        content: "Atendimento cuidadoso e uma experiencia muito clara.",
        rating: 5,
        enabled: true,
      },
      {
        id: "00000000-0000-4000-8000-000000000502",
        author: "Cliente dois",
        context: "Pedido online",
        content: "O processo foi simples e o suporte respondeu rapidamente.",
        rating: 4,
        enabled: true,
      },
      {
        id: "00000000-0000-4000-8000-000000000503",
        author: "Cliente tres",
        context: "Atendimento pelo WhatsApp",
        content: "Consegui tirar minhas duvidas antes de concluir a compra.",
        rating: 5,
        enabled: true,
      },
    ],
  };
}

test.describe("Avaliacoes da Home", () => {
  test.describe.configure({ mode: "serial", timeout: 45_000 });

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ]) {
    test(`carrossel continuo e responsivo em ${viewport.width}px`, async ({
      page,
    }) => {
      const settings = await configuredReviews(page);
      await page.route("**/storefront/settings", (route) =>
        route.fulfill({ json: settings }),
      );
      await page.setViewportSize(viewport);
      await page.goto(homeUrl, { waitUntil: "domcontentloaded" });

      const section = page.locator(".reviews-section");
      await expect(section).toBeAttached();
      await section.scrollIntoViewIfNeeded();
      await expect(section).toBeVisible();
      await expect(section.getByRole("heading")).toHaveText(
        "Experiencias compartilhadas",
      );
      await expect(
        section.getByRole("button", { name: "Pausar" }),
      ).toBeVisible();

      const geometry = await section.evaluate(() => {
        const groups = [
          ...document.querySelectorAll(".reviews-carousel__group"),
        ];
        const first = groups[0]?.getBoundingClientRect();
        const second = groups[1]?.getBoundingClientRect();
        return {
          documentWidth: document.documentElement.scrollWidth,
          groupCount: groups.length,
          joinGap: first && second ? second.left - first.right : null,
          viewportWidth: document.documentElement.clientWidth,
        };
      });
      expect(geometry.documentWidth).toBeLessThanOrEqual(
        geometry.viewportWidth + 1,
      );
      expect(geometry.groupCount).toBe(2);
      expect(Math.abs(geometry.joinGap ?? 100)).toBeLessThanOrEqual(1);

      const track = section.locator(".reviews-carousel__track");
      const initialX = await track.evaluate(
        (element) =>
          new DOMMatrixReadOnly(getComputedStyle(element).transform).m41,
      );
      await page.waitForTimeout(700);
      const nextX = await track.evaluate(
        (element) =>
          new DOMMatrixReadOnly(getComputedStyle(element).transform).m41,
      );
      expect(Math.abs(nextX - initialX)).toBeGreaterThan(1);

      await section.getByRole("button", { name: "Pausar" }).click();
      const pausedX = await track.evaluate(
        (element) =>
          new DOMMatrixReadOnly(getComputedStyle(element).transform).m41,
      );
      await page.waitForTimeout(350);
      const stableX = await track.evaluate(
        (element) =>
          new DOMMatrixReadOnly(getComputedStyle(element).transform).m41,
      );
      expect(Math.abs(stableX - pausedX)).toBeLessThan(0.5);

      await page.screenshot({
        path: `test-results/home-reviews-${viewport.width}.png`,
      });
    });
  }

  test("movimento reduzido remove o loop e preserva a leitura", async ({
    page,
  }) => {
    const settings = await configuredReviews(page);
    await page.route("**/storefront/settings", (route) =>
      route.fulfill({ json: settings }),
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(homeUrl, { waitUntil: "domcontentloaded" });

    const section = page.locator(".reviews-section");
    await section.scrollIntoViewIfNeeded();
    await expect(section.locator(".reviews-carousel__group")).toHaveCount(1);
    await expect(section.getByRole("button", { name: "Pausar" })).toHaveCount(
      0,
    );
    await expect(section.locator(".review-card")).toHaveCount(3);
    await expect(section.locator(".reviews-carousel__track")).toHaveCSS(
      "transform",
      "none",
    );
  });
});
