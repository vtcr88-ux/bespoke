import { mkdtempSync, rmSync } from "node:fs";
import { createHmac } from "node:crypto";
import {
  isValidBrCode,
  parseStaticBrCode,
} from "@thiagoprazeres/pix-static-brcode";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  maxImageUploadBytes,
  type StorefrontSettings,
} from "@bespoke/contracts";
import { createApp } from "../src/app.js";
import type { AppEnv } from "../src/config/env.js";
import { createAdminPasswordHash } from "../src/modules/auth/admin-auth.service.js";
import {
  defaultStorefront,
  normalizeStorefrontSettings,
} from "../src/modules/store/commerce.store.js";

const uploadsDirectory = mkdtempSync(join(tmpdir(), "bespoke-api-uploads-"));
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);
const adminEmail = "owner@example.test";
const adminPassword = "correct-test-password";

const env: AppEnv = {
  NODE_ENV: "test",
  PORT: 3333,
  DATABASE_URL: "mysql://bespoke_app:replace_me@localhost:3306/bespoke",
  COMMERCE_STORAGE: "mysql",
  SESSION_SECRET: "test_session_secret_with_more_than_32_chars",
  CSRF_SECRET: "test_csrf_secret_with_more_than_32_chars",
  INSTANCE_ID: "bespoke-test",
  ADMIN_EMAIL: adminEmail,
  ADMIN_PASSWORD_HASH: "",
  ADMIN_SESSION_TTL_MINUTES: 480,
  CORS_ORIGINS: "http://localhost:5173,http://localhost:5174",
  LOG_LEVEL: "silent",
  MERCADO_PAGO_ACCESS_TOKEN: "TEST-replace_me",
  MERCADO_PAGO_WEBHOOK_SECRET: "replace_me",
  WHATSAPP_STORE_PHONE: "5511999999999",
  PUBLIC_API_URL: "http://localhost:3333",
  PUBLIC_WEB_URL: "http://localhost:5173",
  UPLOADS_DIR: uploadsDirectory,
};

