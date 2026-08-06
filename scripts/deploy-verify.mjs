import { existsSync } from "node:fs";
import { access, readFile, readdir } from "node:fs/promises";
import { extname, join } from "node:path";

const required = [
  "apps/web/dist/index.html",
  "apps/admin/dist/index.html",
  "apps/api/dist/server.js",
  "infra/nginx/public-site.conf.template",
  "infra/nginx/admin-site.conf.template",
  "infra/nginx/api.conf.template",
  "infra/systemd/catalog-api.service.template",
  ".env.production.example",
  "apps/api/.env.production.example",
  "apps/web/.env.production.example",
  "apps/admin/.env.production.example",
  "scripts/db-migrate.ts",
  "scripts/db-seed.ts",
  "scripts/backup-instance",
  "scripts/restore-instance",
  "docs/PRODUCTION_DEPLOYMENT.md",
  "docs/BACKUP_AND_RESTORE.md",
  "docs/UPDATE_AND_ROLLBACK.md",
  "docs/ORACLE_VPS_SETUP.md",
  "instances/bespoke/brand.seed.json",
  "instances/example/brand.seed.json",
];
for (const path of required) await access(path);

if (existsSync("apps/api/src/modules/shipping/shipping.service.ts")) {
  throw new Error("Obsolete automatic shipping service is still present.");
}

const productionApiEnv = await readFile(
  "apps/api/.env.production.example",
  "utf8",
);
if (productionApiEnv.includes("VITE_")) {
  throw new Error("Private API environment must not expose VITE variables.");
}

const publicEnvironmentVariables = new Map([
  [
    "apps/web/.env.production.example",
    new Set(["VITE_API_BASE_URL", "VITE_ENVIRONMENT"]),
  ],
  [
    "apps/admin/.env.production.example",
    new Set([
      "VITE_API_BASE_URL",
      "VITE_STOREFRONT_PREVIEW_URL",
      "VITE_ENVIRONMENT",
    ]),
  ],
]);

for (const [publicEnvPath, allowedVariables] of publicEnvironmentVariables) {
  const variables = (await readFile(publicEnvPath, "utf8"))
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.split("=", 1)[0]);
  if (variables.some((variable) => !allowedVariables.has(variable))) {
    throw new Error(`${publicEnvPath} contains a non-public variable.`);
  }
}

const systemd = await readFile(
  "infra/systemd/catalog-api.service.template",
  "utf8",
);
for (const directive of [
  "EnvironmentFile=",
  "ExecStart=/usr/bin/node apps/api/dist/server.js",
  "Restart=on-failure",
  "ReadWritePaths=/var/lib/catalog-platform/__INSTANCE_ID__/uploads",
]) {
  if (!systemd.includes(directive)) {
    throw new Error(`systemd template is missing '${directive}'.`);
  }
}

for (const templatePath of [
  "infra/nginx/public-site.conf.template",
  "infra/nginx/admin-site.conf.template",
  "infra/nginx/api.conf.template",
]) {
  const template = await readFile(templatePath, "utf8");
  if (!template.includes("__API_PORT__") || !template.includes("server_name")) {
    throw new Error(`${templatePath} is missing required placeholders.`);
  }
}

const forbiddenShippingPattern =
  /correios|destinationPostalCode|shippingQuote|shipping\/quote/i;
for (const sourceRoot of ["apps/api/src", "apps/web/src"]) {
  for (const sourcePath of await sourceFiles(sourceRoot)) {
    if (forbiddenShippingPattern.test(await readFile(sourcePath, "utf8"))) {
      throw new Error(`Obsolete automatic shipping reference in ${sourcePath}.`);
    }
  }
}

process.stdout.write(
  "Production artifacts, isolation templates and shipping removal verified.\n",
);

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await sourceFiles(path)));
    else if ([".ts", ".tsx", ".js", ".mjs"].includes(extname(entry.name))) {
      files.push(path);
    }
  }
  return files;
}
