import { resolve } from "node:path";
import { config } from "dotenv";
import { createApp } from "./app.js";
import { loadEnv } from "./config/env.js";

config(
  process.env.ENV_FILE
    ? { path: resolve(process.env.ENV_FILE) }
    : undefined,
);
const env = loadEnv();
const app = createApp(env);

const server = app.listen(env.PORT, "127.0.0.1", () => {
  console.log(`API ${env.INSTANCE_ID} listening on ${env.PORT}`);
});

server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `API port ${env.PORT} is already in use. Stop the previous API process before restarting it.`,
    );
  } else {
    console.error("API failed to start.");
  }
  process.exitCode = 1;
});

let shuttingDown = false;
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    if (shuttingDown) return;
    shuttingDown = true;
    server.close(async (error) => {
      if (error) {
        console.error("API shutdown failed.");
        process.exitCode = 1;
      }
      try {
        await app.locals.shutdown?.();
      } catch {
        console.error("Database shutdown failed.");
        process.exitCode = 1;
      }
    });
  });
}
