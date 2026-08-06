import { existsSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { config } from "dotenv";
import { loadEnv } from "../src/config/env.js";

const envFile = process.env.ENV_FILE
  ? resolve(process.env.ENV_FILE)
  : resolve(process.cwd(), ".env.production");
if (existsSync(envFile)) config({ path: envFile });
config({ path: resolve(process.cwd(), ".env") });

const env = loadEnv();
if (env.NODE_ENV === "production") {
  if (!env.UPLOADS_DIR || !isAbsolute(env.UPLOADS_DIR)) {
    throw new Error("UPLOADS_DIR must be an absolute persistent path in production.");
  }
  for (const value of [env.PUBLIC_API_URL, env.PUBLIC_WEB_URL]) {
    if (!value.startsWith("https://")) {
      throw new Error("Public production URLs must use HTTPS.");
    }
  }
}
process.stdout.write(`Environment is valid for instance ${env.INSTANCE_ID}.\n`);
