// @ts-check
import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";

const homeUrl = "http://localhost:5173";
const animatedHeroUrl =
  "http://127.0.0.1:3333/uploads/images/hero-product-motion-test.png?motion=product-drop";
const staticHeroUrl =
  "http://127.0.0.1:3333/uploads/images/hero-product-motion-test.png";
const heroReferencePath = resolve(
  process.cwd(),
  "tests/fixtures/hero-product-reference.png",
);
const imageStub = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

const productBounds = [
  { id: "left", left: 332, top: 212, right: 600, bottom: 667 },
  { id: "center", left: 612, top: 264, right: 909, bottom: 667 },
  { id: "right", left: 930, top: 240, right: 1240, bottom: 667 },
];

async function prepareHome(
  page,
  { animated = true, decodeDelay = 0, holdDecode = false, imageDelay = 0 } = {},
) {
  if (decodeDelay > 0 || holdDecode) {
    await page.addInitScript(({ delay, hold }) => {
      const decode = HTMLImageElement.prototype.decode;
      const testWindow =
        /** @type {Window & { __heroDecodeCalls: string[]; __releaseHeroDecode?: () => void }} */ (window);
      testWindow.__heroDecodeCalls = [];
      let releaseHeldDecode = () => undefined;
      const heldDecode = hold
        ? new Promise((resolve) => {
            releaseHeldDecode = resolve;
          })
        : null;
      testWindow.__releaseHeroDecode = releaseHeldDecode;
      HTMLImageElement.prototype.decode = async function () {
        testWindow.__heroDecodeCalls.push(this.currentSrc || this.src);
        if (delay > 0)
          await new Promise((resolve) => setTimeout(resolve, delay));
        if (heldDecode) await heldDecode;
        if (decode) await decode.call(this);
      };
    }, { delay: decodeDelay, hold: holdDecode });
  }

  const devStore = JSON.parse(
    await readFile(
      resolve(process.cwd(), "database/dev-commerce-store.json"),
      "utf8",
    ),
  );
  const settings = devStore.storefront;

  await page.route("**/storefront/settings", (route) =>
    route.fulfill({
      contentType: "application/json",
      headers: {
        "access-control-allow-credentials": "true",
        "access-control-allow-origin": homeUrl,
      },
      json: {
        ...settings,
        heroImageUrl: animated ? animatedHeroUrl : staticHeroUrl,
      },
    }),
  );
  await page.route(
    "**/uploads/images/hero-product-motion-test.png*",
    async (route) => {
      if (imageDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, imageDelay));
      }
      await route.fulfill({
        contentType: "image/png",
        path: heroReferencePath,
      });
    },
  );
  await page.route("https://images.unsplash.com/**", (route) =>
    route.fulfill({ body: imageStub, contentType: "image/png" }),
  );
}

async function openAnimatedHome(page, options) {
  await prepareHome(page, options);
  await page.goto(homeUrl, { waitUntil: "domcontentloaded" });
  await expect(page.locator(".hero__product-stage")).toBeVisible({
    timeout: 10_000,
  });
}

