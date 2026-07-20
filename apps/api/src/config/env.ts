import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3333),
    DATABASE_URL: z.string().url(),
    SESSION_SECRET: z.string().min(32),
    CORS_ORIGINS: z.string().min(1),
    MERCADO_PAGO_ACCESS_TOKEN: z.string().min(8),
    MERCADO_PAGO_WEBHOOK_SECRET: z.string().min(8),
    WHATSAPP_STORE_PHONE: z.string().regex(/^\d{10,15}$/),
    CORREIOS_ACCESS_TOKEN: z.string().min(8).optional(),
    CORREIOS_ORIGIN_POSTAL_CODE: z.string().regex(/^\d{5}-?\d{3}$/).optional(),
    CORREIOS_SERVICE_CODE: z.string().min(2).max(20).optional(),
    CORREIOS_PRICE_API_URL: z.string().url().optional(),
    CORREIOS_OBJECT_WEIGHT_GRAMS: z.coerce.number().int().positive().optional(),
    CORREIOS_PACKAGE_LENGTH_CM: z.coerce.number().int().positive().optional(),
    CORREIOS_PACKAGE_WIDTH_CM: z.coerce.number().int().positive().optional(),
    CORREIOS_PACKAGE_HEIGHT_CM: z.coerce.number().int().positive().optional(),
    PUBLIC_API_URL: z.string().url(),
    PUBLIC_WEB_URL: z.string().url()
  });

export type AppEnv = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  return envSchema.parse(source);
}

export function corsOrigins(env: AppEnv) {
  return env.CORS_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean);
}
