// @ts-check
import { expect, test } from "@playwright/test";
import {
  authenticateAdmin,
  hasAdminTestCredentials,
} from "./helpers/admin-session.js";

const publicUrl = "http://localhost:5173";
const adminUrl = "http://localhost:5174/aparencia";
const settingsUrl = "http://127.0.0.1:3333/storefront/settings";
const adminSettingsUrl = "http://127.0.0.1:3333/admin/storefront";

async function readHeroMetrics(page) {
  return page.evaluate(() => {
    const eyebrow = document.querySelector(".hero__eyebrow");
    const title = document.querySelector(".hero h1");
    const stage = document
      .querySelector(".hero__product-stage")
      ?.getBoundingClientRect();

    if (!eyebrow || !title || !stage) {
      throw new Error("Capa com produtos nao encontrada");
    }

    const eyebrowRect = eyebrow.getBoundingClientRect();
    const titleRange = document.createRange();
    titleRange.selectNodeContents(title);
    const titleRect = titleRange.getBoundingClientRect();
    const leftProduct = {
      left: stage.left + (335 / 1536) * stage.width,
      top: stage.top + (218 / 878) * stage.height,
    };

    const clientWidth = document.documentElement.clientWidth;
    const scrollWidth = document.documentElement.scrollWidth;
    const overflowSources = [...document.body.querySelectorAll("*")]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          element: `${element.tagName.toLowerCase()}.${element.className}`,
          left: Math.round(rect.left),
          right: Math.round(rect.right),
        };
      })
      .filter(({ left, right }) => left < -1 || right > clientWidth + 1)
      .slice(0, 8);

    return {
      clientWidth,
      eyebrowBottom: eyebrowRect.bottom,
      eyebrowSize: Number.parseFloat(getComputedStyle(eyebrow).fontSize),
      horizontalOverflow: scrollWidth > clientWidth,
      leftProduct,
      overflowSources,
      scrollWidth,
      titleLeft: titleRect.left,
      titleRight: titleRect.right,
      titleTop: titleRect.top,
      titleBottom: titleRect.bottom,
      titleSize: Number.parseFloat(getComputedStyle(title).fontSize),
    };
  });
}

test("admin controla escala e respiro da tipografia da capa", async ({
  context,
  page,
  request,
}) => {
  test.skip(
    !hasAdminTestCredentials(),
    "Credenciais E2E do admin nao configuradas.",
  );
  test.setTimeout(60_000);
  const adminHeaders = await authenticateAdmin(page.request);
  const settingsResponse = await request.get(settingsUrl);
  expect(settingsResponse.ok()).toBe(true);
  const originalSettings = await settingsResponse.json();
  const publicPage = await context.newPage();

  try {
    await publicPage.setViewportSize({ width: 1440, height: 900 });
    await publicPage.emulateMedia({ reducedMotion: "reduce" });
    await publicPage.goto(publicUrl, { waitUntil: "domcontentloaded" });
    await expect(publicPage.locator(".hero__content")).toBeVisible();

    await page.goto(adminUrl, { waitUntil: "domcontentloaded" });
    await page.getByRole("tab", { name: "Conteudo" }).click();
    const eyebrowSize = page.getByRole("slider", {
      name: "Tamanho da etiqueta",
    });
    const titleSize = page.getByRole("slider", {
      name: "Tamanho do titulo",
    });
    await expect(titleSize).toBeVisible();

    const previewTitle = page.locator(".appearance-preview__hero h2");
    const previewEyebrow = page.locator(".appearance-preview__hero p");
    const previousPreviewSize = Number.parseFloat(
      await previewTitle.evaluate(
        (element) => getComputedStyle(element).fontSize,
      ),
    );

    await eyebrowSize.fill("14");
    await titleSize.fill("48");

    const previewMetrics = await page.evaluate(() => {
      const eyebrow = document.querySelector(".appearance-preview__hero p");
      const title = document.querySelector(".appearance-preview__hero h2");
      if (!eyebrow || !title) throw new Error("Preview da capa nao encontrado");
      const eyebrowRect = eyebrow.getBoundingClientRect();
      const titleRect = title.getBoundingClientRect();
      return {
        gap: titleRect.top - eyebrowRect.bottom,
        eyebrowSize: Number.parseFloat(getComputedStyle(eyebrow).fontSize),
        titleSize: Number.parseFloat(getComputedStyle(title).fontSize),
      };
    });
    expect(previewMetrics.eyebrowSize).toBe(14);
    expect(previewMetrics.titleSize).toBeLessThan(previousPreviewSize);
    expect(previewMetrics.gap).toBeLessThanOrEqual(6);

    await page.getByRole("button", { name: "Salvar vitrine" }).click();
    await expect(
      page.getByText("Configuracoes da vitrine salvas."),
    ).toBeVisible();

    await expect
      .poll(async () => {
        const response = await request.get(settingsUrl);
        const settings = await response.json();
        return [settings.heroEyebrowFontSize, settings.heroTitleFontSize];
      })
      .toEqual([14, 48]);

    await expect
      .poll(async () => (await readHeroMetrics(publicPage)).titleSize)
      .toBeLessThanOrEqual(48);

    const desktop = await readHeroMetrics(publicPage);
    expect(desktop.eyebrowSize).toBe(14);
    expect(desktop.titleTop - desktop.eyebrowBottom).toBeLessThanOrEqual(8);
    expect(desktop.leftProduct.left - desktop.titleRight).toBeGreaterThan(32);
    expect(desktop.horizontalOverflow).toBe(false);
    await publicPage.screenshot({
      path: "test-results/hero-typography-desktop.png",
    });

    await publicPage.setViewportSize({ width: 820, height: 1180 });
    await publicPage.reload({ waitUntil: "domcontentloaded" });
    await expect(publicPage.locator(".hero__content")).toBeVisible();
    const tablet = await readHeroMetrics(publicPage);
    expect(tablet.titleLeft).toBeGreaterThanOrEqual(0);
    expect(tablet.titleRight).toBeLessThanOrEqual(820);
    expect(tablet.titleBottom).toBeLessThan(tablet.leftProduct.top);
    expect(tablet.horizontalOverflow, JSON.stringify(tablet, null, 2)).toBe(
      false,
    );
    await publicPage.screenshot({
      path: "test-results/hero-typography-tablet.png",
    });

    await publicPage.setViewportSize({ width: 390, height: 844 });
    await publicPage.reload({ waitUntil: "domcontentloaded" });
    await expect(publicPage.locator(".hero__content")).toBeVisible();
    const mobile = await readHeroMetrics(publicPage);
    expect(mobile.titleLeft).toBeGreaterThanOrEqual(0);
    expect(mobile.titleRight).toBeLessThanOrEqual(390);
    expect(mobile.titleBottom).toBeLessThan(mobile.leftProduct.top);
    expect(mobile.horizontalOverflow, JSON.stringify(mobile, null, 2)).toBe(
      false,
    );
    await publicPage.screenshot({
      path: "test-results/hero-typography-mobile.png",
    });

    expect((await readHeroMetrics(publicPage)).titleSize).toBeLessThanOrEqual(
      48,
    );
  } finally {
    const restoreResponse = await page.request.patch(adminSettingsUrl, {
      data: originalSettings,
      headers: adminHeaders,
    });
    expect(restoreResponse.ok()).toBe(true);
    await publicPage.close();
  }
});
