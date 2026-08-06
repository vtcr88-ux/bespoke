import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseInstanceCliOptions,
  resolveInstanceEnvFile,
} from "./instance-env.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const options = parseInstanceCliOptions();
const envFile = resolveInstanceEnvFile(root, options);
if (!envFile) throw new Error("Use --instance, --env-file or ENV_FILE.");

const production = process.argv.includes("--production");
const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";
const child = spawn(
  npmExecutable,
  ["--workspace", "@bespoke/api", "run", production ? "start" : "dev"],
  {
    cwd: root,
    env: {
      ...process.env,
      ENV_FILE: envFile,
    },
    stdio: "inherit",
  },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exitCode = code ?? 1;
});
