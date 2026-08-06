// @ts-check
import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const homeUrl = "http://localhost:5173";
const animatedHeroUrl =
  "http://127.0.0.1:3333/uploads/images/hero-product-motion-test.png?motion=product-drop";
const heroReferencePath = resolve(
  process.cwd(),
  "tests/fixtures/hero-product-reference.png",
);
const imageStub = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

const viewports = [
  { width: 320, height: 568 },
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
];

const screenshotWidths = new Set([390, 768, 1440]);
const contentTypes = {
  ".css": "text/css",
  ".html": "text/html",
  ".js": "text/javascript",
  ".map": "application/json",
};

async function serveBuiltHome(page) {
  const distRoot = resolve(process.cwd(), "apps/web/dist");
  await page.route(`${homeUrl}/**`, async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const assetPath = pathname.startsWith("/assets/")
      ? resolve(distRoot, `.${pathname}`)
      : resolve(distRoot, "index.html");
    const isSafeAsset =
      assetPath === resolve(distRoot, "index.html") ||
      assetPath.startsWith(`${distRoot}${sep}`);
    if (!isSafeAsset) {
      await route.fulfill({ status: 404, body: "Not found" });
      return;
    }

    await route.fulfill({
      body: await readFile(assetPath),
      contentType:
        contentTypes[extname(assetPath)] ?? "application/octet-stream",
    });
  });
}

async function openHome(page, viewport) {
  await page.setViewportSize(viewport);
  await page.route("https://images.unsplash.com/**", (route) =>
    route.fulfill({ body: imageStub, contentType: "image/png" }),
  );
  await page.goto(homeUrl, {
    timeout: 20_000,
    waitUntil: "domcontentloaded",
  });
  await expect(page.locator(".hero")).toBeVisible({ timeout: 10_000 });
  await expect(page.locator(".editorial-statement")).toBeAttached();
  await expect(page.locator("a.product-card__image").first()).toBeVisible({
    timeout: 10_000,
  });
}

