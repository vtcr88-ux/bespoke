import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import mysql, { type RowDataPacket } from "mysql2/promise";
import { storefrontSettingsSchema } from "@bespoke/contracts";
import { defaultStorefront } from "../apps/api/src/modules/store/commerce.store.js";
import { loadApiEnvironment, parseInstanceCliOptions } from "./instance-env.js";

if (!process.argv.includes("--confirm-initial")) {
  throw new Error(
    "Initial seed requires --confirm-initial and must not be used during routine updates.",
  );
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
loadApiEnvironment(root, parseInstanceCliOptions());
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

const connection = await mysql.createConnection({
  uri: process.env.DATABASE_URL,
  multipleStatements: true,
});
let appliedBrandInstance = "";
try {
  await connection.beginTransaction();
  const [rows] = await connection.query<
    Array<RowDataPacket & { product_count: number; setting_count: number }>
  >(
    `
      SELECT
        (SELECT COUNT(*) FROM products) AS product_count,
        (SELECT COUNT(*) FROM store_settings WHERE setting_key = 'storefront.visual') AS setting_count
    `,
  );
  if ((rows[0]?.product_count ?? 0) > 0 || (rows[0]?.setting_count ?? 0) > 0) {
    throw new Error(
      "Seed refused because the catalog or storefront is already initialized.",
    );
  }
  await connection.query(
    readFileSync(resolve(root, "database/seeds/001_demo_catalog.sql"), "utf8"),
  );
  const instanceId = process.env.INSTANCE_ID;
  const brandSeedPath = instanceId
    ? resolve(root, "instances", instanceId, "brand.seed.json")
    : "";
  if (brandSeedPath && existsSync(brandSeedPath)) {
    const brand = JSON.parse(readFileSync(brandSeedPath, "utf8")) as Record<
      string,
      unknown
    >;
    const settings = storefrontSettingsSchema.parse({
      ...defaultStorefront,
      brandName: brand.storeName,
      legalName: brand.legalName || brand.storeName,
      logoUrl: brand.logoUrl,
      logoOnDarkUrl: brand.logoOnDarkUrl,
      faviconUrl: brand.faviconUrl,
      socialImageUrl: brand.socialImageUrl,
      contactEmail: brand.contactEmail,
      whatsappNumber: brand.whatsappNumber,
      defaultMetaTitle: brand.defaultMetaTitle,
      defaultMetaDescription: brand.defaultMetaDescription,
      primaryColor: brand.primaryColor,
      accentColor: brand.accentColor,
      footerColor: brand.footerColor || brand.accentColor,
      backgroundColor: brand.backgroundColor,
      homeLayout: brand.layoutPreset,
      homeMotionPreset: brand.motionPreset,
    });
    await connection.execute(
      `
        INSERT INTO store_settings (id, setting_key, setting_value)
        VALUES (?, 'storefront.visual', ?)
      `,
      [randomUUID(), JSON.stringify(settings)],
    );
    appliedBrandInstance = instanceId;
  }
  await connection.commit();
  if (appliedBrandInstance) {
    process.stdout.write(
      `Brand seed applied for instance '${appliedBrandInstance}'.\n`,
    );
  }
  process.stdout.write("Initial catalog seed applied.\n");
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