async function observeHeroMotionStates(page) {
  await page.addInitScript(() => {
    const stateWindow =
      /** @type {Window & {
       *   __heroMotionStates: string[];
       *   __heroRenderingProfile: null | {
       *     animatedProperties: string[];
       *     productAreas: Array<{ areaRatio: number; filter: string }>;
       *     shadowFilters: string[];
       *   };
       * }} */ (window);
    stateWindow.__heroMotionStates = [];
    stateWindow.__heroRenderingProfile = null;
    const setAttribute = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function (name, value) {
      if (
        name === "data-motion-state" &&
        stateWindow.__heroMotionStates.at(-1) !== String(value)
      ) {
        stateWindow.__heroMotionStates.push(String(value));
      }
      setAttribute.call(this, name, value);

      if (
        name === "data-motion-state" &&
        value === "running" &&
        this instanceof HTMLElement
      ) {
        const stage = this;
        const motionElements = Array.from(
          stage.querySelectorAll(".hero__product-drop, .hero__product-shadow"),
        );
        const previousStyles = new Map(
          motionElements.map((element) => [
            element,
            Object.fromEntries(
              Array.from(/** @type {HTMLElement} */ (element).style).map(
                (property) => [
                  property,
                  /** @type {HTMLElement} */ (element).style.getPropertyValue(
                    property,
                  ),
                ],
              ),
            ),
          ]),
        );
        const animatedProperties = new Set();
        const styleObserver = new MutationObserver((records) => {
          for (const record of records) {
            const target = /** @type {HTMLElement} */ (record.target);
            const previous = previousStyles.get(target) ?? {};
            for (const property of Array.from(target.style)) {
              const value = target.style.getPropertyValue(property);
              if (previous[property] !== value)
                animatedProperties.add(property);
              previous[property] = value;
            }
            previousStyles.set(target, previous);
          }
        });
        motionElements.forEach((element) =>
          styleObserver.observe(element, {
            attributeFilter: ["style"],
            attributes: true,
          }),
        );

        setTimeout(() => {
          styleObserver.disconnect();
          requestAnimationFrame(() => {
            const stageRect = stage.getBoundingClientRect();
            const productAreas = Array.from(
              stage.querySelectorAll(".hero__product-drop"),
            ).map((product) => {
              const htmlProduct = /** @type {HTMLElement} */ (product);
              return {
                areaRatio:
                  (htmlProduct.offsetWidth * htmlProduct.offsetHeight) /
                  (stageRect.width * stageRect.height),
                filter: getComputedStyle(product).filter,
              };
            });
            stateWindow.__heroRenderingProfile = {
              animatedProperties: Array.from(animatedProperties).sort(),
              productAreas,
              shadowFilters: Array.from(
                stage.querySelectorAll(".hero__product-shadow"),
              ).map((shadow) => getComputedStyle(shadow).filter),
            };
          });
        }, 320);
      }
    };
  });
}

async function readHeroMotionStates(page) {
  return page.evaluate(
    () =>
      /** @type {Window & { __heroMotionStates: string[] }} */ (window)
        .__heroMotionStates,
  );
}

async function readSettledComposition(stage) {
  return stage.evaluate((element) => {
    const round = (value) => Math.round(value * 1_000) / 1_000;
    const stageRect = element.getBoundingClientRect();
    const describe = (selector) =>
      Array.from(element.querySelectorAll(selector)).map((node) => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return {
          bottom: round(rect.bottom - stageRect.top),
          filter: style.filter,
          height: round(rect.height),
          left: round(rect.left - stageRect.left),
          opacity: style.opacity,
          right: round(rect.right - stageRect.left),
          top: round(rect.top - stageRect.top),
          width: round(rect.width),
        };
      });

    return {
      backgroundSource: element
        .querySelector(".hero__product-background")
        ?.getAttribute("src"),
      impacts: describe(".hero__product-impact"),
      productSources: Array.from(element.querySelectorAll("svg image")).map(
        (image) => image.getAttribute("href"),
      ),
      products: describe(".hero__product-drop"),
      shadows: describe(".hero__product-shadow"),
      stage: {
        height: round(stageRect.height),
        width: round(stageRect.width),
      },
    };
  });
}

