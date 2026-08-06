import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import {
  adminProductInputSchema,
  productSchema,
  storefrontSettingsSchema,
  type AdminProductInput,
  type StorefrontSettings,
} from "@bespoke/contracts";
import { loadEnv } from "../apps/api/src/config/env.js";
import { defaultStorefront } from "../apps/api/src/modules/store/commerce.store.js";
import { MySqlCommerceStore } from "../apps/api/src/modules/store/mysql-commerce.store.js";

type LegacyFileState = {
  categories?: Array<{ id: string; slug: string; name: string }>;
  products?: unknown[];
  orders?: unknown[];
  checkoutAccess?: Record<string, string>;
  webhookEvents?: string[];
  storefront?: Partial<StorefrontSettings>;
};

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(root, "apps/api/.env") });
const env = loadEnv();
if (env.NODE_ENV !== "development" || env.COMMERCE_STORAGE !== "mysql") {
  throw new Error(
    "File import is allowed only in development with COMMERCE_STORAGE=mysql.",
  );
}

const filePath = resolve(root, "database/dev-commerce-store.json");
const legacy = JSON.parse(await readFile(filePath, "utf8")) as LegacyFileState;
if ((legacy.orders?.length ?? 0) > 0) {
  throw new Error(
    "Import refused because the file store contains orders. Migrate order and payment state with a reviewed procedure.",
  );
}
if (Object.keys(legacy.checkoutAccess ?? {}).length > 0) {
  throw new Error(
    "Import refused because the file store contains checkout access tokens.",
  );
}

const legacyProducts = (legacy.products ?? []).map((value) =>
  productSchema.parse(value),
);
const legacyStorefront = storefrontSettingsSchema.parse({
  ...defaultStorefront,
  ...(legacy.storefront ?? {}),
});
const includeStorefront = process.argv.includes("--include-storefront");
const overwriteCustomStorefront = process.argv.includes(
  "--overwrite-custom-storefront",
);
const confirmed = process.argv.includes("--confirm");
const store = MySqlCommerceStore.fromUrl(env.DATABASE_URL, {
  autoSetup: false,
});

try {
  const [databaseCategories, databaseProducts, databaseStorefront] =
    await Promise.all([
      store.categories(),
      store.adminProducts(),
      store.storefront(),
    ]);
  assertSameIds(
    "categories",
    (legacy.categories ?? []).map((category) => category.id),
    databaseCategories.map((category) => category.id),
  );
  assertSameIds(
    "products",
    legacyProducts.map((product) => product.id),
    databaseProducts.map((product) => product.id),
  );

  const productUpdates = legacyProducts
    .map((product) => ({
      id: product.id,
      input: adminProductInputSchema.parse({
        sku: product.sku,
        slug: product.slug,
        name: product.name,
        subtitle: product.subtitle,
        description: product.description,
        categorySlug: product.category.slug,
        priceInCents: product.priceInCents,
        compareAtPriceInCents: product.compareAtPriceInCents,
        stock: product.stock,
        lowStockThreshold: product.lowStockThreshold,
        imageUrl: product.images[0]?.url,
        imageAlt: product.images[0]?.alt,
        isActive: product.isActive,
        isFeatured: product.isFeatured,
        sortOrder: product.sortOrder,
      }),
    }))
    .filter(({ id, input }) => {
      const current = databaseProducts.find((product) => product.id === id);
      return !current || !sameProduct(current, input);
    });
  const storefrontChanged =
    JSON.stringify(databaseStorefront) !== JSON.stringify(legacyStorefront);
  const storefrontSelected = includeStorefront && storefrontChanged;
  const databaseStorefrontIsCustomized =
    JSON.stringify(databaseStorefront) !==
    JSON.stringify(storefrontSettingsSchema.parse(defaultStorefront));

  process.stdout.write(
    [
      `Legacy file: ${legacyProducts.length} products, ${legacy.categories?.length ?? 0} categories, 0 orders.`,
      `Pending product updates: ${productUpdates.length}.`,
      `Storefront settings differ: ${storefrontChanged ? "yes" : "no"}.`,
      `Storefront import: ${storefrontSelected ? "selected" : "skipped"}.`,
      `Legacy webhook event IDs not imported: ${legacy.webhookEvents?.length ?? 0}.`,
    ].join("\n") + "\n",
  );

  if (
    storefrontSelected &&
    databaseStorefrontIsCustomized &&
    !overwriteCustomStorefront
  ) {
    throw new Error(
      "Storefront import refused because MySQL contains customized settings. Review both states and add --overwrite-custom-storefront only when replacement is intentional.",
    );
  }

  if (!productUpdates.length && !storefrontSelected) {
    process.stdout.write("MySQL matches the selected import scope.\n");
  } else if (!confirmed) {
    throw new Error(
      "Review the summary, then run npm run storage:import-file -- --confirm.",
    );
  } else {
    for (const update of productUpdates) {
      await store.updateProduct(update.id, update.input);
    }
    if (storefrontSelected) {
      const recoveryDirectory = resolve(root, "storage/recovery");
      await mkdir(recoveryDirectory, { recursive: true });
      const stamp = new Date().toISOString().replaceAll(":", "-");
      const backupPath = resolve(
        recoveryDirectory,
        `storefront-before-file-import-${stamp}.json`,
      );
      await writeFile(
        backupPath,
        `${JSON.stringify(databaseStorefront, null, 2)}\n`,
        "utf8",
      );
      await store.updateStorefront(legacyStorefront);
      process.stdout.write(`Storefront backup: ${backupPath}.\n`);
    }
    process.stdout.write("Importable file state copied to MySQL.\n");
  }
} finally {
  await store.close();
}

function assertSameIds(label: string, source: string[], target: string[]) {
  const sourceIds = [...source].sort();
  const targetIds = [...target].sort();
  if (JSON.stringify(sourceIds) !== JSON.stringify(targetIds)) {
    throw new Error(
      `Import refused because ${label} IDs differ between file storage and MySQL.`,
    );
  }
}

function sameProduct(
  current: {
    sku: string;
    slug: string;
    name: string;
    subtitle: string | null;
    description: string;
    categorySlug: string;
    priceInCents: number;
    compareAtPriceInCents: number | null;
    stock: number;
    lowStockThreshold: number;
    imageUrl: string;
    imageAlt: string;
    status: "active" | "inactive";
    isFeatured: boolean;
    sortOrder: number;
  },
  input: AdminProductInput,
) {
  return (
    current.sku === input.sku &&
    current.slug === input.slug &&
    current.name === input.name &&
    current.subtitle === (input.subtitle ?? null) &&
    current.description === input.description &&
    current.categorySlug === input.categorySlug &&
    current.priceInCents === input.priceInCents &&
    current.compareAtPriceInCents === (input.compareAtPriceInCents ?? null) &&
    current.stock === input.stock &&
    current.lowStockThreshold === input.lowStockThreshold &&
    current.imageUrl === input.imageUrl &&
    current.imageAlt === input.imageAlt &&
    (current.status === "active") === input.isActive &&
    current.isFeatured === input.isFeatured &&
    current.sortOrder === input.sortOrder
  );
}
