// @ts-check
import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const webOrigin = "http://localhost:4173";
const adminOrigin = "http://localhost:4174";
const imageStub =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const pixCode =
  "00020126580014br.gov.bcb.pix0136financeiro@loja.test5204000053039865406289.005802BR5910LOJA TESTE6009SAO PAULO62170513PIXTESTE000016304ABCD";

test.describe.configure({ mode: "serial", timeout: 60_000 });

async function serveDist(page, origin, app) {
  const distRoot = resolve(process.cwd(), `apps/${app}/dist`);
  await page.route(`${origin}/**`, async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const assetPath = pathname.startsWith("/assets/")
      ? resolve(distRoot, `.${pathname}`)
      : resolve(distRoot, "index.html");
    if (
      assetPath !== resolve(distRoot, "index.html") &&
      !assetPath.startsWith(`${distRoot}${sep}`)
    ) {
      await route.fulfill({ status: 404, body: "Not found" });
      return;
    }
    await route.fulfill({
      body: await readFile(assetPath),
      contentType:
        { ".css": "text/css", ".html": "text/html", ".js": "text/javascript", ".png": "image/png" }[
          extname(assetPath)
        ] ?? "application/octet-stream",
    });
  });
}

async function prepareStorefront(page) {
  await serveDist(page, webOrigin, "web");
  await page.addInitScript((stub) => {
    localStorage.setItem(
      "bespoke-cart-v1",
      JSON.stringify({
        state: {
          items: [
            {
              id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
              slug: "produto-pix",
              name: "Produto Pix",
              sku: "PIX-001",
              priceInCents: 28900,
              imageUrl: stub,
              quantity: 1,
            },
          ],
        },
        version: 0,
      }),
    );
  }, imageStub);
  await page.route("**/storefront/settings", (route) =>
    route.fulfill({
      json: {
        brandName: "Loja Pix",
        logoUrl: "",
        logoOnDarkUrl: "",
        footerLinks: [],
        footerSlogan: "Atendimento cuidadoso.",
        footerShowBrandName: true,
        footerWhatsappButtonLabel: "Atendimento WhatsApp",
        footerHeading: "Loja",
        footerServiceHeading: "Atendimento",
        footerServiceLineOne: "Seg-Sex",
        footerServiceLineTwo: "Sabado",
        footerWhatsappLinkLabel: "Falar agora",
        footerCopyrightText: "Loja Pix",
        footerSecurityText: "Pagamento seguro",
        whatsappNumber: "5511999999999",
      },
    }),
  );
  await page.route("**/storefront/events", (route) =>
    route.fulfill({ status: 204 }),
  );
  await page.route("**/checkout/payment-methods", (route) =>
    route.fulfill({
      json: { pixManualEnabled: true, mercadoPagoEnabled: true },
    }),
  );
  await page.route("**/checkout/orders/*/pix", (route) =>
    route.fulfill({
      json: {
        orderReference: "PIX-TESTE00001",
        amountInCents: 28900,
        currency: "BRL",
        pixCode,
        qrCodeDataUrl: imageStub,
        whatsappUrl: "https://wa.me/5511999999999?text=Comprovante",
        paymentStatus: "pending",
        status: "pending_confirmation",
      },
    }),
  );
  await page.route("**/checkout/pix", (route) =>
    route.fulfill({
      status: 201,
      json: {
        orderReference: "PIX-TESTE00001",
        amountInCents: 28900,
        currency: "BRL",
        pixCode,
        qrCodeDataUrl: imageStub,
        whatsappUrl: "https://wa.me/5511999999999?text=Comprovante",
        paymentStatus: "pending",
        status: "pending_confirmation",
        checkoutAccessToken: "t".repeat(43),
        reused: false,
      },
    }),
  );
}

for (const viewport of [
  { width: 320, height: 720, name: "mobile" },
  { width: 1440, height: 900, name: "desktop" },
]) {
  test(`checkout Pix permanece legivel em ${viewport.name}`, async ({ page }) => {
    await prepareStorefront(page);
    await page.setViewportSize(viewport);
    await page.goto(`${webOrigin}/checkout`);
    await page.getByLabel("Nome completo").fill("Cliente Pix");
    await page.getByLabel("E-mail").fill("cliente@example.test");
    await page.getByLabel("Telefone").fill("11999999999");
    await expect(
      page.getByRole("radio", { name: /Pagar via Pix automaticamente/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("radio", { name: /Pagar com cartao via Mercado Pago/ }),
    ).toBeVisible();
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Gerar Pix e continuar" }).click();
    await expect(
      page.getByRole("heading", { name: "Pagamento via Pix" }),
    ).toBeVisible();
    await expect(page.getByText("R$ 289,00")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Copiar codigo Pix" }),
    ).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client + 1);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `test-results/pix-checkout-${viewport.name}.png`,
      fullPage: true,
    });
  });
}

test("admin configura e revisa Pix no mobile", async ({ page }) => {
  await serveDist(page, adminOrigin, "admin");
  await page.route("**/admin/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/admin/auth/session") {
      await route.fulfill({
        json: {
          admin: { email: "owner@example.test", role: "owner" },
          csrfToken: "csrf-test",
          expiresAt: "2099-01-01T00:00:00.000Z",
        },
      });
      return;
    }
    if (pathname === "/admin/payments/pix") {
      await route.fulfill({
        json: {
          enabled: true,
          key: "financeiro@loja.test",
          receiverName: "Loja Teste",
          receiverCity: "Sao Paulo",
        },
      });
      return;
    }
    if (pathname === "/admin/orders") {
      await route.fulfill({
        json: {
          items: [
            {
              id: "11111111-1111-4111-8111-111111111111",
              publicReference: "PIX-TESTE00001",
              customerName: "Cliente Pix",
              customerEmail: "cliente@example.test",
              customerPhone: "11999999999",
              status: "pending_payment",
              salesChannel: "online",
              paymentMethod: "pix_manual",
              paymentStatus: "pending",
              shippingMode: "whatsapp_after_payment",
              shippingStatus: "awaiting_payment",
              contactStatus: "not_started",
              subtotalInCents: 28900,
              discountInCents: 0,
              shippingAmountInCents: null,
              totalInCents: 28900,
              currency: "BRL",
              shippingNotes: null,
              deliveryMethod: "undecided",
              deliveryAddress: null,
              pickupInstructions: null,
              shippingContactedAt: null,
              shippingArrangedAt: null,
              revenueConfirmedAt: null,
              archivedAt: null,
              createdAt: "2026-08-16T12:00:00.000Z",
              updatedAt: "2026-08-16T12:00:00.000Z",
              items: [],
            },
          ],
        },
      });
      return;
    }
    if (pathname === "/admin/storefront") {
      await route.fulfill({ json: { brandName: "Bespoke" } });
      return;
    }
    await route.fulfill({ json: {} });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${adminOrigin}/pagamentos`);
  await expect(page.getByRole("heading", { name: "Pagamentos" })).toBeVisible();
  await expect(page.getByLabel("Chave Pix")).toHaveValue(
    "financeiro@loja.test",
  );
  await expect(page.getByText("PIX-TESTE00001")).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client + 1);
  await page.screenshot({
    path: "test-results/pix-admin-mobile.png",
    fullPage: true,
  });
});