describe("Bespoke API", () => {
  let app: ReturnType<typeof createApp>;
  let adminCookie = "";
  let session: Record<string, string> = {};

  beforeAll(async () => {
    env.ADMIN_PASSWORD_HASH = await createAdminPasswordHash(adminPassword);
    app = createApp(env);
    const login = await request(app)
      .post("/admin/auth/login")
      .send({ email: adminEmail, password: adminPassword })
      .expect(200);
    adminCookie =
      String(login.headers["set-cookie"]?.[0] ?? "").split(";")[0] ?? "";
    session = {
      Cookie: adminCookie,
      "x-csrf-token": login.body.csrfToken,
    };
  });

  afterAll(() => {
    rmSync(uploadsDirectory, { recursive: true, force: true });
  });

  it("preserves the legacy accent as the initial independent footer color", () => {
    const legacySettings: Partial<StorefrontSettings> = {
      ...defaultStorefront,
      accentColor: "#2f6f74",
    };
    delete legacySettings.footerColor;

    expect(normalizeStorefrontSettings(legacySettings).footerColor).toBe(
      "#2f6f74",
    );
    expect(
      normalizeStorefrontSettings({
        ...legacySettings,
        footerColor: "#4a2034",
      }).footerColor,
    ).toBe("#4a2034");
  });

  it("normalizes Header and Catalog without replacing component overrides", () => {
    const normalized = normalizeStorefrontSettings({
      ...defaultStorefront,
      primaryColor: "#161616",
      homeSurfaceColor: "#f3efe8",
      headerBackgroundColor: "#173c31",
      headerFontFamily: "humanist",
      headerButtonStyle: "minimal",
      catalogBackgroundColor: "#edf4f0",
      catalogAccentColor: "#28785f",
      catalogTextStyles: {
        ...defaultStorefront.catalogTextStyles,
        title: {
          ...defaultStorefront.catalogTextStyles.title,
          color: "#173c31",
          fontSize: 70,
        },
      },
    });

    expect(normalized).toMatchObject({
      primaryColor: "#161616",
      homeSurfaceColor: "#f3efe8",
      headerBackgroundColor: "#173c31",
      headerFontFamily: "humanist",
      headerButtonStyle: "minimal",
      catalogBackgroundColor: "#edf4f0",
      catalogAccentColor: "#28785f",
    });
    expect(normalized.catalogTextStyles.title).toMatchObject({
      color: "#173c31",
      fontSize: 70,
    });
  });

  it("adds new commerce sections to legacy Home settings without reordering them", () => {
    const normalized = normalizeStorefrontSettings({
      ...defaultStorefront,
      homeSections: [
        { id: "featured", enabled: true },
        { id: "navigation", enabled: false },
        { id: "manifesto", enabled: true },
      ],
    });

    expect(normalized.homeSections).toEqual([
      { id: "categories", enabled: true },
      { id: "featured", enabled: true },
      { id: "commerce", enabled: true },
      { id: "navigation", enabled: false },
      { id: "manifesto", enabled: true },
    ]);
    expect(normalized.homeMotionByBlock).toMatchObject({
      categories: "cascade",
      commerce: "soft",
    });
  });

  it("lists catalog products with cursor pagination", async () => {
    const response = await request(app)
      .get("/catalog/products?limit=2")
      .expect(200);

    expect(response.body.items).toHaveLength(2);
    expect(response.body.nextCursor).toBeTypeOf("string");
  });

  it("lists the current default product categories", async () => {
    const response = await request(app).get("/catalog/categories").expect(200);

    expect(
      response.body.items.map((category: { slug: string; name: string }) => ({
        slug: category.slug,
        name: category.name,
      })),
    ).toEqual([
      { slug: "chas-soluveis", name: "Ch\u00e1s Sol\u00faveis" },
      { slug: "encapsulados", name: "Encapsulados" },
      { slug: "injetaveis", name: "Injet\u00e1veis" },
      { slug: "suplementacoes", name: "Suplementa\u00e7\u00f5es" },
    ]);
  });

  it("exposes separate liveness and readiness checks", async () => {
    await request(app).get("/health/live").expect(200, { status: "ok" });
    await request(app).get("/health/ready").expect(200, { status: "ready" });
  });

  it("rejects unknown cart fields", async () => {
    const response = await request(app)
      .post("/cart/price")
      .send({
        items: [
          {
            productId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
            quantity: 1,
            priceInCents: 1,
          },
        ],
      })
      .expect(400);

    expect(response.body.error.code).toBe("INVALID_BODY");
  });

  it("prices products without inventing a shipping amount", async () => {
    const response = await request(app)
      .post("/cart/price")
      .send({
        items: [
          {
            productId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
            quantity: 1,
          },
        ],
      })
      .expect(200);

    expect(response.body.shippingAmountInCents).toBeNull();
    expect(response.body.shippingMode).toBe("whatsapp_after_payment");
    expect(response.body.totalInCents).toBe(response.body.subtotalInCents);
  });

  it("calculates real inventory metrics and manages WhatsApp revenue without deleting history", async () => {
    const products = await request(app)
      .get("/admin/products")
      .set(session)
      .expect(200);
    const activeProducts = products.body.items.filter(
      (product: { status: string }) => product.status === "active",
    );
    const expectedInventoryValue = activeProducts.reduce(
      (total: number, product: { priceInCents: number; stock: number }) =>
        total + product.priceInCents * product.stock,
      0,
    );
    const expectedStockUnits = activeProducts.reduce(
      (total: number, product: { stock: number }) => total + product.stock,
      0,
    );
    const initialOverview = await request(app)
      .get("/admin/overview")
      .set(session)
      .expect(200);

    expect(initialOverview.headers["cache-control"]).toContain("no-store");
    expect(initialOverview.body.metrics).toMatchObject({
      activeProducts: activeProducts.length,
      activeStockUnits: expectedStockUnits,
      inventoryValueInCents: expectedInventoryValue,
    });

    const whatsapp = await request(app)
      .post("/whatsapp/requests")
      .send({
        items: [
          {
            productId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
            quantity: 1,
          },
        ],
      })
      .expect(201);
    const reference = whatsapp.body.requestReference as string;
    const activeOrders = await request(app)
      .get("/admin/orders")
      .set(session)
      .expect(200);
    const order = activeOrders.body.items.find(
      (candidate: { publicReference: string }) =>
        candidate.publicReference === reference,
    );
    expect(order).toMatchObject({
      salesChannel: "whatsapp",
      revenueConfirmedAt: null,
      archivedAt: null,
    });

    const confirmed = await request(app)
      .patch(`/admin/orders/${reference}/whatsapp-revenue`)
      .set(session)
      .send({ confirmed: true })
      .expect(200);
    expect(confirmed.body.revenueConfirmedAt).toBeTypeOf("string");

    const confirmedOverview = await request(app)
      .get("/admin/overview")
      .set(session)
      .expect(200);
    expect(
      confirmedOverview.body.metrics.confirmedRevenueInCents -
        initialOverview.body.metrics.confirmedRevenueInCents,
    ).toBe(order.totalInCents);
    expect(
      confirmedOverview.body.revenueByChannel.whatsapp,
    ).toBeGreaterThanOrEqual(order.totalInCents);
    expect(
      confirmedOverview.body.monthlyRevenue[0].totalInCents,
    ).toBeGreaterThanOrEqual(order.totalInCents);

    await request(app)
      .patch("/admin/orders/archive")
      .set(session)
      .send({ references: [reference], archived: true })
      .expect(200, { changed: 1 });
    const current = await request(app)
      .get("/admin/orders")
      .set(session)
      .expect(200);
    expect(
      current.body.items.some(
        (candidate: { publicReference: string }) =>
          candidate.publicReference === reference,
      ),
    ).toBe(false);
    const archived = await request(app)
      .get("/admin/orders?archived=true")
      .set(session)
      .expect(200);
    expect(
      archived.body.items.find(
        (candidate: { publicReference: string }) =>
          candidate.publicReference === reference,
      )?.archivedAt,
    ).toBeTypeOf("string");
    const archivedOverview = await request(app)
      .get("/admin/overview")
      .set(session)
      .expect(200);
    expect(archivedOverview.body.metrics.confirmedRevenueInCents).toBe(
      initialOverview.body.metrics.confirmedRevenueInCents,
    );

    await request(app)
      .patch("/admin/orders/archive")
      .set(session)
      .send({ references: [reference], archived: false })
      .expect(200, { changed: 1 });
    await request(app)
      .patch(`/admin/orders/${reference}/whatsapp-revenue`)
      .set(session)
      .send({ confirmed: false })
      .expect(200);
  });

  it("generates an idempotent Pix order and requires manual admin confirmation", async () => {
    await request(app).get("/checkout/payment-methods").expect(200, {
      pixManualEnabled: false,
      mercadoPagoEnabled: true,
    });

    await request(app)
      .patch("/admin/payments/pix")
      .set(session)
      .send({
        enabled: true,
        key: "chave-invalida",
        receiverName: "Loja Teste",
        receiverCity: "Sao Paulo",
      })
      .expect(400);

    await request(app)
      .patch("/admin/payments/pix")
      .set(session)
      .send({
        enabled: true,
        key: "financeiro@loja.test",
        receiverName: "Loja Teste",
        receiverCity: "Sao Paulo",
      })
      .expect(200);
    await request(app).get("/checkout/payment-methods").expect(200, {
      pixManualEnabled: true,
      mercadoPagoEnabled: true,
    });

    const payload = {
      operationId: "11111111-1111-4111-8111-111111111111",
      items: [
        {
          productId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
          quantity: 1,
        },
      ],
      customer: {
        name: "Cliente Pix",
        email: "cliente.pix@example.test",
        phone: "11999999999",
      },
      shippingAcknowledged: true,
    };
    await request(app)
      .post("/checkout/pix")
      .send({
        ...payload,
        operationId: "22222222-2222-4222-8222-222222222222",
        items: [{ ...payload.items[0], priceInCents: 1 }],
      })
      .expect(400);
    await request(app)
      .get("/checkout/orders/PIX-INEXISTENTE/pix")
      .set("Authorization", `Bearer ${"x".repeat(43)}`)
      .expect(404);
    const created = await request(app)
      .post("/checkout/pix")
      .send(payload)
      .expect(201);
    expect(created.body).toMatchObject({
      amountInCents: 28_900,
      currency: "BRL",
      paymentStatus: "pending",
      status: "pending_confirmation",
      reused: false,
    });
    expect(created.body.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(
      Buffer.from(created.body.qrCodeDataUrl.split(",")[1], "base64")
        .subarray(0, 8)
        .toString("hex"),
    ).toBe("89504e470d0a1a0a");
    expect(isValidBrCode(created.body.pixCode)).toBe(true);
    expect(parseStaticBrCode(created.body.pixCode)).toMatchObject({
      pixKey: "financeiro@loja.test",
      amount: 289,
    });
    const reference = created.body.orderReference as string;
    const token = created.body.checkoutAccessToken as string;
    const proofMessage =
      new URL(created.body.whatsappUrl).searchParams.get("text") ?? "";
    expect(proofMessage).toContain(reference);
    expect(proofMessage.replace(/\s/g, " ")).toContain("R$ 289,00");

    await request(app).get(`/checkout/orders/${reference}/pix`).expect(401);
    const details = await request(app)
      .get(`/checkout/orders/${reference}/pix`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(details.body.pixCode).toBe(created.body.pixCode);
    await request(app)
      .post(`/checkout/orders/${reference}/pix/whatsapp-open`)
      .set("Authorization", `Bearer ${token}`)
      .expect(204);

    const replay = await request(app)
      .post("/checkout/pix")
      .send(payload)
      .expect(200);
    expect(replay.body).toMatchObject({
      orderReference: reference,
      checkoutAccessToken: token,
      reused: true,
    });
    const conflict = await request(app)
      .post("/checkout/pix")
      .send({
        ...payload,
        items: [{ ...payload.items[0], quantity: 2 }],
      })
      .expect(409);
    expect(conflict.body.error.code).toBe("IDEMPOTENCY_KEY_REUSED");

    const listed = await request(app)
      .get("/admin/orders")
      .set(session)
      .expect(200);
    expect(
      listed.body.items.find(
        (order: { publicReference: string }) =>
          order.publicReference === reference,
      ),
    ).toMatchObject({
      paymentMethod: "pix_manual",
      paymentStatus: "pending",
      shippingAmountInCents: null,
    });
    await request(app)
      .patch(`/admin/orders/${reference}/whatsapp-revenue`)
      .set(session)
      .send({ confirmed: true })
      .expect(409);
    const approved = await request(app)
      .patch(`/admin/orders/${reference}/pix-payment`)
      .set(session)
      .send({ status: "approved" })
      .expect(200);
    expect(approved.body).toMatchObject({
      status: "paid",
      paymentStatus: "approved",
      shippingStatus: "awaiting_contact",
    });
    expect(approved.body.revenueConfirmedAt).toBeTypeOf("string");
    await request(app)
      .patch(`/admin/orders/${reference}/pix-payment`)
      .set(session)
      .send({ status: "approved" })
      .expect(200);
    await request(app)
      .patch(`/admin/orders/${reference}/pix-payment`)
      .set(session)
      .send({ status: "rejected" })
      .expect(409);
    const approvedDetails = await request(app)
      .get(`/checkout/orders/${reference}/pix`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(approvedDetails.body.status).toBe("approved");

    await request(app)
      .patch("/admin/orders/archive")
      .set(session)
      .send({ references: [reference], archived: true })
      .expect(200);
    await request(app)
      .patch("/admin/payments/pix")
      .set(session)
      .send({ enabled: false, key: "", receiverName: "", receiverCity: "" })
      .expect(200);
  });

  it("uses the public API callback when the storefront runs on localhost", async () => {
    let successBackUrl = "";
    const providerEnv: AppEnv = {
      ...env,
      MERCADO_PAGO_ACCESS_TOKEN: "APP_USR-valid-test-token",
      PUBLIC_API_URL: "https://api.store.test",
      PUBLIC_WEB_URL: "http://localhost:5173",
    };
    const providerApp = createApp(providerEnv, {
      mercadoPagoPreferenceCreate: async ({ body }) => {
        successBackUrl = body.back_urls?.success ?? "";
        return {
          api_response: {
            status: 201,
            headers: ["content-type", ["application/json"]],
          },
          id: "preference-test",
          init_point: "https://www.mercadopago.com.br/checkout/test",
        };
      },
    });

    const checkout = await request(providerApp)
      .post("/checkout/mercado-pago")
      .send({
        items: [
          {
            productId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
            quantity: 1,
          },
        ],
        customer: {
          name: "Cliente Retorno",
          email: "retorno@example.test",
          phone: "11999999999",
        },
        shippingAcknowledged: true,
      })
      .expect(201);

    expect(successBackUrl).toBe(
      `https://api.store.test/checkout/return?order=${checkout.body.orderReference}`,
    );
    await request(providerApp)
      .get(`/checkout/return?order=${checkout.body.orderReference}`)
      .expect(302)
      .expect(
        "location",
        `http://localhost:5173/checkout/sandbox?order=${checkout.body.orderReference}`,
      );
  });

  it("returns an actionable gateway error when preference creation fails", async () => {
    const providerApp = createApp(
      {
        ...env,
        MERCADO_PAGO_ACCESS_TOKEN: "APP_USR-valid-test-token",
        PUBLIC_API_URL: "https://api.store.test",
      },
      {
        mercadoPagoPreferenceCreate: async () => {
          throw { status: 400, error: "invalid_auto_return" };
        },
      },
    );

    const response = await request(providerApp)
      .post("/checkout/mercado-pago")
      .send({
        items: [
          {
            productId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
            quantity: 1,
          },
        ],
        customer: {
          name: "Cliente Erro",
          email: "erro@example.test",
          phone: "11999999999",
        },
        shippingAcknowledged: true,
      })
      .expect(502);

    expect(response.body.error.code).toBe("MERCADO_PAGO_PREFERENCE_FAILED");
    expect(response.body.error.message).toContain("Mercado Pago");
  });

  it("uses a verified and idempotent webhook as the payment source of truth", async () => {
    let paymentReference = "";
    const webhookApp = createApp(env, {
      mercadoPagoPaymentLookup: async (paymentId) => ({
        id: paymentId,
        externalReference: paymentReference,
        status: "approved",
        transactionAmount: 289,
        currency: "BRL",
      }),
    });
    const checkout = await request(webhookApp)
      .post("/checkout/mercado-pago")
      .send({
        items: [
          {
            productId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
            quantity: 1,
          },
        ],
        customer: {
          name: "Cliente Teste",
          email: "cliente@example.test",
          phone: "11999999999",
        },
        shippingAcknowledged: true,
      })
      .expect(201);
    paymentReference = checkout.body.orderReference;

    await request(webhookApp)
      .get(`/checkout/orders/${paymentReference}`)
      .expect(401);
    const pending = await request(webhookApp)
      .get(`/checkout/orders/${paymentReference}`)
      .set("Authorization", `Bearer ${checkout.body.checkoutAccessToken}`)
      .expect(200);
    expect(pending.body.paymentStatus).toBe("pending");
    expect(pending.body.canContinueOnWhatsapp).toBe(false);
    expect(pending.body.shippingAmountInCents).toBeNull();
    await request(webhookApp)
      .post(`/checkout/orders/${paymentReference}/whatsapp-open`)
      .set("Authorization", `Bearer ${checkout.body.checkoutAccessToken}`)
      .expect(409);

    const dataId = "payment-123";
    const requestId = "request-123";
    const timestamp = "1700000000";
    const signature = createHmac("sha256", env.MERCADO_PAGO_WEBHOOK_SECRET)
      .update(`id:${dataId};request-id:${requestId};ts:${timestamp};`)
      .digest("hex");
    const payload = {
      id: "notification-123",
      type: "payment",
      action: "payment.updated",
      data: { id: dataId },
    };

    const processed = await request(webhookApp)
      .post(`/webhooks/mercado-pago?data.id=${dataId}`)
      .set("x-request-id", requestId)
      .set("x-signature", `ts=${timestamp},v1=${signature}`)
      .send(payload)
      .expect(200);
    expect(processed.body.result).toBe("processed");

    const duplicate = await request(webhookApp)
      .post(`/webhooks/mercado-pago?data.id=${dataId}`)
      .set("x-request-id", requestId)
      .set("x-signature", `ts=${timestamp},v1=${signature}`)
      .send(payload)
      .expect(200);
    expect(duplicate.body.result).toBe("duplicate");

    const approved = await request(webhookApp)
      .get(`/checkout/orders/${paymentReference}`)
      .set("Authorization", `Bearer ${checkout.body.checkoutAccessToken}`)
      .expect(200);
    expect(approved.body).toMatchObject({
      paymentStatus: "approved",
      shippingStatus: "awaiting_contact",
      canContinueOnWhatsapp: true,
      shippingAmountInCents: null,
    });
    expect(approved.body.whatsappUrl).toContain("https://wa.me/");
    const continuationMessage =
      new URL(approved.body.whatsappUrl).searchParams.get("text") ?? "";
    expect(continuationMessage).toContain(paymentReference);
    expect(continuationMessage).toContain("Kit Ritual Equilibrio");
    expect(continuationMessage).toContain("Frete: a combinar pelo WhatsApp.");
    await request(webhookApp)
      .post(`/checkout/orders/${paymentReference}/whatsapp-open`)
      .set("Authorization", `Bearer ${checkout.body.checkoutAccessToken}`)
      .expect(204);
    await request(webhookApp)
      .post(`/checkout/orders/${paymentReference}/whatsapp-open`)
      .set("Authorization", `Bearer ${checkout.body.checkoutAccessToken}`)
      .expect(204);

    const adminLogin = await request(webhookApp)
      .post("/admin/auth/login")
      .send({ email: adminEmail, password: adminPassword })
      .expect(200);
    const adminSession = {
      Cookie:
        String(adminLogin.headers["set-cookie"]?.[0] ?? "").split(";")[0] ?? "",
      "x-csrf-token": adminLogin.body.csrfToken,
    };
    const arranged = await request(webhookApp)
      .patch(`/admin/orders/${paymentReference}`)
      .set(adminSession)
      .send({
        shippingStatus: "arranged",
        contactStatus: "contact_started",
        shippingAmountInCents: 2500,
        shippingNotes: "Entrega combinada em atendimento.",
        deliveryMethod: "delivery",
        deliveryAddress: "Endereco informado diretamente pelo cliente.",
        pickupInstructions: null,
      })
      .expect(200);
    expect(arranged.body).toMatchObject({
      paymentStatus: "approved",
      shippingStatus: "arranged",
      contactStatus: "contact_started",
      shippingAmountInCents: 2500,
    });
  });

  it("rejects an invalid Mercado Pago webhook signature", async () => {
    const response = await request(app)
      .post("/webhooks/mercado-pago?data.id=payment-invalid")
      .set("x-request-id", "request-invalid")
      .set("x-signature", `ts=1700000000,v1=${"0".repeat(64)}`)
      .send({
        id: "notification-invalid",
        type: "payment",
        action: "payment.updated",
        data: { id: "payment-invalid" },
      })
      .expect(401);
    expect(response.body.error.code).toBe("INVALID_WEBHOOK_SIGNATURE");
  });

  it("does not approve an order when Mercado Pago reports another amount", async () => {
    let reference = "";
    const mismatchApp = createApp(env, {
      mercadoPagoPaymentLookup: async (paymentId) => ({
        id: paymentId,
        externalReference: reference,
        status: "approved",
        transactionAmount: 1,
        currency: "BRL",
      }),
    });
    const checkout = await request(mismatchApp)
      .post("/checkout/mercado-pago")
      .send({
        items: [
          {
            productId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
            quantity: 1,
          },
        ],
        customer: {
          name: "Cliente Divergente",
          email: "divergente@example.test",
          phone: "11999999999",
        },
        shippingAcknowledged: true,
      })
      .expect(201);
    reference = checkout.body.orderReference;
    const dataId = "payment-mismatch";
    const requestId = "request-mismatch";
    const timestamp = "1700000001";
    const signature = createHmac("sha256", env.MERCADO_PAGO_WEBHOOK_SECRET)
      .update(`id:${dataId};request-id:${requestId};ts:${timestamp};`)
      .digest("hex");
    const webhook = await request(mismatchApp)
      .post(`/webhooks/mercado-pago?data.id=${dataId}`)
      .set("x-request-id", requestId)
      .set("x-signature", `ts=${timestamp},v1=${signature}`)
      .send({
        id: "notification-mismatch",
        type: "payment",
        action: "payment.updated",
        data: { id: dataId },
      })
      .expect(200);
    expect(webhook.body.result).toBe("ignored");

    const status = await request(mismatchApp)
      .get(`/checkout/orders/${reference}`)
      .set("Authorization", `Bearer ${checkout.body.checkoutAccessToken}`)
      .expect(200);
    expect(status.body.paymentStatus).toBe("pending");
    expect(status.body.canContinueOnWhatsapp).toBe(false);

    const adminLogin = await request(mismatchApp)
      .post("/admin/auth/login")
      .send({ email: adminEmail, password: adminPassword })
      .expect(200);
    await request(mismatchApp)
      .patch(`/admin/orders/${reference}`)
      .set({
        Cookie:
          String(adminLogin.headers["set-cookie"]?.[0] ?? "").split(";")[0] ??
          "",
        "x-csrf-token": adminLogin.body.csrfToken,
      })
      .send({
        shippingStatus: "arranged",
        contactStatus: "contact_started",
        shippingAmountInCents: null,
        shippingNotes: null,
        deliveryMethod: "delivery",
        deliveryAddress:
          "Endereco ainda nao pode liberar pedido sem pagamento.",
        pickupInstructions: null,
      })
      .expect(409);
  });

  it("requires admin authentication for admin metrics", async () => {
    const response = await request(app).get("/admin/overview").expect(401);

    expect(response.body.error.code).toBe("AUTHENTICATION_REQUIRED");
  });

  it("authenticates the admin with a secure cookie and exposes the active session", async () => {
    const login = await request(app)
      .post("/admin/auth/login")
      .send({ email: adminEmail, password: adminPassword })
      .expect(200);
    const cookie = String(login.headers["set-cookie"]?.[0] ?? "");
    expect(cookie).toContain("catalog_admin_bespoke-test=");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(login.body).toMatchObject({
      admin: { email: adminEmail, role: "owner" },
    });
    expect(login.body.csrfToken).toBeTypeOf("string");

    const current = await request(app)
      .get("/admin/auth/session")
      .set("Cookie", cookie.split(";")[0] ?? "")
      .expect(200);
    expect(current.body.admin.email).toBe(adminEmail);
  });

  it("exposes instance runtime only to authenticated admin users", async () => {
    await request(app).get("/admin/runtime").expect(401);

    const runtime = await request(app)
      .get("/admin/runtime")
      .set(session)
      .expect(200);
    expect(runtime.headers["cache-control"]).toContain("no-store");
    expect(runtime.body).toEqual({
      instanceId: env.INSTANCE_ID,
      publicApiUrl: env.PUBLIC_API_URL,
      publicWebUrl: env.PUBLIC_WEB_URL,
    });
  });

  it("rebases managed storefront uploads for the administrative preview", async () => {
    const publicOrigin = "https://preview.example.ngrok-free.dev";
    const previewApp = createApp({
      ...env,
      INSTANCE_ID: "admin-preview-media",
      PUBLIC_API_URL: `${publicOrigin}/api`,
      PUBLIC_WEB_URL: publicOrigin,
    });
    const login = await request(previewApp)
      .post("/admin/auth/login")
      .send({ email: adminEmail, password: adminPassword })
      .expect(200);
    const previewSession = {
      Cookie:
        String(login.headers["set-cookie"]?.[0] ?? "").split(";")[0] ?? "",
      "x-csrf-token": login.body.csrfToken,
    };
    const current = await request(previewApp)
      .get("/storefront/settings")
      .expect(200);
    const logoId = "123e4567-e89b-42d3-a456-426614174000";
    const heroId = "223e4567-e89b-42d3-a456-426614174000";
    const updated = await request(previewApp)
      .patch("/admin/storefront")
      .set(previewSession)
      .send({
        ...current.body,
        logoUrl: `http://localhost:3333/uploads/images/${logoId}.png`,
        heroImageUrl: `http://localhost:3333/uploads/images/${heroId}.jpg?motion=product-drop`,
      })
      .expect(200);

    expect(updated.body.logoUrl).toBe(
      `${publicOrigin}/uploads/images/${logoId}.png?variant=logo`,
    );
    expect(updated.body.heroImageUrl).toBe(
      `${publicOrigin}/uploads/images/${heroId}.jpg?motion=product-drop`,
    );

    const settings = await request(previewApp)
      .get("/admin/storefront")
      .set(previewSession)
      .expect(200);
    expect(settings.headers["cache-control"]).toContain("no-store");
    expect(settings.body.logoUrl).toBe(updated.body.logoUrl);
    expect(settings.body.heroImageUrl).toBe(updated.body.heroImageUrl);
    expect(JSON.stringify(settings.body)).not.toContain("localhost:3333");
  });

  it("isolates administrative sessions by white-label instance", async () => {
    const firstApp = createApp({ ...env, INSTANCE_ID: "store-first" });
    const secondApp = createApp({ ...env, INSTANCE_ID: "store-second" });
    const firstLogin = await request(firstApp)
      .post("/admin/auth/login")
      .send({ email: adminEmail, password: adminPassword })
      .expect(200);
    const firstCookie =
      String(firstLogin.headers["set-cookie"]?.[0] ?? "").split(";")[0] ?? "";

    expect(firstCookie).toContain("catalog_admin_store-first=");
    await request(secondApp)
      .get("/admin/auth/session")
      .set("Cookie", firstCookie)
      .expect(401);

    const secondLogin = await request(secondApp)
      .post("/admin/auth/login")
      .send({ email: adminEmail, password: adminPassword })
      .expect(200);
    expect(String(secondLogin.headers["set-cookie"]?.[0] ?? "")).toContain(
      "catalog_admin_store-second=",
    );
  });

  it("rejects invalid credentials without exposing which field failed", async () => {
    const wrongPassword = await request(app)
      .post("/admin/auth/login")
      .send({ email: adminEmail, password: "wrong-test-password" })
      .expect(401);
    const wrongEmail = await request(app)
      .post("/admin/auth/login")
      .send({ email: "another@example.test", password: adminPassword })
      .expect(401);
    expect(wrongPassword.body.error.code).toBe("INVALID_CREDENTIALS");
    expect(wrongEmail.body.error.message).toBe(
      wrongPassword.body.error.message,
    );
  });

  it("requires CSRF protection and invalidates the session on logout", async () => {
    await request(app)
      .post("/admin/auth/logout")
      .set("Cookie", adminCookie)
      .expect(403);

    const login = await request(app)
      .post("/admin/auth/login")
      .send({ email: adminEmail, password: adminPassword })
      .expect(200);
    const cookie =
      String(login.headers["set-cookie"]?.[0] ?? "").split(";")[0] ?? "";
    await request(app)
      .post("/admin/auth/logout")
      .set("Cookie", cookie)
      .set("x-csrf-token", login.body.csrfToken)
      .expect(204);
    await request(app)
      .get("/admin/auth/session")
      .set("Cookie", cookie)
      .expect(401);
  });

  it("rate limits repeated login failures", async () => {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      await request(app)
        .post("/admin/auth/login")
        .send({
          email: "limited@example.test",
          password: "wrong-test-password",
        })
        .expect(401);
    }
    const limited = await request(app)
      .post("/admin/auth/login")
      .send({
        email: "limited@example.test",
        password: "wrong-test-password",
      })
      .expect(429);
    expect(limited.body.error.code).toBe("LOGIN_RATE_LIMITED");
    expect(Number(limited.headers["retry-after"])).toBeGreaterThan(0);
  }, 15_000);

  it("requires admin authentication for image uploads", async () => {
    const response = await request(app)
      .post("/admin/uploads/images")
      .set("content-type", "image/png")
      .send(png)
      .expect(401);
    expect(response.body.error.code).toBe("AUTHENTICATION_REQUIRED");
  });

  it("protects storefront changes and publishes validated appearance settings", async () => {
    const current = await request(app).get("/storefront/settings").expect(200);
    const payload = {
      ...current.body,
      legalName: "Bespoke Comercio Digital Ltda",
      logoUrl: "http://localhost:3333/uploads/images/logo.webp",
      logoOnDarkUrl: "https://example.com/logo-clara.webp",
      faviconUrl: "https://example.com/favicon.webp",
      socialImageUrl: "https://example.com/social.webp",
      contactEmail: "contato@example.test",
      defaultMetaTitle: "Bespoke | Curadoria online",
      defaultMetaDescription:
        "Conheca a curadoria Bespoke e escolha entre pagamento online e compra assistida.",
      whatsappPurchaseMessage:
        "Nossa equipe continuara o atendimento e confirmara os proximos passos.",
      postPaymentWhatsappMessage:
        "Nossa equipe ajudara a combinar entrega ou retirada com seguranca.",
      manifestoLineOne: "PRIMEIRA LINHA PUBLICADA PELO PAINEL ADMINISTRATIVO",
      manifestoLineTwo: "SEGUNDA LINHA PUBLICADA PARA A HOME ATUAL",
      manifestoItems: current.body.manifestoItems.map(
        (item: { content: string }, index: number) => ({
          ...item,
          content:
            index === 0
              ? "PRIMEIRA LINHA PUBLICADA PELO PAINEL ADMINISTRATIVO"
              : "SEGUNDA LINHA PUBLICADA PARA A HOME ATUAL",
        }),
      ),
      homeTransitionPreset: "depth",
      homeTransitionOverlap: 72,
      manifestoDividerMobileEnabled: true,
      homeMotionPreset: "cascade",
      homeMotionByBlock: {
        manifesto: "scroll",
        navigation: "cascade",
        categories: "cascade",
        featuredHeading: "soft",
        productCards: "structured",
        commerce: "soft",
        reviews: "soft",
        footer: "subtle",
      },
      homeMotionIntensity: "expressive",
      homeTextStyles: {
        ...current.body.homeTextStyles,
        heroTitle: {
          color: "#203c34",
          fontSize: 60,
          spacingAfter: 8,
          fontFamily: "classic",
        },
        footerSlogan: {
          color: "",
          fontSize: 15,
          spacingAfter: 20,
          fontFamily: "modern",
        },
      },
      homeSurfaceColor: "#faf7f1",
      storefrontFont: "modern",
      adminFont: "classic",
      heroEyebrowFontSize: 14,
      heroTitleFontSize: 52,
      footerShowBrandName: false,
      footerHeading: "Contato e redes",
      footerLinks: [
        {
          id: "00000000-0000-4000-8000-000000000301",
          label: "",
          href: "https://instagram.com/bespoke",
          iconUrl: "http://localhost:3333/uploads/images/instagram.webp",
        },
        {
          id: "00000000-0000-4000-8000-000000000302",
          label: "Telefone",
          href: "tel:+5511999999999",
          iconUrl: "",
        },
      ],
    };

    await request(app).patch("/admin/storefront").send(payload).expect(401);

    const updated = await request(app)
      .patch("/admin/storefront")
      .set(session)
      .send(payload)
      .expect(200);
    expect(updated.body).toMatchObject({
      storefrontFont: "modern",
      adminFont: "classic",
      heroEyebrowFontSize: 14,
      heroTitleFontSize: 52,
      footerShowBrandName: false,
      footerHeading: "Contato e redes",
      legalName: payload.legalName,
      contactEmail: payload.contactEmail,
      defaultMetaTitle: payload.defaultMetaTitle,
      manifestoLineOne: payload.manifestoLineOne,
      manifestoLineTwo: payload.manifestoLineTwo,
      homeTransitionPreset: "depth",
      homeTransitionOverlap: 72,
      manifestoDividerMobileEnabled: true,
      homeMotionPreset: "cascade",
      homeMotionByBlock: payload.homeMotionByBlock,
      homeMotionIntensity: "expressive",
      homeTextStyles: payload.homeTextStyles,
      homeSurfaceColor: "#faf7f1",
    });

    const published = await request(app)
      .get("/storefront/settings")
      .expect(200);
    expect(published.body.footerLinks).toEqual(payload.footerLinks);
    expect(published.body.footerShowBrandName).toBe(false);
    expect(published.body.manifestoLineOne).toBe(payload.manifestoLineOne);
    expect(published.body.manifestoItems).toEqual(payload.manifestoItems);
    expect(published.body.manifestoDividerMobileEnabled).toBe(true);
    expect(published.body.homeMotionByBlock).toEqual(payload.homeMotionByBlock);
    expect(published.body.homeTextStyles).toEqual(payload.homeTextStyles);
    expect(published.body.whatsappPurchaseMessage).toBe(
      payload.whatsappPurchaseMessage,
    );
    expect(published.headers["cache-control"]).toContain("no-store");

    const unsafe = await request(app)
      .patch("/admin/storefront")
      .set(session)
      .send({
        ...payload,
        footerLinks: [
          { ...payload.footerLinks[0], href: "javascript:alert(1)" },
        ],
      })
      .expect(400);
    expect(unsafe.body.error.code).toBe("INVALID_BODY");

    const invalidColor = await request(app)
      .patch("/admin/storefront")
      .set(session)
      .send({ ...payload, homeSurfaceColor: "champagne" })
      .expect(400);
    expect(invalidColor.body.error.code).toBe("INVALID_BODY");
  });

  it("builds the assisted purchase message on the server", async () => {
    const response = await request(app)
      .post("/whatsapp/requests")
      .send({
        items: [
          {
            productId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
            quantity: 2,
          },
        ],
      })
      .expect(201);
    const message = new URL(response.body.url).searchParams.get("text") ?? "";

    expect(response.body.requestReference).toMatch(/^WSP-/);
    expect(message).not.toContain(response.body.requestReference);
    expect(message).not.toContain("Referencia:");
    expect(message).toContain("Kit Ritual Equilibrio");
    expect(message).toContain("x2");
    expect(message).toContain("Frete: a combinar pelo WhatsApp.");
    expect(message).toContain(
      "Nossa equipe continuara o atendimento e confirmara os proximos passos.",
    );
    expect(message).not.toContain("{{");
  });

  it("uploads and publicly serves a valid image", async () => {
    const uploaded = await request(app)
      .post("/admin/uploads/images")
      .set(session)
      .set("content-type", "image/png")
      .send(png)
      .expect(201);

    expect(uploaded.body).toMatchObject({
      width: 1,
      height: 1,
      contentType: "image/png",
    });
    expect(uploaded.body.sizeBytes).toBeGreaterThan(0);
    expect(uploaded.body.url).toMatch(
      /^http:\/\/localhost:3333\/uploads\/images\/[0-9a-f-]+\.png$/,
    );

    const publicImage = await request(app)
      .get(new URL(uploaded.body.url).pathname)
      .expect(200)
      .expect("content-type", /image\/png/);
    expect(publicImage.headers["cross-origin-resource-policy"]).toBe(
      "cross-origin",
    );
    expect(publicImage.headers["cache-control"]).toContain("immutable");
    expect(publicImage.body).not.toEqual(png);

    const removed = await request(app)
      .delete("/admin/uploads/images")
      .set(session)
      .send({ url: uploaded.body.url })
      .expect(200);
    expect(removed.body.deleted).toBe(true);
    await request(app).get(new URL(uploaded.body.url).pathname).expect(404);
  });

  it("rejects mismatched, invalid and oversized image payloads", async () => {
    const mismatch = await request(app)
      .post("/admin/uploads/images")
      .set(session)
      .set("content-type", "image/jpeg")
      .send(png)
      .expect(415);
    expect(mismatch.body.error.code).toBe("IMAGE_TYPE_MISMATCH");

    const invalid = await request(app)
      .post("/admin/uploads/images")
      .set(session)
      .set("content-type", "image/png")
      .send(Buffer.from("not-an-image"))
      .expect(415);
    expect(invalid.body.error.code).toBe("IMAGE_TYPE_UNSUPPORTED");

    const oversized = await request(app)
      .post("/admin/uploads/images")
      .set(session)
      .set("content-type", "image/png")
      .send(Buffer.alloc(maxImageUploadBytes + 1))
      .expect(413);
    expect(oversized.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("protects, creates and reuses custom product categories", async () => {
    await request(app)
      .post("/admin/categories")
      .send({ name: "Presentes personalizados" })
      .expect(401);

    const created = await request(app)
      .post("/admin/categories")
      .set(session)
      .send({ name: "Presentes personalizados" })
      .expect(201);
    expect(created.body).toMatchObject({
      name: "Presentes personalizados",
      slug: "presentes-personalizados",
      description: null,
    });

    const repeated = await request(app)
      .post("/admin/categories")
      .set(session)
      .send({ name: "PRESENTES PERSONALIZADOS" })
      .expect(201);
    expect(repeated.body.id).toBe(created.body.id);

    const categories = await request(app)
      .get("/catalog/categories")
      .expect(200);
    expect(
      categories.body.items.some(
        (category: { id: string }) => category.id === created.body.id,
      ),
    ).toBe(true);
  });

  it("publishes, edits, hides and deletes products without removing referenced images", async () => {
    const initialOverview = await request(app)
      .get("/admin/overview")
      .set(session)
      .expect(200);
    const initialMetrics = initialOverview.body.metrics as {
      activeProducts: number;
      activeStockUnits: number;
      inventoryValueInCents: number;
    };
    const category = await request(app)
      .post("/admin/categories")
      .set(session)
      .send({ name: "Edicoes especiais" })
      .expect(201);
    const updatedCategory = await request(app)
      .post("/admin/categories")
      .set(session)
      .send({ name: "Categoria atualizada" })
      .expect(201);
    const uploaded = await request(app)
      .post("/admin/uploads/images")
      .set(session)
      .set("content-type", "image/png")
      .send(png)
      .expect(201);
    const payload = {
      name: "Produto Teste Admin",
      subtitle: "Produto temporario",
      description:
        "Produto criado em teste automatizado para validar o painel administrativo.",
      categorySlug: category.body.slug,
      priceInCents: 12900,
      compareAtPriceInCents: null,
      stock: 5,
      lowStockThreshold: 2,
      lowStockWarningEnabled: false,
      imageUrl: uploaded.body.url,
      imageAlt: "Produto teste admin",
      imageWidth: uploaded.body.width,
      imageHeight: uploaded.body.height,
      imageContentType: uploaded.body.contentType,
      imageSizeBytes: uploaded.body.sizeBytes,
      isActive: true,
      isFeatured: true,
      sortOrder: 7,
    };

    const created = await request(app)
      .post("/admin/products")
      .set(session)
      .send(payload)
      .expect(201);

    expect(created.body).toMatchObject({
      slug: "produto-teste-admin",
      isFeatured: true,
      lowStockWarningEnabled: false,
      sortOrder: 7,
      priceInCents: 12900,
      category: {
        name: "Edicoes especiais",
        slug: category.body.slug,
      },
    });
    expect(created.body.sku).toMatch(/^PRD-PRODUTOTESTE/);
    expect(created.body.images[0]).toMatchObject({
      width: uploaded.body.width,
      height: uploaded.body.height,
      contentType: "image/png",
      sizeBytes: uploaded.body.sizeBytes,
    });
    const overviewAfterCreate = await request(app)
      .get("/admin/overview")
      .set(session)
      .expect(200);
    expect(overviewAfterCreate.body.metrics).toMatchObject({
      activeProducts: initialMetrics.activeProducts + 1,
      activeStockUnits: initialMetrics.activeStockUnits + payload.stock,
      inventoryValueInCents:
        initialMetrics.inventoryValueInCents +
        payload.priceInCents * payload.stock,
    });
    const featured = await request(app)
      .get("/catalog/products?limit=24&featured=true&sort=featured")
      .expect(200);
    expect(
      featured.body.items.some(
        (product: { id: string }) => product.id === created.body.id,
      ),
    ).toBe(true);

    const protectedImage = await request(app)
      .delete("/admin/uploads/images")
      .set(session)
      .send({ url: uploaded.body.url })
      .expect(200);
    expect(protectedImage.body.deleted).toBe(false);

    const updated = await request(app)
      .put(`/admin/products/${created.body.id}`)
      .set(session)
      .send({
        ...payload,
        slug: created.body.slug,
        name: "Produto Teste Atualizado",
        categorySlug: updatedCategory.body.slug,
        priceInCents: 13900,
        imageUrl: "https://example.com/produto-atualizado.webp",
        imageWidth: 900,
        imageHeight: 1200,
        imageContentType: "image/webp",
        imageSizeBytes: 456_789,
        isFeatured: false,
        lowStockWarningEnabled: true,
        sortOrder: 90,
      })
      .expect(200);
    expect(updated.body).toMatchObject({
      slug: created.body.slug,
      sku: created.body.sku,
      name: "Produto Teste Atualizado",
      priceInCents: 13900,
      category: {
        name: "Categoria atualizada",
        slug: updatedCategory.body.slug,
      },
      isFeatured: false,
      lowStockWarningEnabled: true,
      sortOrder: 90,
    });
    expect(updated.body.images[0]).toMatchObject({
      width: 900,
      height: 1200,
      contentType: "image/webp",
      sizeBytes: 456_789,
    });
    const overviewAfterUpdate = await request(app)
      .get("/admin/overview")
      .set(session)
      .expect(200);
    expect(overviewAfterUpdate.body.metrics).toMatchObject({
      activeProducts: initialMetrics.activeProducts + 1,
      activeStockUnits: initialMetrics.activeStockUnits + payload.stock,
      inventoryValueInCents:
        initialMetrics.inventoryValueInCents + 13_900 * payload.stock,
    });
    await request(app).get(new URL(uploaded.body.url).pathname).expect(404);

    const publicProduct = await request(app)
      .get(`/catalog/products/${updated.body.slug}`)
      .expect(200);
    expect(publicProduct.body).toMatchObject({
      name: "Produto Teste Atualizado",
      priceInCents: 13900,
      isFeatured: false,
      lowStockWarningEnabled: true,
    });
    const featuredAfterUpdate = await request(app)
      .get("/catalog/products?limit=24&featured=true")
      .expect(200);
    expect(
      featuredAfterUpdate.body.items.some(
        (product: { id: string }) => product.id === created.body.id,
      ),
    ).toBe(false);

    await request(app)
      .delete(`/admin/products/${created.body.id}`)
      .set(session)
      .expect(204);

    const products = await request(app)
      .get("/admin/products")
      .set(session)
      .expect(200);
    expect(
      products.body.items.some(
        (product: { id: string }) => product.id === created.body.id,
      ),
    ).toBe(false);
    const overviewAfterDelete = await request(app)
      .get("/admin/overview")
      .set(session)
      .expect(200);
    expect(overviewAfterDelete.body.metrics).toMatchObject(initialMetrics);
    await request(app)
      .get(`/catalog/products/${updated.body.slug}`)
      .expect(404);
  });
});
