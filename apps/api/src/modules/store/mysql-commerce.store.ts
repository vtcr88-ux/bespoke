import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import mysql, { type Pool, type PoolConnection, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";
import type { AdminProductInput, AdminProductRow, Category, PricedCart, Product, StorefrontSettings } from "@bespoke/contracts";
import { storefrontSettingsSchema } from "@bespoke/contracts";
import { categories as demoCategories, products as demoProducts } from "../../data/demo-catalog.js";
import { ApiError, assertFound } from "../../shared/api-error.js";
import {
  defaultStorefront,
  orderItemsFromCart,
  type CommerceStoreAdapter,
  type StoredOrder,
  uniqueSlug
} from "./commerce.store.js";

type CategoryRow = RowDataPacket & {
  id: string;
  slug: string;
  name: string;
  description: string | null;
};

type ProductRow = RowDataPacket & {
  id: string;
  slug: string;
  sku: string;
  name: string;
  subtitle: string | null;
  description: string;
  price_in_cents: number;
  compare_at_price_in_cents: number | null;
  stock: number;
  low_stock_threshold: number;
  is_active: number | boolean;
  category_id: string;
  category_slug: string;
  category_name: string;
  category_description: string | null;
  image_id: string | null;
  image_url: string | null;
  image_alt: string | null;
  image_width: number | null;
  image_height: number | null;
};

type OrderRow = RowDataPacket & {
  id: string;
  public_reference: string;
  status: StoredOrder["status"];
  subtotal_in_cents: number;
  discount_in_cents: number;
  shipping_in_cents: number;
  total_in_cents: number;
  currency: "BRL";
  sales_channel: "online" | "whatsapp";
  created_at: Date;
  updated_at: Date;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
};

type OrderItemRow = RowDataPacket & {
  order_id: string;
  product_id: string;
  product_name: string;
  sku: string;
  unit_price_in_cents: number;
  quantity: number;
  subtotal_in_cents: number;
  image_url: string | null;
};

type SettingRow = RowDataPacket & {
  setting_value: StorefrontSettings | string;
};

const storefrontSettingKey = "storefront.visual";
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../..");

export class MySqlCommerceStore implements CommerceStoreAdapter {
  private seeded = false;

  private constructor(private readonly pool: Pool) {}

  static fromUrl(databaseUrl: string) {
    return new MySqlCommerceStore(
      mysql.createPool({
        uri: databaseUrl,
        connectionLimit: 10,
        decimalNumbers: true,
        multipleStatements: true,
        timezone: "Z"
      })
    );
  }

  async categories(): Promise<Category[]> {
    await this.ensureSeeded();
    const [rows] = await this.pool.query<CategoryRow[]>(
      "SELECT id, slug, name, description FROM categories WHERE is_active = TRUE ORDER BY name"
    );
    return rows.map(mapCategory);
  }

  async products({ includeInactive = false }: { includeInactive?: boolean } = {}): Promise<Product[]> {
    await this.ensureSeeded();
    const [rows] = await this.pool.query<ProductRow[]>(
      `
        SELECT
          p.id,
          p.slug,
          p.sku,
          p.name,
          p.subtitle,
          p.description,
          p.price_in_cents,
          p.compare_at_price_in_cents,
          p.stock,
          p.low_stock_threshold,
          p.is_active,
          c.id AS category_id,
          c.slug AS category_slug,
          c.name AS category_name,
          c.description AS category_description,
          ma.id AS image_id,
          ma.public_url AS image_url,
          ma.alt_text AS image_alt,
          ma.width AS image_width,
          ma.height AS image_height
        FROM products p
        INNER JOIN categories c ON c.id = p.category_id
        LEFT JOIN product_images pi ON pi.id = (
          SELECT pi2.id
          FROM product_images pi2
          WHERE pi2.product_id = p.id
          ORDER BY pi2.position ASC, pi2.created_at ASC
          LIMIT 1
        )
        LEFT JOIN media_assets ma ON ma.id = pi.media_asset_id
        ${includeInactive ? "" : "WHERE p.is_active = TRUE"}
        ORDER BY p.created_at DESC, p.name ASC
      `
    );

    return rows.map(mapProduct);
  }

  async findProductById(id: string): Promise<Product | null> {
    const products = await this.products();
    return products.find((product) => product.id === id) ?? null;
  }

  async findProductBySlug(slug: string): Promise<Product | null> {
    const products = await this.products();
    return products.find((product) => product.slug === slug) ?? null;
  }

  async adminProducts(): Promise<AdminProductRow[]> {
    const products = await this.products({ includeInactive: true });
    return products.map((product) => ({
      id: product.id,
      sku: product.sku,
      slug: product.slug,
      name: product.name,
      subtitle: product.subtitle,
      description: product.description,
      category: product.category.name,
      categorySlug: product.category.slug,
      priceInCents: product.priceInCents,
      compareAtPriceInCents: product.compareAtPriceInCents,
      stock: product.stock,
      lowStockThreshold: product.lowStockThreshold,
      status: product.isActive ? "active" : "inactive",
      lowStock: product.stock <= product.lowStockThreshold,
      imageUrl: product.images[0]?.url ?? "",
      imageAlt: product.images[0]?.alt ?? product.name
    }));
  }

  async createProduct(input: AdminProductInput): Promise<Product> {
    await this.ensureSeeded();
    const category = await this.findCategory(input.categorySlug);
    const slug = input.slug ?? uniqueSlug(input.name, await this.products({ includeInactive: true }));
    await this.assertUniqueProductIdentity({ sku: input.sku, slug });

    const productId = randomUUID();
    const mediaAssetId = randomUUID();
    const productImageId = randomUUID();
    const connection = await this.pool.getConnection();

    try {
      await connection.beginTransaction();
      await connection.execute(
        `
          INSERT INTO products (
            id, category_id, slug, sku, name, subtitle, description, price_in_cents,
            compare_at_price_in_cents, stock, low_stock_threshold, is_active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          productId,
          category.id,
          slug,
          input.sku,
          input.name,
          input.subtitle ?? null,
          input.description,
          input.priceInCents,
          input.compareAtPriceInCents ?? null,
          input.stock,
          input.lowStockThreshold,
          input.isActive
        ]
      );
      await insertMedia(connection, {
        mediaAssetId,
        storageKey: `admin-products/${productId}/${mediaAssetId}`,
        url: input.imageUrl,
        alt: input.imageAlt
      });
      await connection.execute(
        "INSERT INTO product_images (id, product_id, media_asset_id, position) VALUES (?, ?, ?, 0)",
        [productImageId, productId, mediaAssetId]
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return assertFound(await this.findAnyProductById(productId), "PRODUCT_NOT_FOUND", "Product not found.");
  }

  async updateProduct(id: string, input: AdminProductInput): Promise<Product> {
    await this.ensureSeeded();
    await assertFound(await this.findAnyProductById(id), "PRODUCT_NOT_FOUND", "Product not found.");
    const category = await this.findCategory(input.categorySlug);
    const slug = input.slug ?? uniqueSlug(input.name, await this.products({ includeInactive: true }), id);
    await this.assertUniqueProductIdentity({ sku: input.sku, slug, currentId: id });

    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(
        `
          UPDATE products
          SET
            category_id = ?,
            slug = ?,
            sku = ?,
            name = ?,
            subtitle = ?,
            description = ?,
            price_in_cents = ?,
            compare_at_price_in_cents = ?,
            stock = ?,
            low_stock_threshold = ?,
            is_active = ?
          WHERE id = ?
        `,
        [
          category.id,
          slug,
          input.sku,
          input.name,
          input.subtitle ?? null,
          input.description,
          input.priceInCents,
          input.compareAtPriceInCents ?? null,
          input.stock,
          input.lowStockThreshold,
          input.isActive,
          id
        ]
      );

      const [imageRows] = await connection.query<Array<RowDataPacket & { product_image_id: string; media_asset_id: string }>>(
        `
          SELECT pi.id AS product_image_id, pi.media_asset_id
          FROM product_images pi
          WHERE pi.product_id = ?
          ORDER BY pi.position ASC
          LIMIT 1
        `,
        [id]
      );

      const existingImage = imageRows[0];
      if (existingImage) {
        await connection.execute(
          "UPDATE media_assets SET public_url = ?, alt_text = ?, width = 1200, height = 1500 WHERE id = ?",
          [input.imageUrl, input.imageAlt, existingImage.media_asset_id]
        );
      } else {
        const mediaAssetId = randomUUID();
        await insertMedia(connection, {
          mediaAssetId,
          storageKey: `admin-products/${id}/${mediaAssetId}`,
          url: input.imageUrl,
          alt: input.imageAlt
        });
        await connection.execute("INSERT INTO product_images (id, product_id, media_asset_id, position) VALUES (?, ?, ?, 0)", [
          randomUUID(),
          id,
          mediaAssetId
        ]);
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return assertFound(await this.findAnyProductById(id), "PRODUCT_NOT_FOUND", "Product not found.");
  }

  async deleteProduct(id: string): Promise<void> {
    await this.ensureSeeded();
    await assertFound(await this.findAnyProductById(id), "PRODUCT_NOT_FOUND", "Product not found.");

    const [historyRows] = await this.pool.query<Array<RowDataPacket & { count: number }>>(
      `
        SELECT
          (
            (SELECT COUNT(*) FROM order_items WHERE product_id = ?) +
            (SELECT COUNT(*) FROM whatsapp_request_items WHERE product_id = ?) +
            (SELECT COUNT(*) FROM inventory_movements WHERE product_id = ?)
          ) AS count
      `,
      [id, id, id]
    );

    if ((historyRows[0]?.count ?? 0) > 0) {
      await this.pool.execute("UPDATE products SET is_active = FALSE WHERE id = ?", [id]);
      return;
    }

    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const [mediaRows] = await connection.query<Array<RowDataPacket & { media_asset_id: string }>>(
        "SELECT media_asset_id FROM product_images WHERE product_id = ?",
        [id]
      );
      await connection.execute("DELETE FROM cart_items WHERE product_id = ?", [id]);
      await connection.execute("DELETE FROM product_images WHERE product_id = ?", [id]);
      await connection.execute("DELETE FROM products WHERE id = ?", [id]);
      for (const row of mediaRows) {
        await connection.execute(
          `
            DELETE FROM media_assets
            WHERE id = ?
              AND NOT EXISTS (SELECT 1 FROM product_images WHERE media_asset_id = ?)
          `,
          [row.media_asset_id, row.media_asset_id]
        );
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async createOnlineOrder(input: {
    orderReference: string;
    customer: { name: string; email: string; phone: string };
    priced: PricedCart;
  }): Promise<StoredOrder> {
    await this.ensureSeeded();
    const orderId = randomUUID();
    const userId = await this.upsertCheckoutUser(input.customer);
    const connection = await this.pool.getConnection();

    try {
      await connection.beginTransaction();
      await connection.execute(
        `
          INSERT INTO orders (
            id, user_id, public_reference, status, subtotal_in_cents, discount_in_cents,
            shipping_in_cents, total_in_cents, currency, sales_channel
          ) VALUES (?, ?, ?, 'pending_payment', ?, ?, ?, ?, 'BRL', 'online')
        `,
        [
          orderId,
          userId,
          input.orderReference,
          input.priced.subtotalInCents,
          input.priced.discountInCents,
          input.priced.shippingInCents,
          input.priced.totalInCents
        ]
      );
      await insertOrderItems(connection, orderId, input.priced);
      await connection.execute(
        "INSERT INTO order_status_history (id, order_id, previous_status, new_status, reason) VALUES (?, ?, NULL, 'pending_payment', ?)",
        [randomUUID(), orderId, "Pedido criado no checkout online."]
      );
      await connection.execute(
        `
          INSERT INTO payments (id, order_id, provider, status, amount_in_cents, currency, idempotency_key)
          VALUES (?, ?, 'mercado_pago', 'created', ?, 'BRL', ?)
        `,
        [randomUUID(), orderId, input.priced.totalInCents, `checkout-${input.orderReference}`]
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return assertFound((await this.orders()).find((order) => order.publicReference === input.orderReference), "ORDER_NOT_FOUND", "Order not found.");
  }

  async attachMercadoPagoPreference(orderReference: string, preferenceId: string | null, _checkoutUrl: string): Promise<void> {
    if (!preferenceId) return;
    await this.pool.execute(
      `
        UPDATE payments p
        INNER JOIN orders o ON o.id = p.order_id
        SET p.status = 'pending'
        WHERE o.public_reference = ? AND p.provider = 'mercado_pago'
      `,
      [orderReference]
    );
  }

  async createWhatsappRequest(input: { requestReference: string; priced: PricedCart }): Promise<StoredOrder> {
    await this.ensureSeeded();
    const requestId = randomUUID();
    const connection = await this.pool.getConnection();

    try {
      await connection.beginTransaction();
      await connection.execute(
        `
          INSERT INTO whatsapp_purchase_requests (
            id, public_reference, status, subtotal_in_cents, discount_in_cents, shipping_in_cents, total_in_cents
          ) VALUES (?, ?, 'contact_requested', ?, ?, ?, ?)
        `,
        [
          requestId,
          input.requestReference,
          input.priced.subtotalInCents,
          input.priced.discountInCents,
          input.priced.shippingInCents,
          input.priced.totalInCents
        ]
      );
      await insertWhatsappItems(connection, requestId, input.priced);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return assertFound((await this.orders()).find((order) => order.publicReference === input.requestReference), "ORDER_NOT_FOUND", "Order not found.");
  }

  async orders(): Promise<StoredOrder[]> {
    await this.ensureSeeded();
    const [onlineRows] = await this.pool.query<OrderRow[]>(
      `
        SELECT
          o.id,
          o.public_reference,
          o.status,
          o.subtotal_in_cents,
          o.discount_in_cents,
          o.shipping_in_cents,
          o.total_in_cents,
          o.currency,
          o.sales_channel,
          o.created_at,
          o.updated_at,
          u.name AS customer_name,
          u.email AS customer_email,
          u.phone AS customer_phone
        FROM orders o
        LEFT JOIN users u ON u.id = o.user_id
      `
    );
    const [onlineItems] = await this.pool.query<OrderItemRow[]>(
      `
        SELECT order_id, product_id, product_name, sku, unit_price_in_cents, quantity, subtotal_in_cents, image_url
        FROM order_items
      `
    );
    const [whatsappRows] = await this.pool.query<OrderRow[]>(
      `
        SELECT
          id,
          public_reference,
          status,
          subtotal_in_cents,
          discount_in_cents,
          shipping_in_cents,
          total_in_cents,
          'BRL' AS currency,
          'whatsapp' AS sales_channel,
          created_at,
          updated_at,
          NULL AS customer_name,
          NULL AS customer_email,
          NULL AS customer_phone
        FROM whatsapp_purchase_requests
      `
    );
    const [whatsappItems] = await this.pool.query<OrderItemRow[]>(
      `
        SELECT request_id AS order_id, product_id, product_name, sku, unit_price_in_cents, quantity, subtotal_in_cents, image_url
        FROM whatsapp_request_items
      `
    );

    const itemsByOrder = groupOrderItems([...onlineItems, ...whatsappItems]);
    return [...onlineRows, ...whatsappRows]
      .map((row) => mapOrder(row, itemsByOrder.get(row.id) ?? []))
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  }

  async storefront(): Promise<StorefrontSettings> {
    await this.ensureSeeded();
    const [rows] = await this.pool.query<SettingRow[]>("SELECT setting_value FROM store_settings WHERE setting_key = ? LIMIT 1", [
      storefrontSettingKey
    ]);
    if (!rows[0]) return defaultStorefront;
    const settingValue = typeof rows[0].setting_value === "string" ? JSON.parse(rows[0].setting_value) : rows[0].setting_value;
    return storefrontSettingsSchema.parse({ ...defaultStorefront, ...settingValue });
  }

  async updateStorefront(input: StorefrontSettings): Promise<StorefrontSettings> {
    const settings = storefrontSettingsSchema.parse(input);
    await this.pool.execute(
      `
        INSERT INTO store_settings (id, setting_key, setting_value)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
      `,
      [randomUUID(), storefrontSettingKey, JSON.stringify(settings)]
    );
    return settings;
  }

  private async ensureSeeded() {
    if (this.seeded) return;
    const connection = await this.pool.getConnection();
    try {
      await ensureSchema(connection);
      await connection.beginTransaction();
      await seedCategories(connection);
      await seedDemoProductsOnFirstRun(connection);
      await connection.execute(
        `
          INSERT INTO store_settings (id, setting_key, setting_value)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE setting_key = setting_key
        `,
        [randomUUID(), storefrontSettingKey, JSON.stringify(defaultStorefront)]
      );
      await connection.commit();
      this.seeded = true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  private async findCategory(slug: string) {
    const categories = await this.categories();
    return assertFound(categories.find((category) => category.slug === slug), "CATEGORY_NOT_FOUND", "Category not found.");
  }

  private async findAnyProductById(id: string) {
    const products = await this.products({ includeInactive: true });
    return products.find((product) => product.id === id) ?? null;
  }

  private async assertUniqueProductIdentity(input: { sku: string; slug: string; currentId?: string }) {
    const [rows] = await this.pool.query<Array<RowDataPacket & { count: number }>>(
      `
        SELECT COUNT(*) AS count
        FROM products
        WHERE (sku = ? OR slug = ?) AND (? IS NULL OR id <> ?)
      `,
      [input.sku, input.slug, input.currentId ?? null, input.currentId ?? null]
    );
    if ((rows[0]?.count ?? 0) > 0) {
      const products = await this.products({ includeInactive: true });
      const skuExists = products.some((product) => product.sku === input.sku && product.id !== input.currentId);
      throw new ApiError(skuExists ? 409 : 409, skuExists ? "PRODUCT_SKU_EXISTS" : "PRODUCT_SLUG_EXISTS", skuExists ? "SKU already exists." : "Slug already exists.");
    }
  }

  private async upsertCheckoutUser(customer: { name: string; email: string; phone: string }) {
    const userId = randomUUID();
    await this.pool.execute(
      `
        INSERT INTO users (id, name, email, password_hash, phone)
        VALUES (?, ?, ?, 'checkout_customer_no_password', ?)
        ON DUPLICATE KEY UPDATE name = VALUES(name), phone = VALUES(phone)
      `,
      [userId, customer.name, customer.email, customer.phone]
    );
    const [rows] = await this.pool.query<Array<RowDataPacket & { id: string }>>("SELECT id FROM users WHERE email = ? LIMIT 1", [
      customer.email
    ]);
    return assertFound(rows[0]?.id, "USER_NOT_FOUND", "Customer not found.");
  }
}

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description
  };
}

function mapProduct(row: ProductRow): Product {
  const demoImage = demoProducts.find((product) => product.id === row.id)?.images[0];
  return {
    id: row.id,
    slug: row.slug,
    sku: row.sku,
    name: row.name,
    subtitle: row.subtitle,
    description: row.description,
    category: {
      id: row.category_id,
      slug: row.category_slug,
      name: row.category_name,
      description: row.category_description
    },
    priceInCents: row.price_in_cents,
    compareAtPriceInCents: row.compare_at_price_in_cents,
    stock: row.stock,
    lowStockThreshold: row.low_stock_threshold,
    images: [
      {
        id: row.image_id ?? demoImage?.id ?? randomUUID(),
        url: row.image_url ?? demoImage?.url ?? defaultStorefront.heroImageUrl,
        alt: row.image_alt ?? demoImage?.alt ?? row.name,
        width: row.image_width ?? demoImage?.width ?? 1200,
        height: row.image_height ?? demoImage?.height ?? 1500
      }
    ],
    tags: demoProducts.find((product) => product.id === row.id)?.tags ?? [],
    isActive: Boolean(row.is_active)
  };
}

function mapOrder(row: OrderRow, items: OrderItemRow[]): StoredOrder {
  return {
    id: row.id,
    publicReference: row.public_reference,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    status: row.status,
    salesChannel: row.sales_channel,
    subtotalInCents: row.subtotal_in_cents,
    discountInCents: row.discount_in_cents,
    shippingInCents: row.shipping_in_cents,
    totalInCents: row.total_in_cents,
    currency: row.currency,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    items: items.map((item) => ({
      productId: item.product_id,
      name: item.product_name,
      sku: item.sku,
      quantity: item.quantity,
      unitPriceInCents: item.unit_price_in_cents,
      subtotalInCents: item.subtotal_in_cents,
      imageUrl: item.image_url ?? defaultStorefront.heroImageUrl
    }))
  };
}

function groupOrderItems(rows: OrderItemRow[]) {
  const grouped = new Map<string, OrderItemRow[]>();
  for (const row of rows) {
    grouped.set(row.order_id, [...(grouped.get(row.order_id) ?? []), row]);
  }
  return grouped;
}

async function seedCategories(connection: PoolConnection) {
  for (const category of demoCategories) {
    await connection.execute(
      `
        INSERT INTO categories (id, slug, name, description)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), is_active = TRUE
      `,
      [category.id, category.slug, category.name, category.description]
    );
  }
}

async function seedDemoProductsOnFirstRun(connection: PoolConnection) {
  const [productRows] = await connection.query<Array<RowDataPacket & { count: number }>>("SELECT COUNT(*) AS count FROM products");
  const [settingsRows] = await connection.query<Array<RowDataPacket & { count: number }>>(
    "SELECT COUNT(*) AS count FROM store_settings WHERE setting_key = ?",
    [storefrontSettingKey]
  );

  if ((productRows[0]?.count ?? 0) > 0 || (settingsRows[0]?.count ?? 0) > 0) {
    return;
  }

  for (const product of demoProducts) {
    const mediaAssetId = product.images[0]?.id ?? randomUUID();
    await connection.execute(
      `
        INSERT INTO products (
          id, category_id, slug, sku, name, subtitle, description, price_in_cents,
          compare_at_price_in_cents, stock, low_stock_threshold, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE id = id
      `,
      [
        product.id,
        product.category.id,
        product.slug,
        product.sku,
        product.name,
        product.subtitle,
        product.description,
        product.priceInCents,
        product.compareAtPriceInCents,
        product.stock,
        product.lowStockThreshold,
        product.isActive
      ]
    );
    await insertMedia(connection, {
      mediaAssetId,
      storageKey: `seed-products/${product.id}/${mediaAssetId}`,
      url: product.images[0]?.url ?? defaultStorefront.heroImageUrl,
      alt: product.images[0]?.alt ?? product.name
    });
    const [imageRows] = await connection.query<Array<RowDataPacket & { count: number }>>(
      "SELECT COUNT(*) AS count FROM product_images WHERE product_id = ? AND media_asset_id = ?",
      [product.id, mediaAssetId]
    );
    if ((imageRows[0]?.count ?? 0) === 0) {
      await connection.execute("INSERT INTO product_images (id, product_id, media_asset_id, position) VALUES (?, ?, ?, 0)", [
        randomUUID(),
        product.id,
        mediaAssetId
      ]);
    }
  }
}

async function ensureSchema(connection: PoolConnection) {
  const migration = readFileSync(resolve(projectRoot, "database/migrations/001_initial_schema.sql"), "utf8");
  await connection.query(migration);
  await ensureWhatsappItemImageColumn(connection);
}

async function ensureWhatsappItemImageColumn(connection: PoolConnection) {
  const [rows] = await connection.query<Array<RowDataPacket & { count: number }>>(
    `
      SELECT COUNT(*) AS count
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'whatsapp_request_items'
        AND column_name = 'image_url'
    `
  );

  if ((rows[0]?.count ?? 0) === 0) {
    await connection.query("ALTER TABLE whatsapp_request_items ADD COLUMN image_url VARCHAR(500) AFTER subtotal_in_cents");
  }

  await connection.query(
    `
      UPDATE whatsapp_request_items wri
      LEFT JOIN product_images pi ON pi.id = (
        SELECT pi2.id
        FROM product_images pi2
        WHERE pi2.product_id = wri.product_id
        ORDER BY pi2.position ASC, pi2.created_at ASC
        LIMIT 1
      )
      LEFT JOIN media_assets ma ON ma.id = pi.media_asset_id
      SET wri.image_url = ma.public_url
      WHERE wri.image_url IS NULL
        AND ma.public_url IS NOT NULL
    `
  );
}

async function insertMedia(
  connection: PoolConnection,
  input: { mediaAssetId: string; storageKey: string; url: string; alt: string }
) {
  await connection.execute(
    `
      INSERT INTO media_assets (id, storage_key, public_url, alt_text, width, height, content_type, size_bytes)
      VALUES (?, ?, ?, ?, 1200, 1500, 'image/jpeg', 0)
      ON DUPLICATE KEY UPDATE public_url = VALUES(public_url), alt_text = VALUES(alt_text), width = VALUES(width), height = VALUES(height)
    `,
    [input.mediaAssetId, input.storageKey, input.url, input.alt]
  );
}

async function insertOrderItems(connection: PoolConnection, orderId: string, priced: PricedCart) {
  for (const item of orderItemsFromCart(priced)) {
    await connection.execute(
      `
        INSERT INTO order_items (
          id, order_id, product_id, product_name, sku, unit_price_in_cents, quantity, subtotal_in_cents, image_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [randomUUID(), orderId, item.productId, item.name, item.sku, item.unitPriceInCents, item.quantity, item.subtotalInCents, item.imageUrl]
    );
  }
}

async function insertWhatsappItems(connection: PoolConnection, requestId: string, priced: PricedCart) {
  for (const item of orderItemsFromCart(priced)) {
    await connection.execute(
      `
        INSERT INTO whatsapp_request_items (
          id, request_id, product_id, product_name, sku, unit_price_in_cents, quantity, subtotal_in_cents, image_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [randomUUID(), requestId, item.productId, item.name, item.sku, item.unitPriceInCents, item.quantity, item.subtotalInCents, item.imageUrl]
    );
  }
}
