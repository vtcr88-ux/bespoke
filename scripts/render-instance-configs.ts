import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseInstanceCliOptions,
  readInstanceEnvironmentFile,
} from "./instance-env.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { envFile, values } = readInstanceEnvironmentFile(
  root,
  parseInstanceCliOptions(),
);
const instanceId = required("INSTANCE_ID");
const outputDirectory = resolve(root, "instances", instanceId, "rendered");
mkdirSync(outputDirectory, { recursive: true });

const replacements = {
  __ADMIN_DOMAIN__: values.ADMIN_DOMAIN || adminDomain(),
  __API_DOMAIN__: values.API_DOMAIN || hostFromUrl(required("PUBLIC_API_URL")),
  __API_PORT__: required("PORT"),
  __APP_ROOT__: values.APP_ROOT || `/opt/catalog-platform/${instanceId}`,
  __INSTANCE_ID__: instanceId,
  __PUBLIC_DOMAIN__:
    values.PUBLIC_DOMAIN || hostFromUrl(required("PUBLIC_WEB_URL")),
  __SERVICE_GROUP__: values.SERVICE_GROUP || "catalog",
  __SERVICE_USER__: values.SERVICE_USER || "catalog",
};

render(
  "infra/nginx/public-site.conf.template",
  "nginx-public-site.conf",
);
render("infra/nginx/admin-site.conf.template", "nginx-admin-site.conf");
render("infra/nginx/api.conf.template", "nginx-api.conf");
render(
  "infra/systemd/catalog-api.service.template",
  `catalog-api-${instanceId}.service`,
);

process.stdout.write(
  `Rendered isolated deployment configs for ${instanceId} from ${envFile}.\n`,
);
process.stdout.write(`Output: ${outputDirectory}\n`);

function render(templatePath: string, outputName: string) {
  let content = readFileSync(resolve(root, templatePath), "utf8");
  for (const [placeholder, value] of Object.entries(replacements)) {
    content = content.replaceAll(placeholder, value);
  }
  if (/__[A-Z0-9_]+__/.test(content)) {
    throw new Error(`${templatePath} still contains placeholders.`);
  }
  writeFileSync(resolve(outputDirectory, outputName), content, "utf8");
}

function required(name: string) {
  const value = values[name]?.trim();
  if (!value) throw new Error(`${name} is required in ${envFile}.`);
  return value;
}

function hostFromUrl(value: string) {
  return new URL(value).host;
}

function adminDomain() {
  const publicHost = hostFromUrl(required("PUBLIC_WEB_URL"));
  const apiHost = hostFromUrl(required("PUBLIC_API_URL"));
  const origin = required("CORS_ORIGINS")
    .split(",")
    .map((item) => item.trim())
    .find((item) => {
      if (!item) return false;
      const host = hostFromUrl(item);
      return host !== publicHost && host !== apiHost;
    });
  if (origin) return hostFromUrl(origin);
  return `admin.${publicHost}`;
}
