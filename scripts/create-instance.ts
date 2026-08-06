import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "dotenv";
import { assertInstanceId } from "./instance-env.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = namedArgs();
const slug = args.slug ?? "";
assertInstanceId(slug);

const target = resolve(root, "instances", slug);
if (existsSync(target)) throw new Error(`Instance '${slug}' already exists.`);
mkdirSync(target, { recursive: true });

const databaseName = slug.replace(/-/g, "_");
const initialStoreName = args.name ?? titleFromSlug(slug);
const port = parsePort(args.port) ?? nextAvailableApiPort();
const publicDomain = args["public-domain"] ?? "lojadocliente.com.br";
const adminDomain = args["admin-domain"] ?? `admin.${publicDomain}`;
const apiDomain = args["api-domain"] ?? `api.${publicDomain}`;

write(
  "brand.seed.json",
  JSON.stringify(
    {
      storeName: initialStoreName,
      legalName: initialStoreName,
      logoUrl: "",
      logoOnDarkUrl: "",
      faviconUrl: "",
      socialImageUrl: "",
      primaryColor: "#090907",
      accentColor: "#c9a76d",
      footerColor: "#c9a76d",
      backgroundColor: "#ffffff",
      contactEmail: "",
      whatsappNumber: "",
      defaultMetaTitle: `${initialStoreName} | Catalogo`,
      defaultMetaDescription: `Conheca a curadoria da ${initialStoreName} e escolha como concluir sua compra.`,
      layoutPreset: "editorial",
      motionPreset: "editorial",
    },
    null,
    2,
  ),
);
write(
  "features.json",
  JSON.stringify(
    {
      onlinePayment: true,
      whatsappPurchase: true,
      shippingMode: "whatsapp_after_payment",
    },
    null,
    2,
  ),
);
const environmentTemplate = `NODE_ENV=production
INSTANCE_ID=${slug}
PORT=${port}
PUBLIC_DOMAIN=${publicDomain}
ADMIN_DOMAIN=${adminDomain}
API_DOMAIN=${apiDomain}
APP_ROOT=/opt/catalog-platform/${slug}
SERVICE_USER=catalog
SERVICE_GROUP=catalog
DATABASE_URL=mysql://${databaseName}_app:REPLACE_ME@127.0.0.1:3306/${databaseName}
COMMERCE_STORAGE=mysql
DATABASE_HOST=127.0.0.1
DATABASE_PORT=3306
DATABASE_NAME=${databaseName}
DATABASE_USER=${databaseName}_app
DATABASE_PASSWORD=REPLACE_ME
DATABASE_GRANT_HOST=127.0.0.1
SESSION_SECRET=REPLACE_WITH_UNIQUE_SECRET
CSRF_SECRET=REPLACE_WITH_ANOTHER_UNIQUE_SECRET
ADMIN_EMAIL=owner@example.invalid
ADMIN_PASSWORD_HASH=REPLACE_WITH_SCRYPT_HASH
ADMIN_SESSION_TTL_MINUTES=480
CORS_ORIGINS=https://${publicDomain},https://${adminDomain}
TRUSTED_HOSTS=${publicDomain},${adminDomain},${apiDomain}
LOG_LEVEL=info
MERCADO_PAGO_ACCESS_TOKEN=REPLACE_ME
MERCADO_PAGO_WEBHOOK_SECRET=REPLACE_ME
WHATSAPP_STORE_PHONE=5511999999999
PUBLIC_API_URL=https://${apiDomain}
PUBLIC_WEB_URL=https://${publicDomain}
UPLOADS_DIR=/var/lib/catalog-platform/${slug}/uploads
`;
write(".env.example", environmentTemplate);
write(".env.production.example", environmentTemplate);
write(
  "compose.override.yml",
  `services:
  mysql:
    container_name: catalog-${slug}-mysql
    volumes:
      - catalog_${databaseName}_mysql:/var/lib/mysql

volumes:
  catalog_${databaseName}_mysql:
`,
);
write(
  "README.md",
  `# Instance: ${slug}

This directory contains configuration templates only. It does not contain a copy of the application.

## Provisioning checklist

- [ ] Copy \`.env.example\` to \`.env\` locally or to \`/etc/catalog-platform/${slug}.env\` on the VPS.
- [ ] Keep \`.env\` out of Git and fill unique secrets, Mercado Pago credentials and Admin credentials.
- [ ] Create an exclusive MySQL database and user with \`npm run instance:db:provision -- --instance=${slug} --confirm\`.
- [ ] Generate the administrator password hash with \`npm run admin:create\`.
- [ ] Create \`/var/lib/catalog-platform/${slug}/uploads\` with restricted permissions.
- [ ] Configure the public, admin and API domains.
- [ ] Render Nginx and systemd files with \`npm run instance:render -- --instance=${slug}\`.
- [ ] Run migrations, optional initial seed, build and readiness checks.
- [ ] Configure independent backups and test restoration.
`,
);

process.stdout.write(
  `Instance template created at instances/${slug} using API port ${port}.\n`,
);

function write(name: string, content: string) {
  writeFileSync(resolve(target, name), `${content.trimEnd()}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
}

function titleFromSlug(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function namedArgs() {
  const values: Record<string, string> = {};
  for (const argument of process.argv.slice(2)) {
    if (!argument.startsWith("--")) continue;
    const [key, value] = argument.slice(2).split("=", 2);
    if (!key) continue;
    values[key] = value ?? "";
  }
  return values;
}

function parsePort(value: string | undefined) {
  if (!value) return undefined;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Use --port with a valid TCP port.");
  }
  return port;
}

function nextAvailableApiPort() {
  const usedPorts = new Set<number>();
  for (const path of [
    resolve(root, "apps/api/.env"),
    ...instanceEnvTemplates(),
  ]) {
    if (!existsSync(path)) continue;
    const values = parse(readFileSync(path, "utf8"));
    const port = parsePort(values.PORT);
    if (port) usedPorts.add(port);
  }

  for (let port = 3333; port <= 3999; port += 1) {
    if (!usedPorts.has(port)) return port;
  }
  throw new Error("No available API port found between 3333 and 3999.");
}

function instanceEnvTemplates() {
  const instancesRoot = resolve(root, "instances");
  if (!existsSync(instancesRoot)) return [];
  return readdirSync(instancesRoot)
    .map((name) => resolve(instancesRoot, name))
    .filter((path) => statSync(path).isDirectory())
    .flatMap((path) => [
      resolve(path, ".env"),
      resolve(path, ".env.example"),
    ]);
}
