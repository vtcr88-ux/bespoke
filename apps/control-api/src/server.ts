import { createServer } from "node:http";
import { createControlApp } from "./app.js";
import { readControlEnv } from "./config/env.js";

const env = readControlEnv();
const app = await createControlApp(env);
const server = createServer(app);

server.listen(env.CONTROL_PORT, "127.0.0.1", () => {
  process.stdout.write(`Bespoke Control API listening on http://127.0.0.1:${env.CONTROL_PORT}\n`);
});

async function shutdown(signal: string) {
  process.stdout.write(`Received ${signal}; closing Control API.\n`);
  server.close(async () => {
    await app.locals.shutdown?.();
    process.exit(0);
  });
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
