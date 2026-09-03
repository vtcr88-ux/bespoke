import { randomUUID } from "node:crypto";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { parse } from "dotenv";

const instanceIdPattern = /^[a-z0-9][a-z0-9-]{2,62}$/;
const domainPattern =
  /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const minimumApiPort = 3333;
const maximumAutomaticApiPort = 3999;

export type InstanceTemplateInput = {
  slug: string;
  name: string;
  publicDomain: string;
  adminDomain: string;
  apiDomain: string;
  port?: number;
};

export type InstanceTemplateRecord = {
  slug: string;
  publicDomain: string;
  adminDomain: string;
  apiDomain: string;
  port: number;
};

export type PreparedInstanceTemplate = InstanceTemplateRecord & {
  directory: string;
};

export function assertInstanceId(value: string) {
  if (!instanceIdPattern.test(value)) {
    throw new Error(
      "Instance id must use lowercase letters, numbers and hyphens.",
    );
  }
}

export function normalizeInstanceTemplateInput(
  input: InstanceTemplateInput,
): InstanceTemplateInput {
  const normalized = {
    ...input,
    slug: input.slug.trim().toLowerCase(),
    name: input.name.trim(),
    publicDomain: normalizeDomain(input.publicDomain),
    adminDomain: normalizeDomain(input.adminDomain),
    apiDomain: normalizeDomain(input.apiDomain),
  };
  assertInstanceId(normalized.slug);
  if (normalized.name.length < 2 || normalized.name.length > 120) {
    throw new Error("Store name must contain between 2 and 120 characters.");
  }
  for (const [label, domain] of [
    ["public", normalized.publicDomain],
    ["admin", normalized.adminDomain],
    ["api", normalized.apiDomain],
  ] as const) {
    if (!domainPattern.test(domain)) {
      throw new Error(`The ${label} domain is invalid.`);
    }
  }
  if (
    new Set([
      normalized.publicDomain,
      normalized.adminDomain,
      normalized.apiDomain,
    ]).size !== 3
  ) {
    throw new Error("Public, Admin and API domains must be different.");
  }
  if (normalized.port !== undefined) assertApiPort(normalized.port);
  return normalized;
}

export function listInstanceTemplates(root: string): InstanceTemplateRecord[] {
  const instancesRoot = resolve(root, "instances");
  if (!existsSync(instancesRoot)) return [];

  return readdirSync(instancesRoot)
    .map((name) => resolve(instancesRoot, name))
    .filter((path) => statSync(path).isDirectory())
    .flatMap((directory) => {
      const envFile = [resolve(directory, ".env"), resolve(directory, ".env.example")]
        .find(existsSync);
      if (!envFile) return [];
      const values = parse(readFileSync(envFile, "utf8"));
      const slug = values.INSTANCE_ID?.trim();
      const port = Number(values.PORT);
      if (!slug || !Number.isInteger(port)) return [];
      return [
        {
          slug,
          port,
          publicDomain: domainFrom(values.PUBLIC_DOMAIN, values.PUBLIC_WEB_URL),
          adminDomain: domainFrom(values.ADMIN_DOMAIN, adminOrigin(values.CORS_ORIGINS)),
          apiDomain: domainFrom(values.API_DOMAIN, values.PUBLIC_API_URL),
        },
      ];
    });
}

export function nextAvailableApiPort(
  records: readonly Pick<InstanceTemplateRecord, "port">[],
) {
  const usedPorts = new Set(records.map((record) => record.port));
  for (let port = minimumApiPort; port <= maximumAutomaticApiPort; port += 1) {
    if (!usedPorts.has(port)) return port;
  }
  throw new Error(
    `No available API port found between ${minimumApiPort} and ${maximumAutomaticApiPort}.`,
  );
}