test.describe("Home responsiva e acessivel", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 });

  for (const viewport of viewports) {
    test(`${viewport.width}px sem cortes ou overflow`, async ({ page }) => {
      const runtimeErrors = [];
      page.on("pageerror", (error) => runtimeErrors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") runtimeErrors.push(message.text());
      });

      await openHome(page, viewport);

      const layout = await page.evaluate(() => {
        const viewportWidth = document.documentElement.clientWidth;
        const selectors = [
          ".site-header",
          ".hero",
          ".home-editorial-nav",
          ".editorial-statement",
          ".featured-collection",
          ".product-card",
          ".site-footer",
        ];
        const outsideViewport = selectors.flatMap((selector) =>
          [...document.querySelectorAll(selector)]
            .map((element) => {
              const rect = element.getBoundingClientRect();
              return {
                selector,
                left: rect.left,
                right: rect.right,
              };
            })
            .filter((rect) => rect.left < -1 || rect.right > viewportWidth + 1),
        );

        return {
          documentWidth: document.documentElement.scrollWidth,
          outsideViewport,
          viewportWidth,
        };
      });

      expect(layout.documentWidth).toBeLessThanOrEqual(
        layout.viewportWidth + 1,
      );
      expect(layout.outsideViewport).toEqual([]);

      const cards = page.locator(".product-card");
      const cardCount = await cards.count();
      expect(cardCount).toBeGreaterThan(0);

      const firstRowY = [];
      for (let index = 0; index < Math.min(cardCount, 4); index += 1) {
        firstRowY.push(
          await cards.nth(index).evaluate((element) => element.offsetTop),
        );
      }
      const firstRowCount = firstRowY.filter((y) => y === firstRowY[0]).length;

      if (viewport.width <= 760) expect(firstRowCount).toBe(1);
      if (viewport.width >= 768 && viewport.width <= 1120)
        expect(firstRowCount).toBe(Math.min(2, cardCount));
      if (viewport.width >= 1280)
        expect(firstRowCount).toBe(Math.min(4, cardCount));

      if (viewport.width <= 760) {
        const heroBox = await page.locator(".hero").boundingBox();
        expect(heroBox).not.toBeNull();
        expect(heroBox.y + heroBox.height).toBeLessThan(viewport.height);

        const menuButton = page.getByRole("button", { name: "Abrir menu" });
        await expect(menuButton).toBeVisible();
        await menuButton.click();
        const mobileNavigation = page.locator("#mobile-navigation");
        await expect(mobileNavigation).toBeVisible();
        await expect(mobileNavigation.getByRole("link").first()).toBeFocused();
        await page.keyboard.press("Escape");
        await expect(mobileNavigation).toBeHidden();
        await expect(
          page.getByRole("button", { name: "Abrir menu" }),
        ).toBeFocused();
      } else {
        await expect(page.locator(".main-nav--desktop")).toBeVisible();
        await expect(page.locator(".menu-button")).toBeHidden();
      }

      if (viewport.width <= 430) {
        const actionOverflow = await page.evaluate(
          () =>
            [...document.querySelectorAll(".product-card")].filter((card) => {
              const action = card.querySelector("button");
              if (!action) return false;
              const cardRect = card.getBoundingClientRect();
              const actionRect = action.getBoundingClientRect();
              return (
                actionRect.left < cardRect.left ||
                actionRect.right > cardRect.right
              );
            }).length,
        );
        expect(actionOverflow).toBe(0);
      }

      const statement = page.locator(".editorial-statement");
      await statement.scrollIntoViewIfNeeded();
      await page.waitForTimeout(800);
      const statementLines = statement.locator(".editorial-statement__line");
      await expect(statementLines.first()).toBeVisible();
      expect(await statementLines.count()).toBe(2);

      const featuredHeading = page.locator(".section-heading--featured");
      await featuredHeading.evaluate((element) =>
        element.scrollIntoView({ block: "start", behavior: "instant" }),
      );
      await expect
        .poll(
          () =>
            featuredHeading
              .locator("h2")
              .evaluate((element) => getComputedStyle(element).opacity),
          { timeout: 10_000 },
        )
        .toBe("1");
      await expect
        .poll(
          () =>
            page
              .locator(".home-editorial-nav > div")
              .evaluateAll((elements) =>
                elements.every(
                  (element) =>
                    Number(getComputedStyle(element).opacity) > 0.999,
                ),
              ),
          { timeout: 10_000 },
        )
        .toBe(true);

      for (let index = 0; index < cardCount; index += 1) {
        const card = cards.nth(index);
        await card.evaluate((element) =>
          element.scrollIntoView({ block: "start", behavior: "instant" }),
        );
        await expect
          .poll(
            () =>
              card.evaluate((element) => {
                const style = getComputedStyle(element);
                const matrix =
                  style.transform === "none"
                    ? null
                    : new DOMMatrixReadOnly(style.transform);
                return (
                  Number(style.opacity) > 0.999 &&
                  (!matrix ||
                    (Math.abs(matrix.m41) < 0.1 &&
                      Math.abs(matrix.m42) < 0.1 &&
                      Math.abs(matrix.m11 - 1) < 0.001 &&
                      Math.abs(matrix.m22 - 1) < 0.001))
                );
              }),
            { timeout: 10_000 },
          )
          .toBe(true);
      }

      if (screenshotWidths.has(viewport.width)) {
        await page.locator(".site-footer").scrollIntoViewIfNeeded();
        await page.waitForTimeout(700);
        await page.evaluate(() =>
          window.scrollTo({ top: 0, behavior: "instant" }),
        );
        await page.waitForTimeout(100);
        await page.screenshot({
          fullPage: true,
          path: `test-results/home-${viewport.width}.png`,
        });
      }

      expect(runtimeErrors).toEqual([]);
    });
  }

  test("orientacao horizontal preserva o proximo conteudo", async ({
    page,
  }) => {
    const viewport = { width: 844, height: 390 };
    await openHome(page, viewport);
    const heroBox = await page.locator(".hero").boundingBox();
    expect(heroBox).not.toBeNull();
    expect(heroBox.y + heroBox.height).toBeLessThan(viewport.height);
  });

  test("capa nao vincula movimento a rolagem", async ({ page }) => {
    await openHome(page, { width: 390, height: 844 });
    const productScene = page.locator(".hero__product-stage");
    if (await productScene.count()) {
      await expect(productScene).toHaveAttribute(
        "data-motion-state",
        "settled",
        {
          timeout: 5_000,
        },
      );
    }
    await page.waitForTimeout(150);

    const readHeroMotion = () =>
      page.evaluate(() =>
        [".hero__product-background, .hero__media", ".hero__content"].map(
          (selector) => {
            const element = document.querySelector(selector);
            if (!element) return null;
            const style = getComputedStyle(element);
            return {
              animations: element.getAnimations().length,
              clipPath: style.clipPath,
              opacity: style.opacity,
              transform: style.transform,
            };
          },
        ),
      );

    const beforeScroll = await readHeroMotion();
    await page.evaluate(() =>
      window.scrollTo({ top: window.innerHeight * 0.75, behavior: "instant" }),
    );
    await page.waitForTimeout(150);
    const afterScroll = await readHeroMotion();

    expect(afterScroll).toEqual(beforeScroll);
    expect(
      afterScroll
        .filter(Boolean)
        .every(
          (style) =>
            style?.animations === 0 &&
            style.clipPath === "none" &&
            style.opacity === "1" &&
            style.transform === "none",
        ),
    ).toBe(true);
  });

  test("espacamento vertical respira em mobile e desktop", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });

    for (const viewport of [
      { width: 390, height: 844 },
      { width: 1440, height: 900 },
    ]) {
      await openHome(page, viewport);
      const gaps = await page.evaluate(() => {
        const rect = (selector) =>
          document.querySelector(selector)?.getBoundingClientRect();
        const hero = rect(".hero");
        const statement = rect(".editorial-statement__visual");
        const statementSection = rect(".editorial-statement");
        const navigation = rect(".home-editorial-nav");
        const heading = rect(".section-heading--featured");
        const grid = rect(".product-grid--preview");
        const footer = rect(".site-footer");

        if (
          !hero ||
          !statement ||
          !statementSection ||
          !navigation ||
          !heading ||
          !grid ||
          !footer
        )
          return null;

        return {
          heroToStatement: statement.top - hero.bottom,
          statementToNavigation: navigation.top - statementSection.bottom,
          navigationToHeading: heading.top - navigation.bottom,
          headingToCards: grid.top - heading.bottom,
          cardsToFooter: footer.top - grid.bottom,
        };
      });

      expect(gaps).not.toBeNull();
      const minimums =
        viewport.width < 760 ? [60, 44, 60, 24, 56] : [96, 64, 96, 32, 96];
      Object.values(gaps).forEach((gap, index) =>
        expect(gap).toBeGreaterThanOrEqual(minimums[index]),
      );
      expect(gaps.cardsToFooter).toBeLessThanOrEqual(128);
    }
  });

  test("Hero, atalhos, cards e footer preservam continuidade visual", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const settingsResponse = await page.request.get(
      "http://127.0.0.1:3333/storefront/settings",
    );
    expect(settingsResponse.ok()).toBe(true);
    const settings = await settingsResponse.json();

    await page.route("**/storefront/settings", (route) =>
      route.fulfill({
        json: {
          ...settings,
          heroImageUrl: animatedHeroUrl,
        },
      }),
    );
    await page.route(
      "**/uploads/images/hero-product-motion-test.png*",
      (route) =>
        route.fulfill({
          contentType: "image/png",
          path: heroReferencePath,
        }),
    );

    for (const viewport of [
      { width: 320, height: 568 },
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1024, height: 768 },
      { width: 1440, height: 900 },
    ]) {
      await openHome(page, viewport);
      await page.mouse.move(viewport.width - 1, 1);
      const result = await page.evaluate(() => {
        const hero = document.querySelector(".hero")?.getBoundingClientRect();
        const frame = document
          .querySelector(".hero__product-frame")
          ?.getBoundingClientRect();
        const composition = document
          .querySelector(".home-composition")
          ?.getBoundingClientRect();
        const grid = document
          .querySelector(".product-grid--preview")
          ?.getBoundingClientRect();
        const footer = document
          .querySelector(".site-footer")
          ?.getBoundingClientRect();
        const navigation = [
          ...document.querySelectorAll(".home-editorial-nav a"),
        ].map((element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return {
            background: style.backgroundColor,
            height: rect.height,
            padding: style.padding,
          };
        });
        const cards = [
          ...document.querySelectorAll(".product-grid--preview .product-card"),
        ].map((element) => {
          const rect = element.getBoundingClientRect();
          const image = element
            .querySelector(".product-card__image")
            ?.getBoundingClientRect();
          const title = element.querySelector("h2")?.getBoundingClientRect();
          const cardFooter = element
            .querySelector(".product-card__footer")
            ?.getBoundingClientRect();
          return {
            height: rect.height,
            imageHeight: image?.height,
            row: Math.round(rect.top),
            titleHeight: title?.height,
            footerHeight: cardFooter?.height,
            width: rect.width,
          };
        });
        const cardRows = [
          ...cards
            .reduce((rows, card) => {
              const key = String(card.row);
              rows.set(key, [...(rows.get(key) ?? []), card]);
              return rows;
            }, new Map())
            .values(),
        ];
        const productBounds =
          hero && frame
            ? {
                bottom: frame.top + (667 / 878) * frame.height,
                left: frame.left + (332 / 1536) * frame.width,
                right: frame.left + (1240 / 1536) * frame.width,
                top: frame.top + (212 / 878) * frame.height,
              }
            : null;

        return {
          cardRows,
          cardsToFooter: grid && footer ? footer.top - grid.bottom : null,
          compositionMask: composition
            ? getComputedStyle(document.querySelector(".home-composition"))
                .maskImage
            : "none",
          hero: hero
            ? {
                bottom: hero.bottom,
                left: hero.left,
                right: hero.right,
                top: hero.top,
              }
            : null,
          navigation,
          overlap: hero && composition ? hero.bottom - composition.top : null,
          productBounds,
          frameRatio: frame ? frame.width / frame.height : null,
        };
      });

      expect(result.hero).not.toBeNull();
      expect(result.productBounds).not.toBeNull();
      expect(result.frameRatio).toBeCloseTo(1536 / 878, 2);
      expect(result.productBounds.left).toBeGreaterThanOrEqual(
        result.hero.left - 1,
      );
      expect(result.productBounds.right).toBeLessThanOrEqual(
        result.hero.right + 1,
      );
      expect(result.productBounds.top).toBeGreaterThanOrEqual(
        result.hero.top - 1,
      );
      expect(result.productBounds.bottom).toBeLessThanOrEqual(
        result.hero.bottom + 1,
      );
      expect(result.overlap).toBeGreaterThanOrEqual(0);
      expect(result.overlap).toBeLessThanOrEqual(32);
      expect(result.compositionMask).not.toBe("none");
      expect(result.cardsToFooter).toBeGreaterThanOrEqual(56);
      expect(result.cardsToFooter).toBeLessThanOrEqual(128);

      const firstNavigation = result.navigation[0];
      expect(firstNavigation).toBeDefined();
      result.navigation.forEach((item) => {
        expect(item.height).toBeCloseTo(firstNavigation.height, 0);
        expect(item.background).toBe(firstNavigation.background);
        expect(item.padding).toBe(firstNavigation.padding);
      });

      result.cardRows.forEach((row) => {
        const firstCard = row[0];
        expect(firstCard).toBeDefined();
        row.forEach((card) => {
          expect(card.height).toBeCloseTo(firstCard.height, 0);
          expect(card.imageHeight).toBeCloseTo(firstCard.imageHeight, 0);
          expect(card.titleHeight).toBeCloseTo(firstCard.titleHeight, 0);
          expect(card.footerHeight).toBeCloseTo(firstCard.footerHeight, 0);
          expect(card.width).toBeCloseTo(firstCard.width, 0);
        });
      });

      await page.locator(".home-editorial-nav a").first().hover();
      await expect
        .poll(
          () =>
            page
              .locator(".home-editorial-nav a")
              .first()
              .evaluate((element) => getComputedStyle(element).backgroundColor),
          { timeout: 10_000 },
        )
        .toBe("rgb(255, 255, 255)");
      await page.locator(".home-editorial-nav a").nth(2).focus();
      await expect(page.locator(".home-editorial-nav a").nth(2)).toBeFocused();
    }
  });

  test("preview da Vitrine representa a capa sem cortes", async ({ page }) => {
    test.setTimeout(60_000);
    const devStore = JSON.parse(
      await readFile(
        resolve(process.cwd(), "database/dev-commerce-store.json"),
        "utf8",
      ),
    );
    const settings = devStore.storefront;
    expect(settings).toBeTruthy();
    const adminOrigin = "http://localhost:5174";
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
      await route.fulfill({
        headers: corsHeaders,
        json: pathname === "/admin/storefront" ? settings : { items: [] },
      });
    });

    for (const viewport of [
      { width: 320, height: 568 },
      { width: 768, height: 1024 },
      { width: 1280, height: 800 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto(`${adminOrigin}/aparencia`, {
        waitUntil: "domcontentloaded",
      });
      await expect(page.locator(".appearance-preview")).toBeVisible();

      if (viewport.width === 320) {
        await page.getByRole("tab", { name: "Conteudo" }).click();
        await expect(
          page.getByRole("group", { name: "Estilo da etiqueta" }),
        ).toBeVisible();
        await page.getByRole("tab", { name: "Motion" }).click();
        await expect(page.locator(".motion-block-editor article")).toHaveCount(
          5,
        );
        await page.screenshot({
          fullPage: true,
          path: "test-results/admin-vitrine-320.png",
        });
      }

      const device = viewport.width <= 720 ? "Celular" : "Desktop";
      await page.getByRole("button", { name: device }).click();
      const preview = await page.evaluate(() => {
        const hero = document
          .querySelector(".appearance-preview__hero")
          ?.getBoundingClientRect();
        const image = document
          .querySelector(".appearance-preview__hero img")
          ?.getBoundingClientRect();
        if (!hero || !image) return null;

        return {
          clientWidth: document.documentElement.clientWidth,
          imageOpacity: getComputedStyle(
            document.querySelector(".appearance-preview__hero img"),
          ).opacity,
          productBottom: image.top + (667 / 878) * image.height,
          productLeft: image.left + (335 / 1536) * image.width,
          productRight: image.left + (1238 / 1536) * image.width,
          productTop: image.top + (218 / 878) * image.height,
          heroBottom: hero.bottom,
          heroLeft: hero.left,
          heroRight: hero.right,
          heroTop: hero.top,
          scrollWidth: document.documentElement.scrollWidth,
        };
      });

      expect(preview).not.toBeNull();
      expect(preview.scrollWidth).toBeLessThanOrEqual(preview.clientWidth + 1);
      expect(preview.imageOpacity).toBe("1");
      expect(preview.productLeft).toBeGreaterThanOrEqual(preview.heroLeft - 1);
      expect(preview.productRight).toBeLessThanOrEqual(preview.heroRight + 1);
      expect(preview.productTop).toBeGreaterThanOrEqual(preview.heroTop - 1);
      expect(preview.productBottom).toBeLessThanOrEqual(preview.heroBottom + 1);
    }
  });

  test("revelacoes acompanham a entrada dos elementos na viewport", async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    const captureSequence = testInfo.project.name === "chromium";
    const [settingsResponse, productsResponse] = await Promise.all([
      page.request.get("http://127.0.0.1:3333/storefront/settings"),
      page.request.get(
        "http://127.0.0.1:3333/catalog/products?limit=4&featured=true&sort=featured",
      ),
    ]);
    expect(settingsResponse.ok()).toBe(true);
    expect(productsResponse.ok()).toBe(true);
    const settings = await settingsResponse.json();
    const products = await productsResponse.json();

    await serveBuiltHome(page);
    await page.route("**/storefront/settings", (route) =>
      route.fulfill({ json: settings }),
    );
    await page.route("**/catalog/products?*", (route) =>
      route.fulfill({ json: products }),
    );

    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 768, height: 1024 },
      { width: 390, height: 844 },
    ]) {
      await openHome(page, viewport);

      const lines = page.locator(".editorial-statement__line");
      const navigationItems = page.locator(".home-editorial-nav > div");
      const featuredEyebrow = page.locator(
        ".section-heading--featured .section-heading__copy > p",
      );
      const cards = page.locator(".product-grid--preview .product-card");
      await expect(lines).toHaveCount(2);
      await expect(navigationItems).toHaveCount(4);

      const targets = [
        {
          name: "manifesto-primeira",
          locator: lines.nth(0),
          maxLag: viewport.height * 0.24 + 32,
        },
        {
          name: "manifesto-segunda",
          locator: lines.nth(1),
          maxLag: viewport.height * 0.24 + 32,
        },
        {
          name: "links",
          locator: navigationItems.first(),
          maxLag: viewport.height * 0.12 + 32,
        },
        {
          name: "destaques",
          locator: featuredEyebrow,
          maxLag: viewport.height * 0.12 + 32,
        },
        {
          name: "cards",
          locator: cards.first(),
          maxLag: viewport.height * 0.12 + 32,
        },
      ];
      const records = targets.map(() => ({ enteredAt: null, startedAt: null }));

      const initialOpacities = await Promise.all(
        targets.map(({ locator }) =>
          locator.evaluate((element) =>
            Number(getComputedStyle(element).opacity),
          ),
        ),
      );
      expect(initialOpacities.slice(2).some((opacity) => opacity === 0)).toBe(
        true,
      );

      const maximumScroll = await page.evaluate(
        () => document.documentElement.scrollHeight - window.innerHeight,
      );
      const captured = new Set();

      for (let top = 0; top <= maximumScroll; top += 16) {
        await page.evaluate((nextTop) => window.scrollTo(0, nextTop), top);
        await page.evaluate(
          () =>
            new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(resolve)),
            ),
        );

        const samples = await Promise.all(
          targets.map(({ locator }) =>
            locator.evaluate((element) => {
              const rect = element.getBoundingClientRect();
              return {
                bottom: rect.bottom,
                opacity: Number(getComputedStyle(element).opacity),
                top: rect.top,
              };
            }),
          ),
        );
        const scrollY = await page.evaluate(() => window.scrollY);

        for (const [index, sample] of samples.entries()) {
          const record = records[index];
          if (
            record.enteredAt == null &&
            sample.top < viewport.height &&
            sample.bottom > 0
          ) {
            record.enteredAt = scrollY;
          }
          if (record.startedAt == null && sample.opacity > 0.01) {
            record.startedAt = scrollY;
            const target = targets[index];
            await expect
              .poll(
                () =>
                  target.locator.evaluate((element) =>
                    Number(getComputedStyle(element).opacity),
                  ),
                { timeout: 10_000 },
              )
              .toBeGreaterThan(0.999);
            if (captureSequence && !captured.has(target.name)) {
              await page.screenshot({
                path: `test-results/home-reveal-${viewport.width}-${target.name}.png`,
              });
              captured.add(target.name);
            }
          }
        }

        if (records.every((record) => record.startedAt != null)) break;
      }

      for (const [index, record] of records.entries()) {
        expect(record.enteredAt).not.toBeNull();
        expect(record.startedAt).not.toBeNull();
        expect(record.startedAt - record.enteredAt).toBeLessThanOrEqual(
          targets[index].maxLag,
        );
      }

      for (let index = 1; index < records.length; index += 1) {
        expect(records[index].startedAt).toBeGreaterThanOrEqual(
          records[index - 1].startedAt - 16,
        );
      }

      await page.evaluate(() =>
        window.scrollTo(0, document.documentElement.scrollHeight),
      );
      await expect
        .poll(
          () =>
            Promise.all(
              targets.map(({ locator }) =>
                locator.evaluate((element) =>
                  Number(getComputedStyle(element).opacity),
                ),
              ),
            ),
          { timeout: 10_000 },
        )
        .toEqual([1, 1, 1, 1, 1]);
    }
  });

  test("fade up revela textos e escalona os cards visiveis", async ({
    page,
  }) => {
    const settingsResponse = await page.request.get(
      "http://127.0.0.1:3333/storefront/settings",
    );
    expect(settingsResponse.ok()).toBe(true);
    const settings = await settingsResponse.json();
    await page.route("**/storefront/settings", (route) =>
      route.fulfill({
        json: {
          ...settings,
          homeMotionEnabled: true,
          homeMotionByBlock: {
            ...settings.homeMotionByBlock,
            productCards: "cascade",
          },
        },
      }),
    );
    await openHome(page, { width: 1440, height: 400 });

    const heading = page.locator(".section-heading--featured h2");
    const cards = page.locator(".product-grid--preview .product-card");
    await page.waitForTimeout(500);
    const initialStyles = await Promise.all([
      heading.evaluate((element) => {
        const style = getComputedStyle(element);
        return { opacity: style.opacity, transform: style.transform };
      }),
      cards.first().evaluate((element) => {
        const style = getComputedStyle(element);
        return { opacity: style.opacity, transform: style.transform };
      }),
    ]);

    for (const style of initialStyles) {
      expect(style.opacity).toBe("0");
      expect(style.transform).not.toBe("none");
    }

    const staggeredOpacity = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const cards = [
            ...document.querySelectorAll(
              ".product-grid--preview .product-card",
            ),
          ];
          const firstCard = cards[0];
          if (!firstCard) {
            resolve([]);
            return;
          }

          const deadline = performance.now() + 1_000;
          firstCard.scrollIntoView({ block: "start" });

          function sample() {
            const opacities = cards
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

    await expect
      .poll(
        () =>
          cards.evaluateAll((elements) =>
            elements.every((element) => {
              const style = getComputedStyle(element);
              const matrix =
                style.transform === "none"
                  ? null
                  : new DOMMatrixReadOnly(style.transform);
              return (
                Number(style.opacity) > 0.999 &&
                (!matrix ||
                  (Math.abs(matrix.m41) < 0.1 &&
                    Math.abs(matrix.m42) < 0.1 &&
                    Math.abs(matrix.m11 - 1) < 0.001 &&
                    Math.abs(matrix.m22 - 1) < 0.001))
              );
            }),
          ),
        { timeout: 10_000 },
      )
      .toBe(true);

    await heading.evaluate((element) =>
      element.scrollIntoView({ block: "start" }),
    );
    await expect
      .poll(
        () => heading.evaluate((element) => getComputedStyle(element).opacity),
        { timeout: 10_000 },
      )
      .toBe("1");
  });

  test("aviso publico de estoque baixo respeita a opcao do produto", async ({
    page,
  }) => {
    const productsResponse = await page.request.get(
      "http://127.0.0.1:3333/catalog/products?limit=24",
    );
    expect(productsResponse.ok()).toBe(true);
    const catalog = await productsResponse.json();
    const targetProduct = catalog.items[0];
    expect(targetProduct).toBeTruthy();
    let warningEnabled = false;

    await page.route("**/catalog/products?**", (route) =>
      route.fulfill({
        json: {
          ...catalog,
          items: catalog.items.map((product) =>
            product.id === targetProduct.id
              ? {
                  ...product,
                  stock: 0,
                  lowStockThreshold: 2,
                  lowStockWarningEnabled: warningEnabled,
                }
              : product,
          ),
        },
      }),
    );

    await openHome(page, { width: 390, height: 844 });
    const productCard = page
      .locator(".product-grid--preview .product-card")
      .filter({ hasText: targetProduct.name })
      .first();
    await expect(productCard).toBeVisible();
    await expect(productCard.locator(".product-card__stock")).toHaveCount(0);

    warningEnabled = true;
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(productCard.locator(".product-card__stock")).toHaveText(
      "Estoque baixo",
    );
  });

  test("configuracao white-label controla blocos, ordem e estados vazios", async ({
    page,
  }) => {
    const [settingsResponse, productsResponse] = await Promise.all([
      page.request.get("http://127.0.0.1:3333/storefront/settings"),
      page.request.get(
        "http://127.0.0.1:3333/catalog/products?limit=4&featured=true&sort=featured",
      ),
    ]);
    expect(settingsResponse.ok()).toBe(true);
    expect(productsResponse.ok()).toBe(true);

    let configuredSettings = {
      ...(await settingsResponse.json()),
      homeMotionEnabled: false,
      homeSurfaceColor: "#eef4f0",
      homeSections: [
        { id: "featured", enabled: true },
        { id: "navigation", enabled: true },
        { id: "manifesto", enabled: true },
      ],
      manifestoItems: [
        {
          id: "00000000-0000-4000-8000-000000000401",
          type: "eyebrow",
          content: "CURADORIA INDEPENDENTE",
          enabled: true,
          alignment: "center",
          emphasis: "subtle",
        },
        {
          id: "00000000-0000-4000-8000-000000000402",
          type: "headline",
          content: "PRIMEIRO TITULO CONFIGURAVEL",
          enabled: true,
          alignment: "center",
          emphasis: "strong",
        },
        {
          id: "00000000-0000-4000-8000-000000000403",
          type: "supporting",
          content: "TERCEIRO BLOCO ADICIONADO PELO ADMIN",
          enabled: true,
          alignment: "start",
          emphasis: "standard",
        },
      ],
    };
    const products = await productsResponse.json();

    await serveBuiltHome(page);
    await page.route("**/storefront/settings", (route) =>
      route.fulfill({ json: configuredSettings }),
    );
    await page.route("**/catalog/products?*", (route) =>
      route.fulfill({ json: products }),
    );
    await page.route("https://images.unsplash.com/**", (route) =>
      route.fulfill({ body: imageStub, contentType: "image/png" }),
    );
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto(homeUrl, { waitUntil: "domcontentloaded" });
    await expect(page.locator(".editorial-statement__line")).toHaveCount(3);
    await expect(page.locator(".product-card").first()).toBeVisible();

    const order = await page.evaluate(() => ({
      featured: document
        .querySelector(".featured-collection")
        ?.getBoundingClientRect().top,
      manifesto: document
        .querySelector(".editorial-statement")
        ?.getBoundingClientRect().top,
      navigation: document
        .querySelector(".home-editorial-nav")
        ?.getBoundingClientRect().top,
      surface: getComputedStyle(document.querySelector(".home-page"))
        .backgroundColor,
    }));
    expect(order.featured).toBeLessThan(order.navigation);
    expect(order.navigation).toBeLessThan(order.manifesto);
    expect(order.surface).toBe("rgb(238, 244, 240)");

    configuredSettings = {
      ...configuredSettings,
      manifestoItems: [],
      homeSections: configuredSettings.homeSections.map((section) => ({
        ...section,
        enabled: false,
      })),
    };
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator(".hero")).toBeVisible();
    await expect(page.locator(".home-composition")).toHaveCount(0);
  });

  test("estilos de texto, Motion por bloco e rodape respondem em todas as telas", async ({
    page,
  }) => {
    const [settingsResponse, productsResponse] = await Promise.all([
      page.request.get("http://127.0.0.1:3333/storefront/settings"),
      page.request.get(
        "http://127.0.0.1:3333/catalog/products?limit=4&featured=true&sort=featured",
      ),
    ]);
    expect(settingsResponse.ok()).toBe(true);
    expect(productsResponse.ok()).toBe(true);

    const settings = await settingsResponse.json();
    const configuredSettings = {
      ...settings,
      heroEyebrow: "",
      heroTitle: "",
      homeMotionEnabled: true,
      homeMotionByBlock: {
        manifesto: "static",
        navigation: "cascade",
        featuredHeading: "scroll",
        productCards: "soft",
        footer: "subtle",
      },
      homeTextStyles: {
        ...settings.homeTextStyles,
        manifesto: {
          color: "#31584a",
          fontSize: 58,
          spacingAfter: 30,
          fontFamily: "classic",
        },
        navigation: {
          color: "#204c74",
          fontSize: 15,
          spacingAfter: 18,
          fontFamily: "modern",
        },
        featuredEyebrow: {
          color: "#7a4d16",
          fontSize: 14,
          spacingAfter: 14,
          fontFamily: "body",
        },
        featuredTitle: {
          color: "#143c31",
          fontSize: 48,
          spacingAfter: 4,
          fontFamily: "classic",
        },
        productCardTitle: {
          color: "#3f285f",
          fontSize: 24,
          spacingAfter: 10,
          fontFamily: "display",
        },
        footerSlogan: {
          color: "#111111",
          fontSize: 15,
          spacingAfter: 20,
          fontFamily: "modern",
        },
      },
    };
    const products = await productsResponse.json();

    await serveBuiltHome(page);
    await page.route("**/storefront/settings", (route) =>
      route.fulfill({ json: configuredSettings }),
    );
    await page.route("**/catalog/products?*", (route) =>
      route.fulfill({ json: products }),
    );

    for (const viewport of [
      { width: 320, height: 568 },
      { width: 390, height: 844 },
      { width: 523, height: 317 },
      { width: 739, height: 844 },
      { width: 768, height: 1024 },
      { width: 1280, height: 800 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto(homeUrl, { waitUntil: "domcontentloaded" });

      await expect(page.locator(".hero")).toBeVisible();
      await expect(page.locator(".hero__content")).toHaveCount(0);
      await expect(
        page.locator(".editorial-statement__line").first(),
      ).toHaveCSS("color", "rgb(49, 88, 74)");

      const layout = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        manifestoFont: getComputedStyle(
          document.querySelector(".editorial-statement__line"),
        ).fontFamily,
        navigationColor: getComputedStyle(
          document.querySelector(".home-editorial-nav a"),
        ).color,
        viewportWidth: document.documentElement.clientWidth,
      }));
      expect(layout.documentWidth).toBeLessThanOrEqual(
        layout.viewportWidth + 1,
      );
      expect(layout.manifestoFont).toContain("Georgia");
      expect(layout.navigationColor).toBe("rgb(32, 76, 116)");

      const navigation = page.locator(".home-editorial-nav");
      await navigation.scrollIntoViewIfNeeded();
      await expect
        .poll(() =>
          navigation
            .locator(":scope > div")
            .first()
            .evaluate((element) => getComputedStyle(element).opacity),
        )
        .toBe("1");

      const footer = page.locator(".site-footer");
      await footer.scrollIntoViewIfNeeded();
      const footerLayout = await page.evaluate(() => {
        const logo = document
          .querySelector(".site-footer .brand__mark--footer")
          ?.getBoundingClientRect();
        const slogan = document
          .querySelector(".site-footer__slogan")
          ?.getBoundingClientRect();
        const inner = document.querySelector(".site-footer__inner");
        const links = document.querySelector(".site-footer__links");
        const navigation = document.querySelector(".site-footer__nav");
        if (!logo || !slogan || !inner || !links || !navigation) return null;
        return {
          brandRight: document
            .querySelector(".site-footer__brand")
            .getBoundingClientRect().right,
          linksLeft: links.getBoundingClientRect().left,
          logoBottom: logo.bottom,
          logoLeft: logo.left,
          sloganTop: slogan.top,
          textAlign: getComputedStyle(inner).textAlign,
          navigationHeight: navigation.getBoundingClientRect().height,
        };
      });
      expect(footerLayout).not.toBeNull();
      expect(footerLayout.logoBottom).toBeLessThanOrEqual(
        footerLayout.sloganTop + 1,
      );
      if (viewport.width <= 760) {
        expect(footerLayout.textAlign).toBe("left");
        expect(footerLayout.logoLeft).toBeLessThan(footerLayout.linksLeft);
        expect(footerLayout.brandRight).toBeLessThanOrEqual(
          footerLayout.linksLeft + 1,
        );
        if (viewport.width >= 480) {
          expect(footerLayout.navigationHeight).toBeLessThanOrEqual(45);
        } else {
          expect(footerLayout.navigationHeight).toBeLessThanOrEqual(89);
        }
      }
    }
  });

  test("movimento reduzido remove deslocamentos fisicos", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openHome(page, { width: 390, height: 844 });

    const heroTransform = await page
      .locator(".hero__product-background, .hero__media")
      .first()
      .evaluate((element) => getComputedStyle(element).transform);
    expect(["none", "matrix(1, 0, 0, 1, 0, 0)"]).toContain(heroTransform);

    const statement = page.locator(".editorial-statement");
    await statement.scrollIntoViewIfNeeded();
    const lineStyles = await statement
      .locator(".editorial-statement__line")
      .evaluateAll((elements) =>
        elements.map((element) => ({
          opacity: getComputedStyle(element).opacity,
          transform: getComputedStyle(element).transform,
        })),
      );

    expect(lineStyles.every((style) => style.opacity === "1")).toBe(true);
    expect(
      lineStyles.every((style) =>
        ["none", "matrix(1, 0, 0, 1, 0, 0)"].includes(style.transform),
      ),
    ).toBe(true);

    const cards = page.locator(".product-grid--preview .product-card");
    const cardStyles = await cards.evaluateAll((elements) =>
      elements.map((element) => {
        const style = getComputedStyle(element);
        return { opacity: style.opacity, transform: style.transform };
      }),
    );
    expect(cardStyles.every((style) => style.opacity === "1")).toBe(true);
    expect(
      cardStyles.every((style) =>
        ["none", "matrix(1, 0, 0, 1, 0, 0)"].includes(style.transform),
      ),
    ).toBe(true);
  });
});
