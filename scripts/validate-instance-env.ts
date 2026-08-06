import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "../apps/api/src/config/env.js";
import { loadApiEnvironment, parseInstanceCliOptions } from "./instance-env.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
loadApiEnvironment(root, parseInstanceCliOptions());

const env = loadEnv();
if (env.NODE_ENV === "production") {
  if (!env.UPLOADS_DIR || !isAbsolute(env.UPLOADS_DIR)) {
    throw new Error(
      "UPLOADS_DIR must be an absolute persistent path in production.",
    );
  }
  for (const value of [env.PUBLIC_API_URL, env.PUBLIC_WEB_URL]) {
    if (!value.startsWith("https://")) {
      throw new Error("Public production URLs must use HTTPS.");
    }
  }
}

process.stdout.write(`Environment is valid for instance ${env.INSTANCE_ID}.\n`);
