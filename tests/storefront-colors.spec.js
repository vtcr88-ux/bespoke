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

function colorChannels(value) {
  return (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
}

function relativeLuminance(value) {
  const [red, green, blue] = colorChannels(value).map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(first, second) {
  const lightest = Math.max(
    relativeLuminance(first),
    relativeLuminance(second),
  );
  const darkest = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (lightest + 0.05) / (darkest + 0.05);
}

async function readSignatureColors(page) {
  return page.evaluate(() => {
    const shell = document.querySelector(".store-shell");
    const eyebrow = document.querySelector(".section-heading p");
    const footer = document.querySelector(".site-footer");

    if (!shell || !eyebrow || !footer) {
      throw new Error("Assinatura visual da Home nao encontrada");
    }

    return {
      accent: getComputedStyle(shell)
        .getPropertyValue("--color-brand-accent")
        .trim(),
      eyebrow: getComputedStyle(eyebrow).color,
      footer: getComputedStyle(footer).backgroundColor,
      footerText: getComputedStyle(
        footer.querySelector(".brand__wordmark strong"),
      ).color,
    };
  });
}

async function readPreviewColors(page) {
  await expect(page.locator(".storefront-live-preview")).toHaveAttribute(
    "data-live-preview-status",
    "synced",
  );
  const preview = page.frameLocator(".storefront-live-preview iframe");
  return preview.locator(".store-shell").evaluate((shell) => {
    const footer = shell.querySelector(".site-footer");
    const footerText = footer?.querySelector(".brand__wordmark strong");
    if (!footer || !footerText) {
      throw new Error("Preview de aparencia nao encontrado");
    }

    return {
      accent: getComputedStyle(shell)
        .getPropertyValue("--color-brand-accent")
        .trim(),
      footer: getComputedStyle(footer).backgroundColor,
      footerText: getComputedStyle(footerText).color,
    };
  });
}

async function readHomeAccentTargets(page) {
  return page.evaluate(() => {
    const selectors = [
      ".home-page .section-heading p",
      ".home-page .product-card__meta > span:not(.product-card__stock)",
      ".home-page h3",
      ".home-page h4",
      ".home-page h5",
      ".home-page h6",
    ];

    return selectors.flatMap((selector) =>
      [...document.querySelectorAll(selector)].map((element) => ({
        color: getComputedStyle(element).color,
        selector,
        text: element.textContent?.trim() ?? "",
      })),
    );
  });
}

test.describe("Cores configuraveis da vitrine", () => {
  test("admin publica destaque e rodape com cores independentes", async ({
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
    const publishedAccent = "#2f6f74";
    const publishedFooter = "#4a2034";
    const publicPage = await context.newPage();

    try {
      await publicPage.goto(publicUrl, { waitUntil: "domcontentloaded" });
      await expect(publicPage.locator(".site-footer")).toBeAttached();

      await page.goto(adminUrl, { waitUntil: "domcontentloaded" });
      await page.getByRole("tab", { name: "Composicao" }).click();
      const accentInput = page.getByLabel("Cor de destaque");
      const footerInput = page.getByLabel("Cor do rodape");
      await expect(accentInput).toBeVisible();
      await expect(footerInput).toBeVisible();
      await expect(accentInput).toHaveAttribute("type", "text");
      await expect(footerInput).toHaveAttribute("type", "text");
      await expect(accentInput).toHaveAttribute("placeholder", "#C9A76D");
      await expect(footerInput).toHaveAttribute("placeholder", "#C9A76D");
      await accentInput.fill(publishedAccent);
      await footerInput.fill(publishedFooter);

      const preview = await readPreviewColors(page);
      expect(preview.accent).toBe(publishedAccent);
      expect(preview.footer).toBe("rgb(74, 32, 52)");
      expect(
        contrastRatio(preview.footer, preview.footerText),
      ).toBeGreaterThanOrEqual(4.5);

      await page.getByRole("button", { name: "Salvar vitrine" }).click();
      await expect(
        page.getByText("Configuracoes da vitrine salvas."),
      ).toBeVisible();

      await expect
        .poll(async () => {
          const response = await request.get(settingsUrl);
          const settings = await response.json();
          return [settings.accentColor, settings.footerColor];
        })
        .toEqual([publishedAccent, publishedFooter]);

      await expect
        .poll(async () => (await readSignatureColors(publicPage)).accent)
        .toBe(publishedAccent);

      const published = await readSignatureColors(publicPage);
      expect(published.footer).toBe("rgb(74, 32, 52)");
      expect(published.eyebrow).toBe("rgb(47, 111, 116)");
      expect(
        contrastRatio(published.footer, published.footerText),
      ).toBeGreaterThanOrEqual(4.5);

      const homeAccentTargets = await readHomeAccentTargets(publicPage);
      expect(homeAccentTargets.length).toBeGreaterThan(1);
      for (const target of homeAccentTargets) {
        expect(target.color, `${target.selector}: ${target.text}`).toBe(
          "rgb(47, 111, 116)",
        );
      }

      await publicPage.reload({ waitUntil: "domcontentloaded" });
      await expect(publicPage.locator(".section-heading p")).toBeAttached();
      expect((await readSignatureColors(publicPage)).footer).toBe(
        "rgb(74, 32, 52)",
      );

      for (const viewport of [
        { width: 390, height: 844 },
        { width: 768, height: 1024 },
        { width: 1440, height: 900 },
      ]) {
        await publicPage.setViewportSize(viewport);
        expect(
          await publicPage.evaluate(
            () =>
              document.documentElement.scrollWidth <=
              document.documentElement.clientWidth,
          ),
        ).toBe(true);
      }
    } finally {
      const restoreResponse = await page.request.patch(adminSettingsUrl, {
        data: originalSettings,
        headers: adminHeaders,
      });
      expect(restoreResponse.ok()).toBe(true);
      await publicPage.close();
    }
  });

  test("preview do admin separa destaque e rodape antes de salvar", async ({
    page,
  }) => {
    test.skip(
      !hasAdminTestCredentials(),
      "Credenciais E2E do admin nao configuradas.",
    );
    await authenticateAdmin(page.request);
    await page.goto(adminUrl, { waitUntil: "domcontentloaded" });
    await page.getByRole("tab", { name: "Composicao" }).click();
    const accentInput = page.getByLabel("Cor de destaque");
    const footerInput = page.getByLabel("Cor do rodape");
    await expect(accentInput).toBeVisible();
    await expect(footerInput).toBeVisible();

    const previewFrame = page.frameLocator(".storefront-live-preview iframe");
    const previewEyebrow = previewFrame.locator(".section-heading p");
    const previewFooter = previewFrame.locator(".site-footer");
    await expect(previewEyebrow).toBeAttached();
    const before = {
      eyebrow: await previewEyebrow.evaluate(
        (element) => getComputedStyle(element).color,
      ),
      footer: await previewFooter.evaluate(
        (element) => getComputedStyle(element).backgroundColor,
      ),
    };

    await accentInput.fill("#12ZZ99");
    await expect(accentInput).toHaveAttribute("aria-invalid", "true");
    await expect(
      page.getByText("Informe uma cor com # e seis digitos, como #C9A76D."),
    ).toBeVisible();
    expect(
      await previewFooter.evaluate(
        (element) => getComputedStyle(element).backgroundColor,
      ),
    ).toBe(before.footer);

    const previewAccent =
      (await accentInput.inputValue()).toLowerCase() === "#2f6f74"
        ? "#a34252"
        : "#2f6f74";
    await accentInput.fill(previewAccent);
    const after = {
      eyebrow: await previewEyebrow.evaluate(
        (element) => getComputedStyle(element).color,
      ),
      footer: await previewFooter.evaluate(
        (element) => getComputedStyle(element).backgroundColor,
      ),
    };

    expect(after.eyebrow).not.toBe(before.eyebrow);
    expect(after.footer).toBe(before.footer);

    const nextFooter =
      (await footerInput.inputValue()).toLowerCase() === "#4a2034"
        ? "#68364a"
        : "#4a2034";
    await footerInput.fill(nextFooter);
    await expect
      .poll(() =>
        previewFooter.evaluate(
          (element) => getComputedStyle(element).backgroundColor,
        ),
      )
      .not.toBe(before.footer);
    const footerAfter = await previewFooter.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    );
    expect(footerAfter).not.toBe(before.footer);
    expect(
      await previewEyebrow.evaluate(
        (element) => getComputedStyle(element).color,
      ),
    ).toBe(after.eyebrow);
  });
});
