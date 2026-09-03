import { isAbsolute, resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv();

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    CONTROL_PORT: z.coerce.number().int().min(1024).max(65535).default(3340),
    CONTROL_STORAGE: z.enum(["file", "mysql"]).default("file"),
    CONTROL_DATABASE_URL: z.string().url().optional(),
    CONTROL_DATA_FILE: z.string().min(1).default("../../storage/control-plane/instances.json"),
    CONTROL_INSTANCES_ROOT: z.string().min(1).default("../.."),
    CONTROL_SESSION_SECRET: z.string().min(32),
    CONTROL_CSRF_SECRET: z.string().min(32),
    CONTROL_ADMIN_EMAIL: z.string().email(),
    CONTROL_ADMIN_PASSWORD_HASH: z.string().min(32),
    CONTROL_SESSION_TTL_MINUTES: z.coerce.number().int().min(15).max(1440).default(480),
    CONTROL_CORS_ORIGINS: z.string().min(1).default("http://localhost:5175"),
    CONTROL_PUBLIC_URL: z.string().url().default("http://localhost:5175"),
    CONTROL_TRUSTED_HOSTS: z.string().min(1).default("localhost,127.0.0.1"),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  })
  .superRefine((value, context) => {
    if (value.CONTROL_STORAGE === "mysql" && !value.CONTROL_DATABASE_URL) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["CONTROL_DATABASE_URL"],
        message: "CONTROL_DATABASE_URL is required for MySQL storage.",
      });
    }
    if (value.NODE_ENV === "production") {
      if (value.CONTROL_STORAGE !== "mysql") {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["CONTROL_STORAGE"],
          message: "Production control plane requires MySQL storage.",
        });
      }
      if (!value.CONTROL_PUBLIC_URL.startsWith("https://")) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["CONTROL_PUBLIC_URL"],
          message: "Production control panel must use HTTPS.",
        });
      }
      if (!isAbsolute(value.CONTROL_INSTANCES_ROOT)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["CONTROL_INSTANCES_ROOT"],
          message: "Production instances root must be absolute.",
        });
      }
    }
  });

export type ControlEnv = z.infer<typeof schema>;

export function readControlEnv(source: NodeJS.ProcessEnv = process.env) {
  return schema.parse(source);
}

export function resolveControlPaths(env: ControlEnv, appRoot: string) {
  return {
    dataFile: isAbsolute(env.CONTROL_DATA_FILE)
      ? env.CONTROL_DATA_FILE
      : resolve(appRoot, env.CONTROL_DATA_FILE),
    instancesRoot: isAbsolute(env.CONTROL_INSTANCES_ROOT)
      ? env.CONTROL_INSTANCES_ROOT
      : resolve(appRoot, env.CONTROL_INSTANCES_ROOT),
  };
}

export function commaSeparated(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}
