import { describe, expect, it } from "vitest";
import { loadEnv } from "./env.js";

const passwordHash = [
  "scrypt",
  "1",
  "16384",
  "8",
  "1",
  Buffer.alloc(16, 1).toString("base64url"),
  Buffer.alloc(64, 2).toString("base64url"),
].join("$");

describe("production environment", () => {
  it("rejects deployment placeholders", () => {
    expect(() =>
      loadEnv({
        NODE_ENV: "production",
        PORT: "3333",
        INSTANCE_ID: "store-test",
        DATABASE_URL: "mysql://store_app:REPLACE_ME@127.0.0.1:3306/store_test",
        SESSION_SECRET: "a-secure-session-secret-with-32-characters",
        CSRF_SECRET: "a-different-csrf-secret-with-32-characters",
        ADMIN_EMAIL: "owner@store.test",
        ADMIN_PASSWORD_HASH: passwordHash,
        ADMIN_SESSION_TTL_MINUTES: "480",
        CORS_ORIGINS: "https://store.test,https://admin.store.test",
        TRUSTED_HOSTS: "store.test,admin.store.test,api.store.test",
        LOG_LEVEL: "silent",
        MERCADO_PAGO_ACCESS_TOKEN: "REPLACE_ME",
        MERCADO_PAGO_WEBHOOK_SECRET: "REPLACE_ME",
        WHATSAPP_STORE_PHONE: "5511999999999",
        PUBLIC_API_URL: "https://api.store.test",
        PUBLIC_WEB_URL: "https://store.test",
        UPLOADS_DIR: "/var/lib/catalog-platform/store-test/uploads",
      }),
    ).toThrow("placeholder values");
  });

  it("rejects file commerce storage in production", () => {
    expect(() =>
      loadEnv({
        NODE_ENV: "production",
        PORT: "3333",
        INSTANCE_ID: "store-test",
        DATABASE_URL:
          "mysql://store_app:secure-password@127.0.0.1:3306/store_test",
        COMMERCE_STORAGE: "file",
        SESSION_SECRET: "a-secure-session-secret-with-32-characters",
        CSRF_SECRET: "a-different-csrf-secret-with-32-characters",
        ADMIN_EMAIL: "owner@store.test",
        ADMIN_PASSWORD_HASH: passwordHash,
        ADMIN_SESSION_TTL_MINUTES: "480",
        CORS_ORIGINS: "https://store.test,https://admin.store.test",
        TRUSTED_HOSTS: "store.test,admin.store.test,api.store.test",
        LOG_LEVEL: "silent",
        MERCADO_PAGO_ACCESS_TOKEN: "TEST-production-token",
        MERCADO_PAGO_WEBHOOK_SECRET: "production-webhook-secret",
        WHATSAPP_STORE_PHONE: "5511999999999",
        PUBLIC_API_URL: "https://api.store.test",
        PUBLIC_WEB_URL: "https://store.test",
        UPLOADS_DIR: "/var/lib/catalog-platform/store-test/uploads",
      }),
    ).toThrow("COMMERCE_STORAGE=mysql");
  });
});
