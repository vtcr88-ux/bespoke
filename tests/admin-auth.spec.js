// @ts-check
import { expect, test } from "@playwright/test";

const adminUrl = "http://localhost:5174";
const testEmail = "owner@example.test";
const testPassword = "correct-test-password";

function corsHeaders() {
  return {
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": "content-type, x-csrf-token",
    "access-control-allow-methods": "GET, PATCH, POST, PUT, DELETE, OPTIONS",
    "access-control-allow-origin": adminUrl,
  };
}

async function mockAdminApi(page) {
  let authenticated = false;
  let protectedRequests = 0;
  let logoutCsrf = "";
  const requestHosts = [];

  await page.route("**/admin/**", async (route) => {
    const headers = corsHeaders();
    const request = route.request();
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers });
      return;
    }

    const pathname = new URL(request.url()).pathname;
    requestHosts.push(new URL(request.url()).hostname);
    if (pathname === "/admin/auth/session") {
      await route.fulfill(
        authenticated
          ? { headers, json: sessionPayload() }
          : {
              status: 401,
              headers,
              json: {
                error: {
                  code: "AUTHENTICATION_REQUIRED",
                  message: "Authentication is required.",
                },
              },
            },
      );
      return;
    }

    if (pathname === "/admin/auth/login") {
      const payload = request.postDataJSON();
      authenticated =
        payload.email === testEmail && payload.password === testPassword;
      await route.fulfill(
        authenticated
          ? { headers, json: sessionPayload() }
          : {
              status: 401,
              headers,
              json: {
                error: {
                  code: "INVALID_CREDENTIALS",
                  message: "Nao foi possivel autenticar com os dados informados.",
                },
              },
            },
      );
      return;
    }

    if (pathname === "/admin/auth/logout") {
      logoutCsrf = request.headers()["x-csrf-token"] ?? "";
      authenticated = false;
      await route.fulfill({ status: 204, headers });
      return;
    }

    protectedRequests += 1;
    if (pathname === "/admin/storefront") {
      await route.fulfill({
        headers,
        json: { brandName: "Bespoke", adminFont: "signature" },
      });
      return;
    }
    if (pathname === "/admin/overview") {
      await route.fulfill({
        headers,
        json: {
          metrics: {
            confirmedRevenueInCents: 0,
            pendingOrders: 0,
            lowStockCount: 0,
            activeProducts: 0,
            inventoryValueInCents: 0,
          },
          alerts: [],
          recentOrders: [],
        },
      });
      return;
    }
    await route.fulfill({ headers, json: { items: [] } });
  });

  return {
    logoutCsrf: () => logoutCsrf,
    protectedRequests: () => protectedRequests,
    requestHosts: () => requestHosts,
  };
}

function sessionPayload() {
  return {
    admin: { email: testEmail, role: "owner" },
    csrfToken: "playwright-csrf-token",
    expiresAt: "2099-01-01T00:00:00.000Z",
  };
}

test("login protege o painel, responde em todas as telas e encerra a sessao", async ({
  page,
}) => {
  const api = await mockAdminApi(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(adminUrl, { waitUntil: "domcontentloaded" });

  await expect(
    page.getByRole("heading", { name: "Entrar no painel" }),
  ).toBeVisible();
  await expect(page.getByLabel("E-mail")).toBeFocused();
  expect(api.protectedRequests()).toBe(0);
  expect(api.requestHosts()).toContain("localhost");
  expect(api.requestHosts()).not.toContain("127.0.0.1");

  await page.getByLabel("E-mail").fill(testEmail);
  await page.getByLabel("Senha", { exact: true }).fill("wrong-test-password");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText("E-mail ou senha invalidos.");

  await page.getByLabel("Senha", { exact: true }).fill(testPassword);
  await page.getByRole("button", { name: "Mostrar senha" }).click();
  await expect(page.getByLabel("Senha", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Dashboard", level: 1 }),
  ).toBeVisible();
  await expect(page.getByText(testEmail)).toBeVisible();
  expect(api.protectedRequests()).toBeGreaterThan(0);
  await page.screenshot({ path: "test-results/admin-authenticated-desktop.png" });

  await page.setViewportSize({ width: 1440, height: 617 });
  const sidebarNav = page.locator(".sidebar nav");
  await expect(sidebarNav).toBeVisible();
  expect(
    await sidebarNav.evaluate(
      (element) => element.scrollHeight > element.clientHeight,
    ),
  ).toBe(true);
  await sidebarNav.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(page.getByRole("link", { name: "Config" })).toBeVisible();
  await page.screenshot({ path: "test-results/admin-sidebar-scroll-desktop.png" });

  await page.setViewportSize({ width: 1440, height: 900 });

  await page.evaluate((eventName) => {
    window.dispatchEvent(new Event(eventName));
    window.dispatchEvent(new Event(eventName));
    window.dispatchEvent(new Event(eventName));
  }, "bespoke:admin-unauthorized");
  await expect(
    page.getByRole("heading", { name: "Entrar no painel" }),
  ).toBeVisible();
  await expect(
    page.getByText("Sua sessao expirou. Entre novamente."),
  ).toHaveCount(1);

  await page.getByLabel("E-mail").fill(testEmail);
  await page.getByLabel("Senha", { exact: true }).fill(testPassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Dashboard", level: 1 }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Sair do painel" }).click();
  await expect(
    page.getByRole("heading", { name: "Entrar no painel" }),
  ).toBeVisible();
  expect(api.logoutCsrf()).toBe("playwright-csrf-token");

  for (const viewport of [
    { width: 320, height: 720 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(
      page.getByRole("heading", { name: "Entrar no painel" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/admin-login-mobile.png" });
});
