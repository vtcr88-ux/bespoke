import { constants } from "node:fs";
import { access, mkdir, open, unlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import mysql, { type RowDataPacket } from "mysql2/promise";
import { loadEnv } from "../apps/api/src/config/env.js";
import { resolveUploadsRoot } from "../apps/api/src/config/uploads.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({
  path: process.env.ENV_FILE
    ? resolve(process.env.ENV_FILE)
    : resolve(root, "apps/api/.env"),
});

const env = loadEnv();
if (env.COMMERCE_STORAGE !== "mysql") {
  throw new Error(
    "Storage check requires COMMERCE_STORAGE=mysql. File storage is an explicit development fallback only.",
  );
}

const uploadsRoot = resolveUploadsRoot(env, root);
const connection = await mysql.createConnection({ uri: env.DATABASE_URL });

function collectManagedUploads(value: unknown, result: Set<string>) {
  if (typeof value === "string") {
    try {
      const pathname = new URL(value).pathname;
      const match = pathname.match(
        /^\/uploads\/(images\/[0-9a-f-]{36}\.(?:png|jpg|webp))$/i,
      );
      if (match?.[1]) result.add(match[1]);
    } catch {
      // Non-URL storefront copy is expected and does not represent an upload.
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectManagedUploads(item, result));
    return;
  }
  if (value && typeof value === "object") {
    Object.values(value).forEach((item) => collectManagedUploads(item, result));
  }
}

try {
  const [migrations] = await connection.query<
    Array<RowDataPacket & { migration_name: string }>
  >("SELECT migration_name FROM schema_migrations ORDER BY migration_name");
  const [countRows] = await connection.query<
    Array<
      RowDataPacket & {
        categories: number;
        products: number;
        orders: number;
        settings: number;
        storefrontRevisions: number;
      }
    >
  >(`
    SELECT
      (SELECT COUNT(*) FROM categories) AS categories,
      (SELECT COUNT(*) FROM products) AS products,
      (SELECT COUNT(*) FROM orders) AS orders,
      (SELECT COUNT(*) FROM store_settings) AS settings,
      (SELECT COUNT(*) FROM storefront_setting_revisions) AS storefrontRevisions
  `);
  const counts = countRows[0];
  if (!counts) throw new Error("Storage count query did not return a result.");
  const [settingRows] = await connection.query<
    Array<RowDataPacket & { setting_value: unknown }>
  >("SELECT setting_value FROM store_settings");
  const [mediaRows] = await connection.query<
    Array<RowDataPacket & { public_url: string }>
  >("SELECT public_url FROM media_assets");

  await mkdir(uploadsRoot, { recursive: true });
  await access(uploadsRoot, constants.R_OK | constants.W_OK);
  const probePath = resolve(uploadsRoot, `.storage-probe-${randomUUID()}`);
  const probe = await open(probePath, "wx", 0o600);
  try {
    await probe.writeFile("storage-ready", "utf8");
  } finally {
    await probe.close();
    await unlink(probePath);
  }

  const referencedUploads = new Set<string>();
  settingRows.forEach((row) => {
    const value =
      typeof row.setting_value === "string"
        ? (JSON.parse(row.setting_value) as unknown)
        : row.setting_value;
    collectManagedUploads(value, referencedUploads);
  });
  mediaRows.forEach((row) =>
    collectManagedUploads(row.public_url, referencedUploads),
  );
  const missingUploads: string[] = [];
  for (const relativePath of referencedUploads) {
    try {
      await access(resolve(uploadsRoot, relativePath), constants.R_OK);
    } catch {
      missingUploads.push(relativePath);
    }
  }

  if (missingUploads.length > 0) {
    throw new Error(
      `Upload consistency check failed: ${missingUploads.length} referenced file(s) are missing from ${uploadsRoot}: ${missingUploads.join(", ")}`,
    );
  }

  const latestMigration = migrations.at(-1)?.migration_name ?? "none";
  process.stdout.write(
    [
      "Commerce storage: MySQL ready.",
      `Migrations: ${migrations.length} applied; latest ${latestMigration}.`,
      `Data: ${counts.categories} categories, ${counts.products} products, ${counts.orders} orders, ${counts.settings} storefront settings.`,
      `Storefront history: ${counts.storefrontRevisions} revision(s).`,
      `Uploads: writable at ${uploadsRoot}.`,
      `Upload references: ${referencedUploads.size} file(s) present.`,
    ].join("\n") + "\n",
  );
} finally {
  await connection.end();
}
