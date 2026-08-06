import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "dotenv";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const instancesRoot = resolve(root, "instances");

if (!existsSync(instancesRoot)) {
  process.stdout.write("No instances directory found.\n");
  process.exit(0);
}

const rows = readdirSync(instancesRoot)
  .filter((name) => statSync(resolve(instancesRoot, name)).isDirectory())
  .sort()
  .map((name) => {
    const envPath = resolve(instancesRoot, name, ".env");
    const examplePath = resolve(instancesRoot, name, ".env.example");
    const sourcePath = existsSync(envPath) ? envPath : examplePath;
    const values = existsSync(sourcePath)
      ? parse(readFileSync(sourcePath, "utf8"))
      : {};
    return {
      name,
      env: existsSync(envPath) ? "yes" : "missing",
      port: values.PORT ?? "",
      publicUrl: values.PUBLIC_WEB_URL ?? "",
      adminOrigin: adminOrigin(values.CORS_ORIGINS ?? ""),
      apiUrl: values.PUBLIC_API_URL ?? "",
    };
  });

if (!rows.length) {
  process.stdout.write("No instances configured.\n");
  process.exit(0);
}

for (const row of rows) {
  process.stdout.write(
    [
      row.name.padEnd(18),
      `env=${row.env}`.padEnd(12),
      `port=${row.port}`.padEnd(12),
      `public=${row.publicUrl}`,
      `admin=${row.adminOrigin}`,
      `api=${row.apiUrl}`,
    ].join("  ") + "\n",
  );
}

function adminOrigin(corsOrigins: string) {
  return (
    corsOrigins
      .split(",")
      .map((origin) => origin.trim())
      .find((origin) => /:\/\/admin\./.test(origin)) ?? ""
  );
}
