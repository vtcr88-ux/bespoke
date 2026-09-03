import { expect, test } from "@playwright/test";

const email = process.env.CONTROL_E2E_EMAIL;
const password = process.env.CONTROL_E2E_PASSWORD;
const expectedInstance = process.env.CONTROL_E2E_EXPECT_INSTANCE;

test.describe("Bespoke Control", () => {
  test.skip(!email || !password, "Configure credenciais locais do Control para o teste E2E.");

  for (const viewport of [
    { name: "mobile", width: 390, height: 844 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "desktop", width: 1440, height: 900 },
  ]) {
    test(`login e navegacao responsiva em ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("http://127.0.0.1:5175/");
      await page.getByLabel("E-mail").fill(email);
      await page.getByLabel("Senha").fill(password);
      await page.getByRole("button", { name: "Entrar no painel" }).click();
      await expect(page.getByRole("heading", { name: "Visao geral" })).toBeVisible();
      if (expectedInstance) {
        await expect(
          page.getByRole("link", { name: new RegExp(expectedInstance, "i") }),
        ).toBeVisible();
        await page.screenshot({
          path: `test-results/control-${viewport.name}-dashboard.png`,
          fullPage: true,
        });
      }

      if (viewport.width <= 760) {
        await page.getByRole("button", { name: "Abrir menu" }).click();
        await expect(page.getByRole("navigation", { name: "Navegacao principal" })).toBeVisible();
        await page
          .getByRole("navigation", { name: "Navegacao principal" })
          .getByRole("link", { name: "Nova loja" })
          .click();
      } else {
        await page.getByRole("link", { name: "Nova loja" }).first().click();
      }

      await expect(page.getByRole("heading", { name: "Nova loja" })).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      expect(overflow).toBe(false);
      await page.screenshot({ path: `test-results/control-${viewport.name}.png`, fullPage: true });
    });
  }
});
