import "dotenv/config";
import { createApp } from "./app.js";
import { loadEnv } from "./config/env.js";

const env = loadEnv();
const app = createApp(env);

app.listen(env.PORT, () => {
  console.log(`Bespoke API listening on ${env.PORT}`);
});