test.describe("Motion premium da capa", () => {
  test("frame final preserva a geometria e a composicao da referencia", async ({
    page,
  }, testInfo) => {
    const viewport = { width: 1659, height: 948 };
    await page.setViewportSize(viewport);
    await openAnimatedHome(page);

    const hero = page.locator(".hero--product-drop");
    const stage = page.locator(".hero__product-stage");
    const frame = page.locator(".hero__product-frame");
    await expect(stage).toHaveAttribute("data-motion-state", "settled", {
      timeout: 10_000,
    });
    expect(
      await page
        .locator(".hero__product-drop image")
        .evaluateAll((images) =>
          images.map((image) => image.getAttribute("preserveAspectRatio")),
        ),
    ).toEqual(["xMidYMid meet", "xMidYMid meet", "xMidYMid meet"]);
    expect(
      await page
        .locator(".hero__product-drop svg")
        .evaluateAll((images) =>
          images.map((image) => image.getAttribute("preserveAspectRatio")),
        ),
    ).toEqual(["xMidYMid meet", "xMidYMid meet", "xMidYMid meet"]);

    const geometry = await frame.evaluate((element, bounds) => {
      const frameRect = element.getBoundingClientRect();
      return {
        products: bounds.map((product) => {
          const productElement = element.querySelector(
            `[data-motion-product="${product.id}"].hero__product-drop`,
          );
          const rect = productElement.getBoundingClientRect();
          return {
            actual: {
              height: rect.height,
              left: rect.left - frameRect.left,
              top: rect.top - frameRect.top,
              width: rect.width,
            },
            expected: {
              height:
                ((product.bottom - product.top) / 878) * frameRect.height,
              left: (product.left / 1536) * frameRect.width,
              top: (product.top / 878) * frameRect.height,
              width: ((product.right - product.left) / 1536) * frameRect.width,
            },
            id: product.id,
          };
        }),
        frame: { height: frameRect.height, width: frameRect.width },
      };
    }, productBounds);
    const surfaceBottom = await hero.evaluate((element) =>
      Number.parseFloat(
        getComputedStyle(element).getPropertyValue(
          "--hero-product-surface-bottom",
        ),
      ),
    );
    const surfaceLine =
      geometry.frame.height * (1 - surfaceBottom / 100);

    expect(geometry.frame.width).toBeCloseTo(viewport.width, 0);
    expect(geometry.frame.height).toBeCloseTo(
      (viewport.width * 878) / 1536,
      0,
    );
    for (const product of geometry.products) {
      expect(product.actual.left, `${product.id}: posicao horizontal`).toBeCloseTo(
        product.expected.left,
        0,
      );
      expect(product.actual.top, `${product.id}: posicao vertical`).toBeCloseTo(
        product.expected.top,
        0,
      );
      expect(product.actual.width, `${product.id}: largura`).toBeCloseTo(
        product.expected.width,
        0,
      );
      expect(product.actual.height, `${product.id}: altura`).toBeCloseTo(
        product.expected.height,
        0,
      );
      expect(
        product.actual.top + product.actual.height,
        `${product.id}: contato com a superficie`,
      ).toBeCloseTo(surfaceLine, 0);
    }

    await page.locator(".hero__content").evaluate((element) => {
      element.style.visibility = "hidden";
    });
    await page.locator(".site-header").evaluate((element) => {
      element.style.visibility = "hidden";
    });
    const heroScreenshot = await hero.screenshot({
      animations: "disabled",
    });
    const screenshot = await sharp(heroScreenshot)
      .extract({ height: viewport.height, left: 0, top: 0, width: viewport.width })
      .png()
      .toBuffer();
    await sharp(screenshot).toFile(
      resolve(process.cwd(), "storage/recovery/hero-after-1659x948.png"),
    );
    await testInfo.attach("hero-final-1659x948", {
      body: screenshot,
      contentType: "image/png",
    });

    const reference = await sharp(heroReferencePath)
      .ensureAlpha()
      .raw()
      .toBuffer();
    const actual = await sharp(screenshot)
      .ensureAlpha()
      .raw()
      .toBuffer();
    expect(actual.length).toBe(reference.length);
    let channelDifference = 0;
    for (let index = 0; index < reference.length; index += 1) {
      channelDifference += Math.abs(reference[index] - actual[index]);
    }
    const meanChannelDifference = channelDifference / reference.length;
    expect(meanChannelDifference).toBeLessThan(24);
  });

  test("cai uma vez, preserva o stagger e so repete no reload", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await observeHeroMotionStates(page);
    await openAnimatedHome(page, { imageDelay: 1_200 });

    const stage = page.locator(".hero__product-stage");
    await expect(page.locator(".hero__product-background")).toHaveCount(1);
    await expect(page.locator(".hero__media--product-final")).toHaveCount(0);
    await expect(page.locator(".hero__product-drop")).toHaveCount(3);
    await expect(page.locator(".hero__product-shadow-anchor")).toHaveCount(3);
    await expect(page.locator(".hero__product-impact")).toHaveCount(0);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            /** @type {Window & { __heroRenderingProfile: unknown }} */ (window)
              .__heroRenderingProfile,
        ),
      )
      .not.toBeNull();
    const renderingProfile = await page.evaluate(
      () =>
        /** @type {Window & { __heroRenderingProfile: {
         *   animatedProperties: string[];
         *   productAreas: Array<{ areaRatio: number; filter: string }>;
         *   shadowFilters: string[];
         * } }} */ (window).__heroRenderingProfile,
    );
    expect(
      renderingProfile.animatedProperties.every((property) =>
        ["opacity", "transform"].includes(property),
      ),
    ).toBe(true);
    expect(
      renderingProfile.productAreas.every(
        ({ areaRatio, filter }) => areaRatio < 0.12 && filter === "none",
      ),
    ).toBe(true);
    expect(renderingProfile.shadowFilters).toEqual(["none", "none", "none"]);
    const configuredDelays = await page
      .locator(".hero__product-drop")
      .evaluateAll((elements) =>
        Object.fromEntries(
          elements.map((element) => [
            element.getAttribute("data-motion-product"),
            Number(element.getAttribute("data-motion-delay")),
          ]),
        ),
      );
    expect(configuredDelays.center).toBeLessThan(configuredDelays.left);
    expect(configuredDelays.center).toBeLessThan(configuredDelays.right);

    await expect(stage).toHaveAttribute("data-motion-state", "settled", {
      timeout: 10_000,
    });
    expect(
      await page
        .locator(".hero__product-shadow")
        .evaluateAll((shadows) =>
          shadows.map((shadow) => getComputedStyle(shadow).opacity),
        ),
    ).toEqual(["1", "1", "1"]);
    const initialStates = await readHeroMotionStates(page);
    expect(initialStates).toContain("running");
    expect(initialStates.indexOf("running")).toBeLessThan(
      initialStates.indexOf("settled"),
    );
    await page.waitForTimeout(300);
    const runningBeforeScroll = await stage.evaluate(
      (element) =>
        element
          .getAnimations({ subtree: true })
          .filter((animation) => animation.playState === "running").length,
    );
    expect(runningBeforeScroll).toBe(0);
    const settledComposition = await readSettledComposition(stage);
    await page.waitForTimeout(500);
    expect(await readSettledComposition(stage)).toEqual(settledComposition);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(150);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(stage).toHaveAttribute("data-motion-state", "settled");
    expect(
      await stage.evaluate(
        (element) =>
          element
            .getAnimations({ subtree: true })
            .filter((animation) => animation.playState === "running").length,
      ),
    ).toBe(0);

    await page
      .getByRole("link", { name: "Catalogo", exact: true })
      .first()
      .click();
    await expect(page).toHaveURL(/\/catalogo/);
    await page
      .getByRole("banner")
      .getByRole("link", { name: "Bespoke inicio" })
      .click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator(".catalog-layout")).toHaveCount(0, {
      timeout: 10_000,
    });
    await expect(page.locator(".hero__product-stage")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator(".hero__product-stage")).toHaveAttribute(
      "data-motion-state",
      "settled",
    );
    await expect(
      page.locator(
        '.hero__product-stage[data-motion-state="settled"] .hero__product-motion',
      ),
    ).toHaveCount(1, { timeout: 30_000 });
    await expect(page.locator(".hero__product-drop")).toHaveCount(3, {
      timeout: 30_000,
    });
    await expect
      .poll(
        () => readSettledComposition(page.locator(".hero__product-stage")),
        { timeout: 10_000 },
      )
      .toEqual(settledComposition);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator(".hero__product-stage")).toHaveAttribute(
      "data-motion-state",
      "settled",
      { timeout: 30_000 },
    );
    expect(await readHeroMotionStates(page)).toContain("running");
    await expect(page.locator(".hero__product-drop")).toHaveCount(3);
  });

  test("sincroniza cada sombra com a aproximacao final do produto", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openAnimatedHome(page, { holdDecode: true });

    const stage = page.locator(".hero__product-stage");
    await expect(stage).toHaveAttribute("data-motion-state", "loading");
    await page.evaluate(() => {
      const testWindow = /** @type {Window & {
       *   __heroShadowSamples: Array<Array<{
       *     productY: number;
       *     shadowOpacity: number;
       *   }>>;
       *   __releaseHeroDecode?: () => void;
       * }} */ (window);
      testWindow.__heroShadowSamples = [];

      const captureFrame = () => {
        const stageElement = document.querySelector(
          ".hero__product-stage",
        );
        if (!stageElement) return;
        testWindow.__heroShadowSamples.push(
          Array.from(
            stageElement.querySelectorAll(".hero__product-shadow-anchor"),
          ).map((anchor) => {
            const id = anchor.getAttribute("data-motion-product");
            const product = stageElement.querySelector(
              `.hero__product-drop[data-motion-product="${id}"]`,
            );
            const shadow = anchor.querySelector(".hero__product-shadow");
            return {
              productY: new DOMMatrixReadOnly(
                getComputedStyle(product).transform,
              ).m42,
              shadowOpacity: Number(getComputedStyle(shadow).opacity),
            };
          }),
        );
        if (stageElement.getAttribute("data-motion-state") !== "settled") {
          requestAnimationFrame(captureFrame);
        }
      };

      captureFrame();
      testWindow.__releaseHeroDecode?.();
    });
    await expect(stage).toHaveAttribute("data-motion-state", "running");
    await page.waitForTimeout(100);

    const readProductShadowState = () =>
      stage.evaluate((element) =>
        Array.from(
          element.querySelectorAll(".hero__product-shadow-anchor"),
        ).map((anchor) => {
          const id = anchor.getAttribute("data-motion-product");
          const product = element.querySelector(
            `.hero__product-drop[data-motion-product="${id}"]`,
          );
          const shadow = anchor.querySelector(".hero__product-shadow");
          const matrix = new DOMMatrixReadOnly(
            getComputedStyle(product).transform,
          );

          return {
            id,
            productY: matrix.m42,
            shadowOpacity: Number(getComputedStyle(shadow).opacity),
          };
        }),
      );

    await testInfo.attach("hero-shadows-hidden-in-flight", {
      body: await page.locator(".hero--product-drop").screenshot({
        path: resolve(
          process.cwd(),
          "storage/recovery/hero-shadows-in-flight.png",
        ),
      }),
      contentType: "image/png",
    });

    await expect
      .poll(async () => {
        const state = await readProductShadowState();
        return state.filter(({ shadowOpacity }) => shadowOpacity > 0.05).length;
      })
      .toBeGreaterThan(0);

    const contactState = await readProductShadowState();
    const contactingProducts = contactState.filter(
      ({ shadowOpacity }) => shadowOpacity > 0.05,
    );
    expect(
      contactingProducts.every(
        ({ productY }) => productY <= 0 && productY > -80,
      ),
    ).toBe(true);

    await expect(stage).toHaveAttribute("data-motion-state", "settled", {
      timeout: 10_000,
    });
    const motionSamples = await page.evaluate(
      () =>
        /** @type {Window & {
         *   __heroShadowSamples: Array<Array<{
         *     productY: number;
         *     shadowOpacity: number;
         *   }>>;
         * }} */ (window).__heroShadowSamples,
    );
    expect(
      motionSamples.some((sample) =>
        sample.every(
          ({ productY, shadowOpacity }) =>
            productY < -100 && shadowOpacity <= 0.01,
        ),
      ),
    ).toBe(true);
    const prematureShadowSamples = motionSamples.flatMap((sample) =>
      sample.filter(
        ({ productY, shadowOpacity }) =>
          productY <= -80 && shadowOpacity > 0.01,
      ),
    );
    expect(prematureShadowSamples).toEqual([]);
    const settledState = await readProductShadowState();
    expect(
      settledState.every(
        ({ productY, shadowOpacity }) =>
          Math.abs(productY) <= 0.5 && shadowOpacity === 1,
      ),
    ).toBe(true);

    const shadowAlignment = await stage.evaluate((element) =>
      Array.from(
        element.querySelectorAll(".hero__product-shadow-anchor"),
      ).map((anchor) => {
        const id = anchor.getAttribute("data-motion-product");
        const product = element.querySelector(
          `.hero__product-drop[data-motion-product="${id}"]`,
        );
        const anchorRect = anchor.getBoundingClientRect();
        const productRect = product.getBoundingClientRect();
        const shadowImage = anchor.querySelector(
          ".hero__product-shadow-image",
        );

        return {
          centerDelta: Math.abs(
            anchorRect.left + anchorRect.width / 2 -
              (productRect.left + productRect.width / 2),
          ),
          castPointsLeft:
            new DOMMatrixReadOnly(getComputedStyle(shadowImage).transform).a <
            0,
          widthRatio: anchorRect.width / productRect.width,
        };
      }),
    );
    expect(
      shadowAlignment.every(
        ({ castPointsLeft, centerDelta, widthRatio }) =>
          castPointsLeft && centerDelta <= 1 && widthRatio >= 1.4,
      ),
    ).toBe(true);
  });

  test("respeita movimento reduzido e mantem a composicao unica", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openAnimatedHome(page);

    const stage = page.locator(".hero__product-stage");
    await expect(stage).toHaveAttribute("data-motion-state", "settled");
    await expect(page.locator(".hero__product-background")).toHaveCount(1);
    await expect(page.locator(".hero__product-motion")).toHaveCount(1);
    await expect(page.locator(".hero__product-drop")).toHaveCount(3);
    await expect(page.locator(".hero__media--product-final")).toHaveCount(0);
    expect(
      await stage.evaluate(
        (element) =>
          element
            .getAnimations({ subtree: true })
            .filter((animation) => animation.playState === "running").length,
      ),
    ).toBe(0);
  });

  test("precarrega e aguarda a decodificacao antes de iniciar", async ({
    page,
  }) => {
    await openAnimatedHome(page, { holdDecode: true, imageDelay: 180 });
    const stage = page.locator(".hero__product-stage");

    await expect
      .poll(() =>
        page.evaluate(
          () =>
            /** @type {Window & { __heroDecodeCalls: string[] }} */ (window)
              .__heroDecodeCalls.length,
        ),
      )
      .toBeGreaterThanOrEqual(2);
    await expect(stage).toHaveAttribute("data-motion-state", "loading");
    await expect
      .poll(() =>
        page
          .locator(".hero__product-drop")
          .evaluateAll((products) =>
            products.map((product) => getComputedStyle(product).opacity),
          ),
      )
      .toEqual(["0", "0", "0"]);
    await expect(page.locator('link[rel="preload"][as="image"]')).toHaveCount(
      2,
    );
    await page.evaluate(() =>
      /** @type {Window & { __releaseHeroDecode?: () => void }} */ (window)
        .__releaseHeroDecode?.(),
    );
    await expect(stage).toHaveAttribute("data-motion-state", "running", {
      timeout: 5_000,
    });
    await expect(stage).toHaveAttribute("data-motion-state", "settled", {
      timeout: 6_000,
    });
    expect(
      await page
        .locator(".hero__product-drop")
        .evaluateAll((products) =>
          products.map((product) => getComputedStyle(product).opacity),
        ),
    ).toEqual(["1", "1", "1"]);
  });

  test("imagem sem marcador continua estatica", async ({ page }) => {
    await prepareHome(page, { animated: false });
    await page.goto(homeUrl, { waitUntil: "domcontentloaded" });

    await expect(page.locator(".hero__product-stage")).toHaveCount(0);
    await expect(page.locator(".hero > .hero__media")).toHaveCount(1);
  });

  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 523, height: 317 },
    { width: 600, height: 960 },
    { width: 667, height: 375 },
    { width: 739, height: 579 },
    { width: 739, height: 844 },
    { width: 768, height: 1024 },
    { width: 844, height: 390 },
    { width: 1024, height: 768 },
    { width: 1025, height: 768 },
    { width: 1440, height: 900 },
  ]) {
    test(`${viewport.width}x${viewport.height} preserva produtos e titulo`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await openAnimatedHome(page);
      const stage = page.locator(".hero__product-stage");
      await expect(stage).toHaveAttribute("data-motion-state", "settled", {
        timeout: 8_000,
      });

      const layout = await page.evaluate(() => {
        const hero = document.querySelector(".hero").getBoundingClientRect();
        const sourceWidth = 1536;
        const sourceHeight = 878;
        const sourceSurface = 667;
        const heroRatio = hero.width / hero.height;
        const sourceRatio = sourceWidth / sourceHeight;
        const renderedBackgroundHeight =
          heroRatio > sourceRatio ? hero.width / sourceRatio : hero.height;
        const backgroundOffsetY =
          (hero.height - renderedBackgroundHeight) / 2;
        const surfaceLine =
          hero.top +
          backgroundOffsetY +
          renderedBackgroundHeight * (sourceSurface / sourceHeight);
        const textRects = [".hero__eyebrow", ".hero h1"].map((selector) => {
          const range = document.createRange();
          range.selectNodeContents(document.querySelector(selector));
          return range.getBoundingClientRect();
        });
        const products = Array.from(
          document.querySelectorAll(".hero__product-drop"),
        ).map((product) => {
          const rect = product.getBoundingClientRect();
          const id = product.getAttribute("data-motion-product");
          const overlapsTitle = textRects.some(
            (textRect) =>
              !(
                rect.right <= textRect.left ||
                rect.left >= textRect.right ||
                rect.bottom <= textRect.top ||
                rect.top >= textRect.bottom
              ),
          );
          return {
            bottom: rect.bottom,
            id,
            left: rect.left,
            overlapsTitle,
            right: rect.right,
            top: rect.top,
          };
        });
        return {
          documentWidth: document.documentElement.scrollWidth,
          hero: {
            left: hero.left,
            right: hero.right,
            top: hero.top,
            bottom: hero.bottom,
          },
          products,
          surfaceLine,
          viewportWidth: document.documentElement.clientWidth,
        };
      });

      expect(layout.documentWidth).toBeLessThanOrEqual(
        layout.viewportWidth + 1,
      );
      for (const product of layout.products) {
        expect(
          product.left,
          `${product.id} cortado a esquerda`,
        ).toBeGreaterThanOrEqual(layout.hero.left - 1);
        expect(
          product.right,
          `${product.id} cortado a direita`,
        ).toBeLessThanOrEqual(layout.hero.right + 1);
        expect(
          product.top,
          `${product.id} cortado no topo`,
        ).toBeGreaterThanOrEqual(layout.hero.top - 1);
        expect(
          product.bottom,
          `${product.id} cortado na base`,
        ).toBeLessThanOrEqual(layout.hero.bottom + 1);
        expect(
          Math.abs(product.bottom - layout.surfaceLine),
          `${product.id} separado da superficie`,
        ).toBeLessThanOrEqual(2);
        expect(product.overlapsTitle, `${product.id} sobrepoe o titulo`).toBe(
          false,
        );
      }
    });
  }
});
