import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import type { AppEnv } from "../src/config/env.js";

const env: AppEnv = {
  NODE_ENV: "test",
  PORT: 3333,
  DATABASE_URL: "mysql://bespoke_app:replace_me@localhost:3306/bespoke",
  SESSION_SECRET: "test_session_secret_with_more_than_32_chars",
  CORS_ORIGINS: "http://localhost:5173,http://localhost:5174",
  MERCADO_PAGO_ACCESS_TOKEN: "TEST-replace_me",
  MERCADO_PAGO_WEBHOOK_SECRET: "replace_me",
  WHATSAPP_STORE_PHONE: "5511999999999",
  PUBLIC_API_URL: "http://localhost:3333",
  PUBLIC_WEB_URL: "http://localhost:5173"
};

describe("Bespoke API", () => {
  const app = createApp(env);

  it("lists catalog products with cursor pagination", async () => {
    const response = await request(app).get("/catalog/products?limit=2").expect(200);

    expect(response.body.items).toHaveLength(2);
    expect(response.body.nextCursor).toBeTypeOf("string");
  });

  it("rejects unknown cart fields", async () => {
    const response = await request(app)
      .post("/cart/price")
      .send({ items: [{ productId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1", quantity: 1, priceInCents: 1 }] })
      .expect(400);

    expect(response.body.error.code).toBe("INVALID_BODY");
  });

  it("requires admin authentication for admin metrics", async () => {
    const response = await request(app).get("/admin/overview").expect(401);

    expect(response.body.error.code).toBe("AUTHENTICATION_REQUIRED");
  });

  it("creates and deletes products from the admin catalog", async () => {
    const payload = {
      sku: "BSP-TST-999",
      name: "Produto Teste Admin",
      subtitle: "Produto temporario",
      description: "Produto criado em teste automatizado para validar o painel administrativo.",
      categorySlug: "rituais",
      priceInCents: 12900,
      compareAtPriceInCents: null,
      stock: 5,
      lowStockThreshold: 2,
      imageUrl: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1200&q=82",
      imageAlt: "Produto teste admin",
      isActive: true
    };

    const created = await request(app)
      .post("/admin/products")
      .set("x-bespoke-admin-session", "dev-admin-session")
      .send(payload)
      .expect(201);

    await request(app)
      .delete(`/admin/products/${created.body.id}`)
      .set("x-bespoke-admin-session", "dev-admin-session")
      .expect(204);

    const products = await request(app).get("/admin/products").set("x-bespoke-admin-session", "dev-admin-session").expect(200);
    expect(products.body.items.some((product: { id: string }) => product.id === created.body.id)).toBe(false);
  });
});