export function prepareInstanceTemplate(
  root: string,
  rawInput: InstanceTemplateInput,
): PreparedInstanceTemplate {
  const input = normalizeInstanceTemplateInput(rawInput);
  const instancesRoot = resolve(root, "instances");
  mkdirSync(instancesRoot, { recursive: true });
  const lockPath = resolve(instancesRoot, ".prepare.lock");
  let lockDescriptor: number;
  try {
    lockDescriptor = openSync(lockPath, "wx", 0o600);
  } catch {
    throw new Error("Another instance preparation is already in progress.");
  }

  try {
    const records = listInstanceTemplates(root);
    const target = resolve(instancesRoot, input.slug);
    if (existsSync(target)) {
      throw new Error(`Instance '${input.slug}' already exists.`);
    }
    assertDomainsAvailable(input, records);
    const port = input.port ?? nextAvailableApiPort(records);
    assertApiPort(port);
    if (records.some((record) => record.port === port)) {
      throw new Error(`API port ${port} is already reserved.`);
    }

    const temporary = resolve(
      instancesRoot,
      `.${input.slug}-${randomUUID()}.tmp`,
    );
    mkdirSync(temporary, { recursive: false });
    try {
      writeInstanceFiles(temporary, { ...input, port });
      renameSync(temporary, target);
    } catch (error) {
      rmSync(temporary, { recursive: true, force: true });
      throw error;
    }
    return {
      slug: input.slug,
      publicDomain: input.publicDomain,
      adminDomain: input.adminDomain,
      apiDomain: input.apiDomain,
      port,
      directory: target,
    };
  } finally {
    closeSync(lockDescriptor);
    unlinkSync(lockPath);
  }
}

function writeInstanceFiles(
  target: string,
  input: Required<InstanceTemplateInput>,
) {
  const databaseName = input.slug.replaceAll("-", "_");
  const brand = {
    storeName: input.name,
    legalName: input.name,
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
    defaultMetaTitle: `${input.name} | Catalogo`,
    defaultMetaDescription: `Conheca a curadoria da ${input.name} e escolha como concluir sua compra.`,
    layoutPreset: "editorial",
    motionPreset: "editorial",
  };
  const environment = `NODE_ENV=production
INSTANCE_ID=${input.slug}
PORT=${input.port}
PUBLIC_DOMAIN=${input.publicDomain}
ADMIN_DOMAIN=${input.adminDomain}
API_DOMAIN=${input.apiDomain}
APP_ROOT=/opt/catalog-platform/${input.slug}
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
CORS_ORIGINS=https://${input.publicDomain},https://${input.adminDomain}
TRUSTED_HOSTS=${input.publicDomain},${input.adminDomain},${input.apiDomain}
LOG_LEVEL=info
MERCADO_PAGO_ACCESS_TOKEN=REPLACE_ME
MERCADO_PAGO_WEBHOOK_SECRET=REPLACE_ME
WHATSAPP_STORE_PHONE=5511999999999
PUBLIC_API_URL=https://${input.apiDomain}
PUBLIC_WEB_URL=https://${input.publicDomain}
UPLOADS_DIR=/var/lib/catalog-platform/${input.slug}/uploads
`;

  write(target, "brand.seed.json", JSON.stringify(brand, null, 2));
  write(target, ".env.example", environment);
  write(target, ".env.production.example", environment);
  write(
    target,
    "compose.override.yml",
    `services:
  mysql:
    container_name: catalog-${input.slug}-mysql
    volumes:
      - catalog_${databaseName}_mysql:/var/lib/mysql

volumes:
  catalog_${databaseName}_mysql:
`,
  );
  write(
    target,
    "README.md",
    `# Instance: ${input.slug}

This directory contains configuration templates only. It does not contain a copy of the application or real secrets.

## Provisioning checklist

- [ ] Review the generated domains and reserved API port.
- [ ] Create a protected environment outside Git with unique secrets.
- [ ] Create an exclusive MySQL database and runtime user.
- [ ] Initialize the storefront without demo products.
- [ ] Render and install Nginx and systemd configuration.
- [ ] Configure HTTPS, backups and isolated health checks.
`,
  );
}

function write(directory: string, name: string, content: string) {
  writeFileSync(resolve(directory, name), `${content.trimEnd()}\n`, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
}

function assertDomainsAvailable(
  input: InstanceTemplateInput,
  records: readonly InstanceTemplateRecord[],
) {
  const requested = new Set([
    input.publicDomain,
    input.adminDomain,
    input.apiDomain,
  ]);
  const conflict = records.find((record) =>
    [record.publicDomain, record.adminDomain, record.apiDomain].some((domain) =>
      requested.has(domain),
    ),
  );
  if (conflict) {
    throw new Error(`A requested domain is already used by '${conflict.slug}'.`);
  }
}

function assertApiPort(port: number) {
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error("Use a valid unprivileged TCP port.");
  }
}

function normalizeDomain(value: string) {
  return value.trim().toLowerCase().replace(/\.$/, "");
}

function domainFrom(explicit: string | undefined, url: string | undefined) {
  if (explicit?.trim()) return normalizeDomain(explicit);
  if (!url?.trim()) return "";
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function adminOrigin(origins: string | undefined) {
  return origins
    ?.split(",")
    .map((origin) => origin.trim())
    .find((origin) => /:\/\/admin\./i.test(origin));
}
