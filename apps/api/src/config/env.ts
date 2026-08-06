import { z } from "zod";
import { isAdminPasswordHash } from "../modules/auth/admin-auth.service.js";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3333),
  DATABASE_URL: z.string().url(),
  COMMERCE_STORAGE: z.enum(["mysql", "file"]).default("mysql"),
  SESSION_SECRET: z.string().min(32),
  ADMIN_EMAIL: z.string().trim().email().max(254),
  ADMIN_PASSWORD_HASH: z
    .string()
    .refine(
      isAdminPasswordHash,
      "ADMIN_PASSWORD_HASH must be a valid scrypt hash",
    ),
  ADMIN_SESSION_TTL_MINUTES: z.coerce
    .number()
    .int()
    .min(15)
    .max(1440)
    .default(480),
  CORS_ORIGINS: z.string().min(1),
  TRUSTED_HOSTS: z.string().min(1).optional(),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  MERCADO_PAGO_ACCESS_TOKEN: z.string().min(8),
  MERCADO_PAGO_WEBHOOK_SECRET: z.string().min(8),
  WHATSAPP_STORE_PHONE: z.string().regex(/^\d{10,15}$/),
  INSTANCE_ID: z
    .string()
    .trim()
    .regex(/^[a-z0-9][a-z0-9-]{2,62}$/),
  CSRF_SECRET: z.string().min(32),
  PUBLIC_API_URL: z.string().url(),
  PUBLIC_WEB_URL: z.string().url(),
  UPLOADS_DIR: z.string().min(1).optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  const production = source.NODE_ENV === "production";
  const env = envSchema.parse({
    ...source,
    INSTANCE_ID:
      source.INSTANCE_ID ?? (production ? undefined : "bespoke-local"),
    CSRF_SECRET:
      source.CSRF_SECRET ?? (production ? undefined : source.SESSION_SECRET),
  });
  if (production && !env.TRUSTED_HOSTS) {
    throw new Error("TRUSTED_HOSTS is required in production.");
  }
  if (production) {
    if (env.COMMERCE_STORAGE !== "mysql") {
      throw new Error("Production requires COMMERCE_STORAGE=mysql.");
    }
    const protectedValues = [
      env.DATABASE_URL,
      env.SESSION_SECRET,
      env.CSRF_SECRET,
      env.ADMIN_EMAIL,
      env.MERCADO_PAGO_ACCESS_TOKEN,
      env.MERCADO_PAGO_WEBHOOK_SECRET,
      env.CORS_ORIGINS,
      env.TRUSTED_HOSTS,
      env.PUBLIC_API_URL,
      env.PUBLIC_WEB_URL,
    ];
    if (
      protectedValues.some((value) =>
        /replace(?:_me|_with)?|example\.invalid|lojadocliente/i.test(
          value ?? "",
        ),
      )
    ) {
      throw new Error(
        "Production environment still contains placeholder values.",
      );
    }
  }
  return env;
}

export function corsOrigins(env: AppEnv) {
  return env.CORS_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function trustedHosts(env: AppEnv) {
  return (env.TRUSTED_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}
