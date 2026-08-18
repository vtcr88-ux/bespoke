import { readFileSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import mysql, {
  type Pool,
  type PoolConnection,
  type ResultSetHeader,
  type RowDataPacket,
} from "mysql2/promise";
import type {
  AdminCategoryInput,
  AdminOrderArchiveInput,
  AdminOrderUpdate,
  AdminProductInput,
  AdminProductRow,
  Category,
  PaymentStatus,
  PixSettings,
  PricedCart,
  Product,
  StorefrontSettings,
} from "@bespoke/contracts";
import { pixSettingsSchema, storefrontSettingsSchema } from "@bespoke/contracts";
import {
  categories as demoCategories,
  products as demoProducts,
} from "../../data/demo-catalog.js";
import { ApiError, assertFound } from "../../shared/api-error.js";
import {
  defaultStorefront,
  defaultPixSettings,
  normalizeStorefrontSettings,
  orderItemsFromCart,
  slugify,
  type CommerceStoreAdapter,
  type OrdersQuery,
  type PaymentUpdateResult,
  type PixOrderCreationResult,
  type StoredOrder,
  uniqueCategorySlug,
  uniqueSku,
  uniqueSlug,
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
  low_stock_warning_enabled: number | boolean;
  is_active: number | boolean;
  is_featured: number | boolean;
  sort_order: number;
  category_id: string;
  category_slug: string;
  category_name: string;
  category_description: string | null;
  image_id: string | null;
  image_url: string | null;
  image_alt: string | null;
  image_width: number | null;
  image_height: number | null;
  image_content_type: string | null;
  image_size_bytes: number | null;
};

type OrderRow = RowDataPacket & {
  id: string;
  public_reference: string;
  status: StoredOrder["status"];
  subtotal_in_cents: number;
  discount_in_cents: number;
  shipping_in_cents: number | null;
  total_in_cents: number;
  currency: "BRL";
  sales_channel: "online" | "whatsapp";
  payment_status: StoredOrder["paymentStatus"];
  payment_method: StoredOrder["paymentMethod"];
  pix_payload: string | null;
  shipping_mode: StoredOrder["shippingMode"];
  shipping_status: StoredOrder["shippingStatus"];
  contact_status: StoredOrder["contactStatus"];
  shipping_notes: string | null;
  shipping_contacted_at: Date | null;
  shipping_arranged_at: Date | null;
  delivery_method: StoredOrder["deliveryMethod"];
  delivery_address: string | null;
  pickup_instructions: string | null;
  revenue_confirmed_at: Date | null;
  archived_at: Date | null;
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
  setting_value: StorefrontSettings | PixSettings | string;
};

const storefrontSettingKey = "storefront.visual";
const pixSettingKey = "payments.pix.manual";
const projectRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../..",
);

export class MySqlCommerceStore implements CommerceStoreAdapter {
  private seeded = false;

  private constructor(
    private readonly pool: Pool,
    private readonly autoSetup: boolean,
  ) {}

  static fromUrl(databaseUrl: string, options: { autoSetup?: boolean } = {}) {
    return new MySqlCommerceStore(
      mysql.createPool({
        uri: databaseUrl,
        connectionLimit: 10,
        decimalNumbers: true,
        multipleStatements: true,
        timezone: "Z",
      }),
      options.autoSetup ?? true,
    );
  }

  async healthCheck() {
    if (this.autoSetup) {
      await this.pool.query("SELECT 1");
      return;
    }
    await this.pool.query("SELECT 1 FROM schema_migrations LIMIT 1");
  }

  async close() {
    await this.pool.end();
  }

  async categories(): Promise<Category[]> {
    await this.ensureSeeded();
    const [rows] = await this.pool.query<CategoryRow[]>(
      "SELECT id, slug, name, description FROM categories WHERE is_active = TRUE ORDER BY name",
    );
    return rows.map(mapCategory);
  }

  async createCategory(input: AdminCategoryInput): Promise<Category> {
    await this.ensureSeeded();
    const [rows] = await this.pool.query<CategoryRow[]>(
      "SELECT id, slug, name, description FROM categories ORDER BY name",
    );
    const normalizedName = slugify(input.name);
    const existing = rows.find(
      (category) => slugify(category.name) === normalizedName,
    );
    if (existing) {
      await this.pool.execute(
        "UPDATE categories SET is_active = TRUE WHERE id = ?",
        [existing.id],
      );
      return mapCategory(existing);
    }

    const category: Category = {
      id: randomUUID(),
      slug: uniqueCategorySlug(input.name, rows.map(mapCategory)),
      name: input.name,
      description: null,
    };
    await this.pool.execute(
      "INSERT INTO categories (id, slug, name, description) VALUES (?, ?, ?, ?)",
      [category.id, category.slug, category.name, category.description],
    );
    return category;
  }

  async products({
    includeInactive = false,
  }: { includeInactive?: boolean } = {}): Promise<Product[]> {
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
          p.low_stock_warning_enabled,
          p.is_active,
          p.is_featured,
          p.sort_order,
          c.id AS category_id,
          c.slug AS category_slug,
          c.name AS category_name,
          c.description AS category_description,
          ma.id AS image_id,
          ma.public_url AS image_url,
          ma.alt_text AS image_alt,
          ma.width AS image_width,
          ma.height AS image_height,
          ma.content_type AS image_content_type,
          ma.size_bytes AS image_size_bytes
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
        ORDER BY p.sort_order ASC, p.created_at DESC, p.name ASC
      `,
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
      lowStockWarningEnabled: product.lowStockWarningEnabled,
      status: product.isActive ? "active" : "inactive",
      lowStock: product.stock <= product.lowStockThreshold,
      imageUrl: product.images[0]?.url ?? "",
      imageAlt: product.images[0]?.alt ?? product.name,
      imageWidth: product.images[0]?.width,
      imageHeight: product.images[0]?.height,
      imageContentType: product.images[0]?.contentType,
      imageSizeBytes: product.images[0]?.sizeBytes,
      isFeatured: product.isFeatured,
      sortOrder: product.sortOrder,
    }));
  }

  async createProduct(input: AdminProductInput): Promise<Product> {
    await this.ensureSeeded();
    const category = await this.findCategory(input.categorySlug);
    const products = await this.products({ includeInactive: true });
    const slug = input.slug ?? uniqueSlug(input.name, products);
    const sku = input.sku ?? uniqueSku(input.name, products);
    await this.assertUniqueProductIdentity({ sku, slug });

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
            compare_at_price_in_cents, stock, low_stock_threshold, low_stock_warning_enabled,
            is_active, is_featured, sort_order
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          productId,
          category.id,
          slug,
          sku,
          input.name,
          input.subtitle ?? null,
          input.description,
          input.priceInCents,
          input.compareAtPriceInCents ?? null,
          input.stock,
          input.lowStockThreshold,
          input.lowStockWarningEnabled,
          input.isActive,
          input.isFeatured,
          input.sortOrder,
        ],
      );
      await insertMedia(connection, {
        mediaAssetId,
        storageKey: `admin-products/${productId}/${mediaAssetId}`,
        url: input.imageUrl,
        alt: input.imageAlt,
        width: input.imageWidth,
        height: input.imageHeight,
        contentType: input.imageContentType,
        sizeBytes: input.imageSizeBytes,
      });
      await connection.execute(
        "INSERT INTO product_images (id, product_id, media_asset_id, position) VALUES (?, ?, ?, 0)",
        [productImageId, productId, mediaAssetId],
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return assertFound(
      await this.findAnyProductById(productId),
      "PRODUCT_NOT_FOUND",
      "Product not found.",
    );
  }

  async updateProduct(id: string, input: AdminProductInput): Promise<Product> {
    await this.ensureSeeded();
    const existing = assertFound(
      await this.findAnyProductById(id),
      "PRODUCT_NOT_FOUND",
      "Product not found.",
    );
    const category = await this.findCategory(input.categorySlug);
    const slug = input.slug ?? existing.slug;
    const sku = input.sku ?? existing.sku;
    await this.assertUniqueProductIdentity({
      sku,
      slug,
      currentId: id,
    });

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
            low_stock_warning_enabled = ?,
            is_active = ?,
            is_featured = ?,
            sort_order = ?
          WHERE id = ?
        `,
        [
          category.id,
          slug,
          sku,
          input.name,
          input.subtitle ?? null,
          input.description,
          input.priceInCents,
          input.compareAtPriceInCents ?? null,
          input.stock,
          input.lowStockThreshold,
          input.lowStockWarningEnabled,
          input.isActive,
          input.isFeatured,
          input.sortOrder,
          id,
        ],
      );

      const [imageRows] = await connection.query<
        Array<
          RowDataPacket & { product_image_id: string; media_asset_id: string }
        >
      >(
        `
          SELECT pi.id AS product_image_id, pi.media_asset_id
          FROM product_images pi
          WHERE pi.product_id = ?
          ORDER BY pi.position ASC
          LIMIT 1
        `,
        [id],
      );

      const existingImage = imageRows[0];
      if (existingImage) {
        await connection.execute(
          `UPDATE media_assets
           SET public_url = ?, alt_text = ?, width = ?, height = ?, content_type = ?, size_bytes = ?
           WHERE id = ?`,
          [
            input.imageUrl,
            input.imageAlt,
            input.imageWidth ?? existing.images[0]?.width ?? 1200,
            input.imageHeight ?? existing.images[0]?.height ?? 1200,
            input.imageContentType ??
              existing.images[0]?.contentType ??
              imageContentTypeFromUrl(input.imageUrl),
            input.imageSizeBytes ?? existing.images[0]?.sizeBytes ?? 0,
            existingImage.media_asset_id,
          ],
        );
      } else {
        const mediaAssetId = randomUUID();
        await insertMedia(connection, {
          mediaAssetId,
          storageKey: `admin-products/${id}/${mediaAssetId}`,
          url: input.imageUrl,
          alt: input.imageAlt,
          width: input.imageWidth,
          height: input.imageHeight,
          contentType: input.imageContentType,
          sizeBytes: input.imageSizeBytes,
        });
        await connection.execute(
          "INSERT INTO product_images (id, product_id, media_asset_id, position) VALUES (?, ?, ?, 0)",
          [randomUUID(), id, mediaAssetId],
        );
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return assertFound(
      await this.findAnyProductById(id),
      "PRODUCT_NOT_FOUND",
      "Product not found.",
    );
  }

  async deleteProduct(id: string): Promise<void> {
    await this.ensureSeeded();
    await assertFound(
      await this.findAnyProductById(id),
      "PRODUCT_NOT_FOUND",
      "Product not found.",
    );

    const [historyRows] = await this.pool.query<
      Array<RowDataPacket & { count: number }>
    >(
      `
        SELECT
          (
            (SELECT COUNT(*) FROM order_items WHERE product_id = ?) +
            (SELECT COUNT(*) FROM whatsapp_request_items WHERE product_id = ?) +
            (SELECT COUNT(*) FROM inventory_movements WHERE product_id = ?)
          ) AS count
      `,
      [id, id, id],
    );

    if ((historyRows[0]?.count ?? 0) > 0) {
      await this.pool.execute(
        "UPDATE products SET is_active = FALSE WHERE id = ?",
        [id],
      );
      return;
    }

    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const [mediaRows] = await connection.query<
        Array<RowDataPacket & { media_asset_id: string }>
      >("SELECT media_asset_id FROM product_images WHERE product_id = ?", [id]);
      await connection.execute("DELETE FROM cart_items WHERE product_id = ?", [
        id,
      ]);
      await connection.execute(
        "DELETE FROM product_images WHERE product_id = ?",
        [id],
      );
      await connection.execute("DELETE FROM products WHERE id = ?", [id]);
      for (const row of mediaRows) {
        await connection.execute(
          `
            DELETE FROM media_assets
            WHERE id = ?
              AND NOT EXISTS (SELECT 1 FROM product_images WHERE media_asset_id = ?)
          `,
          [row.media_asset_id, row.media_asset_id],
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
    checkoutAccessTokenHash: string;
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
            id, user_id, public_reference, checkout_access_token_hash, status,
            subtotal_in_cents, discount_in_cents, shipping_in_cents,
            total_in_cents, currency, sales_channel, shipping_mode,
            shipping_status, contact_status, delivery_method
          ) VALUES (?, ?, ?, ?, 'pending_payment', ?, ?, NULL, ?, 'BRL', 'online',
            'whatsapp_after_payment', 'awaiting_payment', 'not_started', 'undecided')
        `,
        [
          orderId,
          userId,
          input.orderReference,
          input.checkoutAccessTokenHash,
          input.priced.subtotalInCents,
          input.priced.discountInCents,
          input.priced.totalInCents,
        ],
      );
      await insertOrderItems(connection, orderId, input.priced);
      await connection.execute(
        "INSERT INTO order_status_history (id, order_id, previous_status, new_status, reason) VALUES (?, ?, NULL, 'pending_payment', ?)",
        [randomUUID(), orderId, "Pedido criado no checkout online."],
      );
      await connection.execute(
        `
          INSERT INTO payments (id, order_id, provider, status, amount_in_cents, currency, idempotency_key)
          VALUES (?, ?, 'mercado_pago', 'created', ?, 'BRL', ?)
        `,
        [
          randomUUID(),
          orderId,
          input.priced.totalInCents,
          `checkout-${input.orderReference}`,
        ],
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return assertFound(
      (await this.orders()).find(
        (order) => order.publicReference === input.orderReference,
      ),
      "ORDER_NOT_FOUND",
      "Order not found.",
    );
  }

  async createPixOrder(input: {
    orderReference: string;
    operationId: string;
    requestHash: string;
    checkoutAccessTokenHash: string;
    customer: { name: string; email: string; phone: string };
    priced: PricedCart;
    pixPayload: string;
  }): Promise<PixOrderCreationResult> {
    await this.ensureSeeded();
    const orderId = randomUUID();
    const userId = await this.upsertCheckoutUser(input.customer);
    const idempotencyKey = `pix-${input.operationId}`;
    const connection = await this.pool.getConnection();
    let reused = false;

    try {
      await connection.beginTransaction();
      try {
        await connection.execute(
          `
            INSERT INTO idempotency_keys (
              id, idempotency_key, operation, request_hash
            ) VALUES (?, ?, 'pix_manual_checkout', ?)
          `,
          [randomUUID(), idempotencyKey, input.requestHash],
        );
      } catch (error) {
        if (!isDuplicateEntry(error)) throw error;
        const [rows] = await connection.query<
          Array<RowDataPacket & { request_hash: string }>
        >(
          `
            SELECT request_hash
            FROM idempotency_keys
            WHERE idempotency_key = ?
            LIMIT 1
            FOR UPDATE
          `,
          [idempotencyKey],
        );
        if (rows[0]?.request_hash !== input.requestHash) {
          throw new ApiError(
            409,
            "IDEMPOTENCY_KEY_REUSED",
            "Esta tentativa de pagamento ja foi usada para outro carrinho.",
          );
        }
        reused = true;
      }

      if (!reused) {
        await connection.execute(
          `
            INSERT INTO orders (
              id, user_id, public_reference, checkout_access_token_hash, status,
              subtotal_in_cents, discount_in_cents, shipping_in_cents,
              total_in_cents, currency, sales_channel, shipping_mode,
              shipping_status, contact_status, delivery_method
            ) VALUES (?, ?, ?, ?, 'pending_payment', ?, ?, NULL, ?, 'BRL', 'online',
              'whatsapp_after_payment', 'awaiting_payment', 'not_started', 'undecided')
          `,
          [
            orderId,
            userId,
            input.orderReference,
            input.checkoutAccessTokenHash,
            input.priced.subtotalInCents,
            input.priced.discountInCents,
            input.priced.totalInCents,
          ],
        );
        await insertOrderItems(connection, orderId, input.priced);
        await connection.execute(
          "INSERT INTO order_status_history (id, order_id, previous_status, new_status, reason) VALUES (?, ?, NULL, 'pending_payment', ?)",
          [randomUUID(), orderId, "Pedido criado para pagamento via Pix."],
        );
        await connection.execute(
          `
            INSERT INTO payments (
              id, order_id, provider, status, amount_in_cents, currency,
              idempotency_key, pix_payload
            ) VALUES (?, ?, 'pix_manual', 'pending', ?, 'BRL', ?, ?)
          `,
          [
            randomUUID(),
            orderId,
            input.priced.totalInCents,
            idempotencyKey,
            input.pixPayload,
          ],
        );
        await connection.execute(
          `
            UPDATE idempotency_keys
            SET response_hash = ?
            WHERE idempotency_key = ?
          `,
          [
            createHash("sha256").update(input.orderReference).digest("hex"),
            idempotencyKey,
          ],
        );
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return {
      order: assertFound(
        (await this.orders()).find(
          (order) => order.publicReference === input.orderReference,
        ),
        "ORDER_NOT_FOUND",
        "Order not found.",
      ),
      reused,
    };
  }

  async attachMercadoPagoPreference(
    orderReference: string,
    preferenceId: string | null,
    _checkoutUrl: string,
  ): Promise<void> {
    await this.pool.execute(
      `
        UPDATE payments p
        INNER JOIN orders o ON o.id = p.order_id
        SET p.status = 'pending', p.provider_preference_id = ?
        WHERE o.public_reference = ? AND p.provider = 'mercado_pago'
      `,
      [preferenceId, orderReference],
    );
  }

  async createWhatsappRequest(input: {
    requestReference: string;
    priced: PricedCart;
  }): Promise<StoredOrder> {
    await this.ensureSeeded();
    const requestId = randomUUID();
    const connection = await this.pool.getConnection();

    try {
      await connection.beginTransaction();
      await connection.execute(
        `
          INSERT INTO whatsapp_purchase_requests (
            id, public_reference, status, subtotal_in_cents, discount_in_cents, shipping_in_cents, total_in_cents
          ) VALUES (?, ?, 'contact_requested', ?, ?, NULL, ?)
        `,
        [
          requestId,
          input.requestReference,
          input.priced.subtotalInCents,
          input.priced.discountInCents,
          input.priced.totalInCents,
        ],
      );
      await insertWhatsappItems(connection, requestId, input.priced);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return assertFound(
      (await this.orders()).find(
        (order) => order.publicReference === input.requestReference,
      ),
      "ORDER_NOT_FOUND",
      "Order not found.",
    );
  }

  async findCheckoutOrder(
    orderReference: string,
    checkoutAccessTokenHash: string,
  ): Promise<StoredOrder | null> {
    await this.ensureSeeded();
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `
        SELECT id
        FROM orders
        WHERE public_reference = ? AND checkout_access_token_hash = ?
        LIMIT 1
      `,
      [orderReference, checkoutAccessTokenHash],
    );
    if (!rows[0]) return null;
    return (
      (await this.orders()).find(
        (order) => order.publicReference === orderReference,
      ) ?? null
    );
  }

  async processMercadoPagoPayment(input: {
    eventId: string;
    eventType: string;
    providerPaymentId: string;
    orderReference: string;
    status: PaymentStatus;
    amountInCents: number;
  }): Promise<PaymentUpdateResult> {
    await this.ensureSeeded();
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      try {
        await connection.execute(
          `
            INSERT INTO webhook_events (
              id, provider, external_event_id, event_type, processing_status
            ) VALUES (?, 'mercado_pago', ?, ?, 'received')
          `,
          [randomUUID(), input.eventId, input.eventType],
        );
      } catch (error) {
        if (isDuplicateEntry(error)) {
          await connection.rollback();
          return "duplicate";
        }
        throw error;
      }

      const [rows] = await connection.query<
        Array<RowDataPacket & { order_id: string; total_in_cents: number }>
      >(
        `
          SELECT o.id AS order_id, o.total_in_cents
          FROM orders o
          INNER JOIN payments p ON p.order_id = o.id
          WHERE o.public_reference = ? AND p.provider = 'mercado_pago'
          LIMIT 1
          FOR UPDATE
        `,
        [input.orderReference],
      );
      const order = rows[0];
      if (!order || order.total_in_cents !== input.amountInCents) {
        await connection.execute(
          `
            UPDATE webhook_events
            SET processing_status = 'ignored', processed_at = CURRENT_TIMESTAMP,
                error_code = ?
            WHERE provider = 'mercado_pago' AND external_event_id = ?
          `,
          [
            order ? "PAYMENT_AMOUNT_MISMATCH" : "ORDER_NOT_FOUND",
            input.eventId,
          ],
        );
        await connection.commit();
        return "ignored";
      }

      await connection.execute(
        `
          UPDATE payments
          SET provider_payment_id = ?, status = ?
          WHERE order_id = ? AND provider = 'mercado_pago'
        `,
        [input.providerPaymentId, input.status, order.order_id],
      );

      await connection.execute(
        `
          UPDATE orders
          SET
            status = CASE
              WHEN ? = 'approved' AND status = 'pending_payment' THEN 'paid'
              WHEN ? = 'refunded' THEN 'refunded'
              WHEN ? = 'cancelled' THEN 'cancelled'
              ELSE status
            END,
            shipping_status = CASE
              WHEN ? = 'approved' THEN 'awaiting_contact'
              WHEN ? IN ('refunded', 'cancelled') THEN 'cancelled'
              ELSE shipping_status
            END,
            revenue_confirmed_at = CASE
              WHEN ? = 'approved' THEN COALESCE(revenue_confirmed_at, CURRENT_TIMESTAMP)
              WHEN ? IN ('refunded', 'cancelled') THEN NULL
              ELSE revenue_confirmed_at
            END
          WHERE id = ?
        `,
        [
          input.status,
          input.status,
          input.status,
          input.status,
          input.status,
          input.status,
          input.status,
          order.order_id,
        ],
      );
      await connection.execute(
        `
          UPDATE webhook_events
          SET processing_status = 'processed', processed_at = CURRENT_TIMESTAMP,
              error_code = NULL
          WHERE provider = 'mercado_pago' AND external_event_id = ?
        `,
        [input.eventId],
      );
      await connection.commit();
      return "processed";
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async recordWhatsappOpen(
    orderReference: string,
    checkoutAccessTokenHash: string,
  ): Promise<boolean> {
    await this.ensureSeeded();
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const [rows] = await connection.query<
        Array<RowDataPacket & { order_id: string }>
      >(
        `
          SELECT o.id AS order_id
          FROM orders o
          INNER JOIN payments p ON p.order_id = o.id
          WHERE o.public_reference = ?
            AND o.checkout_access_token_hash = ?
            AND p.provider = 'mercado_pago'
            AND p.status = 'approved'
          LIMIT 1
          FOR UPDATE
        `,
        [orderReference, checkoutAccessTokenHash],
      );
      const order = rows[0];
      if (!order) {
        await connection.rollback();
        return false;
      }
      await connection.execute(
        `
          UPDATE orders
          SET
            contact_status = CASE
              WHEN contact_status = 'not_started' THEN 'whatsapp_opened'
              ELSE contact_status
            END,
            whatsapp_opened_at = COALESCE(whatsapp_opened_at, CURRENT_TIMESTAMP)
          WHERE id = ?
        `,
        [order.order_id],
      );
      await connection.execute(
        `
          INSERT INTO order_contact_events (id, order_id, event_type)
          VALUES (?, ?, 'whatsapp_open_attempted')
        `,
        [randomUUID(), order.order_id],
      );
      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async recordPixWhatsappOpen(
    orderReference: string,
    checkoutAccessTokenHash: string,
  ): Promise<boolean> {
    await this.ensureSeeded();
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const [rows] = await connection.query<
        Array<RowDataPacket & { order_id: string }>
      >(
        `
          SELECT o.id AS order_id
          FROM orders o
          INNER JOIN payments p ON p.order_id = o.id
          WHERE o.public_reference = ?
            AND o.checkout_access_token_hash = ?
            AND p.provider = 'pix_manual'
            AND p.status IN ('pending', 'approved')
          LIMIT 1
          FOR UPDATE
        `,
        [orderReference, checkoutAccessTokenHash],
      );
      const order = rows[0];
      if (!order) {
        await connection.rollback();
        return false;
      }
      await connection.execute(
        `
          UPDATE orders
          SET
            contact_status = CASE
              WHEN contact_status = 'not_started' THEN 'whatsapp_opened'
              ELSE contact_status
            END,
            whatsapp_opened_at = COALESCE(whatsapp_opened_at, CURRENT_TIMESTAMP)
          WHERE id = ?
        `,
        [order.order_id],
      );
      await connection.execute(
        `
          INSERT INTO order_contact_events (id, order_id, event_type)
          VALUES (?, ?, 'whatsapp_open_attempted')
        `,
        [randomUUID(), order.order_id],
      );
      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async setPixPaymentStatus(
    orderReference: string,
    status: "approved" | "rejected",
  ): Promise<StoredOrder> {
    await this.ensureSeeded();
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const [rows] = await connection.query<
        Array<
          RowDataPacket & {
            order_id: string;
            order_status: StoredOrder["status"];
            payment_status: PaymentStatus;
          }
        >
      >(
        `
          SELECT
            o.id AS order_id,
            o.status AS order_status,
            p.status AS payment_status
          FROM orders o
          INNER JOIN payments p ON p.order_id = o.id
          WHERE o.public_reference = ? AND p.provider = 'pix_manual'
          LIMIT 1
          FOR UPDATE
        `,
        [orderReference],
      );
      const current = rows[0];
      if (!current) {
        throw new ApiError(
          404,
          "PIX_ORDER_NOT_FOUND",
          "Pedido Pix nao encontrado.",
        );
      }
      if (current.payment_status !== status) {
        if (["approved", "rejected"].includes(current.payment_status)) {
          throw new ApiError(
            409,
            "PIX_PAYMENT_ALREADY_REVIEWED",
            "Este pagamento Pix ja foi revisado.",
          );
        }
        const nextOrderStatus = status === "approved" ? "paid" : "cancelled";
        await connection.execute(
          `
            UPDATE payments
            SET status = ?, manual_reviewed_at = CURRENT_TIMESTAMP
            WHERE order_id = ? AND provider = 'pix_manual'
          `,
          [status, current.order_id],
        );
        await connection.execute(
          `
            UPDATE orders
            SET
              status = ?,
              shipping_status = ?,
              revenue_confirmed_at = CASE
                WHEN ? = 'approved' THEN COALESCE(revenue_confirmed_at, CURRENT_TIMESTAMP)
                ELSE NULL
              END
            WHERE id = ?
          `,
          [
            nextOrderStatus,
            status === "approved" ? "awaiting_contact" : "cancelled",
            status,
            current.order_id,
          ],
        );
        await connection.execute(
          `
            INSERT INTO order_status_history (
              id, order_id, previous_status, new_status, reason
            ) VALUES (?, ?, ?, ?, ?)
          `,
          [
            randomUUID(),
            current.order_id,
            current.order_status,
            nextOrderStatus,
            status === "approved"
              ? "Pagamento Pix confirmado manualmente no painel."
              : "Pagamento Pix rejeitado manualmente no painel.",
          ],
        );
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return assertFound(
      (await this.orders()).find(
        (order) => order.publicReference === orderReference,
      ),
      "ORDER_NOT_FOUND",
      "Order not found.",
    );
  }

  async updateOrder(
    orderReference: string,
    input: AdminOrderUpdate,
  ): Promise<StoredOrder> {
    await this.ensureSeeded();
    const [result] = await this.pool.execute<ResultSetHeader>(
      `
        UPDATE orders
        SET
          shipping_status = ?,
          contact_status = ?,
          shipping_in_cents = ?,
          shipping_notes = ?,
          delivery_method = ?,
          delivery_address = ?,
          pickup_instructions = ?,
          shipping_contacted_at = CASE
            WHEN ? = 'contact_started' THEN COALESCE(shipping_contacted_at, CURRENT_TIMESTAMP)
            ELSE shipping_contacted_at
          END,
          shipping_arranged_at = CASE
            WHEN ? = 'arranged' THEN COALESCE(shipping_arranged_at, CURRENT_TIMESTAMP)
            ELSE shipping_arranged_at
          END
        WHERE public_reference = ? AND sales_channel = 'online'
      `,
      [
        input.shippingStatus,
        input.contactStatus,
        input.shippingAmountInCents,
        input.shippingNotes,
        input.deliveryMethod,
        input.deliveryAddress,
        input.pickupInstructions,
        input.contactStatus,
        input.shippingStatus,
        orderReference,
      ],
    );
    if (result.affectedRows === 0) {
      throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found.");
    }
    return assertFound(
      (await this.orders()).find(
        (order) => order.publicReference === orderReference,
      ),
      "ORDER_NOT_FOUND",
      "Order not found.",
    );
  }

  async setWhatsappRevenueConfirmed(
    orderReference: string,
    confirmed: boolean,
  ): Promise<StoredOrder> {
    await this.ensureSeeded();
    const existing = assertFound(
      (await this.orders()).find(
        (order) =>
          order.publicReference === orderReference &&
          order.salesChannel === "whatsapp",
      ),
      "ORDER_NOT_FOUND",
      "Order not found.",
    );
    if (Boolean(existing.revenueConfirmedAt) === confirmed) return existing;
    await this.pool.execute<ResultSetHeader>(
      `
        UPDATE whatsapp_purchase_requests
        SET revenue_confirmed_at = CASE
          WHEN ? THEN COALESCE(revenue_confirmed_at, CURRENT_TIMESTAMP)
          ELSE NULL
        END
        WHERE public_reference = ?
      `,
      [confirmed, orderReference],
    );
    return assertFound(
      (await this.orders()).find(
        (order) => order.publicReference === orderReference,
      ),
      "ORDER_NOT_FOUND",
      "Order not found.",
    );
  }

  async setOrdersArchived(input: AdminOrderArchiveInput): Promise<number> {
    await this.ensureSeeded();
    const connection = await this.pool.getConnection();
    let changed = 0;
    try {
      await connection.beginTransaction();
      for (const reference of input.references) {
        const archivedAt = input.archived ? new Date() : null;
        const expectedNull = input.archived ? 1 : 0;
        const [online] = await connection.execute<ResultSetHeader>(
          `UPDATE orders SET archived_at = ?
           WHERE public_reference = ? AND (archived_at IS NULL) = ?`,
          [archivedAt, reference, expectedNull],
        );
        const [whatsapp] = await connection.execute<ResultSetHeader>(
          `UPDATE whatsapp_purchase_requests SET archived_at = ?
           WHERE public_reference = ? AND (archived_at IS NULL) = ?`,
          [archivedAt, reference, expectedNull],
        );
        changed += online.affectedRows + whatsapp.affectedRows;
      }
      await connection.commit();
      return changed;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async orders(query: OrdersQuery = {}): Promise<StoredOrder[]> {
    await this.ensureSeeded();
    const archiveCondition = query.archived
      ? "archived_at IS NOT NULL"
      : "archived_at IS NULL";
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
          p.provider AS payment_method,
          p.status AS payment_status,
          p.pix_payload,
          o.shipping_mode,
          o.shipping_status,
          o.contact_status,
          o.shipping_notes,
          o.shipping_contacted_at,
          o.shipping_arranged_at,
          o.delivery_method,
          o.delivery_address,
          o.pickup_instructions,
          o.revenue_confirmed_at,
          o.archived_at,
          o.created_at,
          o.updated_at,
          u.name AS customer_name,
          u.email AS customer_email,
          u.phone AS customer_phone
        FROM orders o
        LEFT JOIN payments p ON p.order_id = o.id
        LEFT JOIN users u ON u.id = o.user_id
        WHERE o.${archiveCondition}
      `,
    );
    const [onlineItems] = await this.pool.query<OrderItemRow[]>(
      `
        SELECT order_id, product_id, product_name, sku, unit_price_in_cents, quantity, subtotal_in_cents, image_url
        FROM order_items
      `,
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
          NULL AS payment_method,
          NULL AS payment_status,
          NULL AS pix_payload,
          'manual' AS shipping_mode,
          'awaiting_contact' AS shipping_status,
          'whatsapp_opened' AS contact_status,
          NULL AS shipping_notes,
          NULL AS shipping_contacted_at,
          NULL AS shipping_arranged_at,
          'undecided' AS delivery_method,
          NULL AS delivery_address,
          NULL AS pickup_instructions,
          revenue_confirmed_at,
          archived_at,
          created_at,
          updated_at,
          NULL AS customer_name,
          NULL AS customer_email,
          NULL AS customer_phone
        FROM whatsapp_purchase_requests
        WHERE ${archiveCondition}
      `,
    );
    const [whatsappItems] = await this.pool.query<OrderItemRow[]>(
      `
        SELECT request_id AS order_id, product_id, product_name, sku, unit_price_in_cents, quantity, subtotal_in_cents, image_url
        FROM whatsapp_request_items
      `,
    );

    const itemsByOrder = groupOrderItems([...onlineItems, ...whatsappItems]);
    return [...onlineRows, ...whatsappRows]
      .map((row) => mapOrder(row, itemsByOrder.get(row.id) ?? []))
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  }

  async storefront(): Promise<StorefrontSettings> {
    await this.ensureSeeded();
    const [rows] = await this.pool.query<SettingRow[]>(
      "SELECT setting_value FROM store_settings WHERE setting_key = ? LIMIT 1",
      [storefrontSettingKey],
    );
    if (!rows[0]) return defaultStorefront;
    const settingValue =
      typeof rows[0].setting_value === "string"
        ? JSON.parse(rows[0].setting_value)
        : rows[0].setting_value;
    return normalizeStorefrontSettings(
      settingValue as Partial<StorefrontSettings>,
    );
  }

  async updateStorefront(
    input: StorefrontSettings,
  ): Promise<StorefrontSettings> {
    const settings = storefrontSettingsSchema.parse(input);
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const [rows] = await connection.query<SettingRow[]>(
        `
          SELECT setting_value
          FROM store_settings
          WHERE setting_key = ?
          LIMIT 1
          FOR UPDATE
        `,
        [storefrontSettingKey],
      );
      if (rows[0]) {
        const storedValue =
          typeof rows[0].setting_value === "string"
            ? JSON.parse(rows[0].setting_value)
            : rows[0].setting_value;
        const current = normalizeStorefrontSettings(
          storedValue as Partial<StorefrontSettings>,
        );
        if (JSON.stringify(current) === JSON.stringify(settings)) {
          await connection.commit();
          return settings;
        }
        await connection.execute(
          `
            INSERT INTO storefront_setting_revisions (
              id,
              setting_key,
              setting_value,
              revision_source
            )
            VALUES (?, ?, ?, ?)
          `,
          [
            randomUUID(),
            storefrontSettingKey,
            JSON.stringify(current),
            "before_update",
          ],
        );
      }
      await connection.execute(
        `
          INSERT INTO store_settings (id, setting_key, setting_value)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
        `,
        [randomUUID(), storefrontSettingKey, JSON.stringify(settings)],
      );
      await connection.commit();
      return settings;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async pixSettings(): Promise<PixSettings> {
    await this.ensureSeeded();
    const [rows] = await this.pool.query<SettingRow[]>(
      "SELECT setting_value FROM store_settings WHERE setting_key = ? LIMIT 1",
      [pixSettingKey],
    );
    if (!rows[0]) return defaultPixSettings;
    const settingValue =
      typeof rows[0].setting_value === "string"
        ? JSON.parse(rows[0].setting_value)
        : rows[0].setting_value;
    return pixSettingsSchema.parse(settingValue);
  }

  async updatePixSettings(input: PixSettings): Promise<PixSettings> {
    const settings = pixSettingsSchema.parse(input);
    await this.pool.execute(
      `
        INSERT INTO store_settings (id, setting_key, setting_value)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
      `,
      [randomUUID(), pixSettingKey, JSON.stringify(settings)],
    );
    return settings;
  }

  private async ensureSeeded() {
    if (this.seeded) return;
    if (!this.autoSetup) {
      await this.pool.query("SELECT 1 FROM schema_migrations LIMIT 1");
      this.seeded = true;
      return;
    }
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
        [randomUUID(), storefrontSettingKey, JSON.stringify(defaultStorefront)],
      );
      await connection.execute(
        `
          INSERT INTO store_settings (id, setting_key, setting_value)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE setting_key = setting_key
        `,
        [randomUUID(), pixSettingKey, JSON.stringify(defaultPixSettings)],
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
    return assertFound(
      categories.find((category) => category.slug === slug),
      "CATEGORY_NOT_FOUND",
      "Category not found.",
    );
  }

  private async findAnyProductById(id: string) {
    const products = await this.products({ includeInactive: true });
    return products.find((product) => product.id === id) ?? null;
  }

  private async assertUniqueProductIdentity(input: {
    sku: string;
    slug: string;
    currentId?: string;
  }) {
    const [rows] = await this.pool.query<
      Array<RowDataPacket & { count: number }>
    >(
      `
        SELECT COUNT(*) AS count
        FROM products
        WHERE (sku = ? OR slug = ?) AND (? IS NULL OR id <> ?)
      `,
      [input.sku, input.slug, input.currentId ?? null, input.currentId ?? null],
    );
    if ((rows[0]?.count ?? 0) > 0) {
      const products = await this.products({ includeInactive: true });
      const skuExists = products.some(
        (product) =>
          product.sku === input.sku && product.id !== input.currentId,
      );
      throw new ApiError(
        skuExists ? 409 : 409,
        skuExists ? "PRODUCT_SKU_EXISTS" : "PRODUCT_SLUG_EXISTS",
        skuExists ? "SKU already exists." : "Slug already exists.",
      );
    }
  }

  private async upsertCheckoutUser(customer: {
    name: string;
    email: string;
    phone: string;
  }) {
    const userId = randomUUID();
    await this.pool.execute(
      `
        INSERT INTO users (id, name, email, password_hash, phone)
        VALUES (?, ?, ?, 'checkout_customer_no_password', ?)
        ON DUPLICATE KEY UPDATE name = VALUES(name), phone = VALUES(phone)
      `,
      [userId, customer.name, customer.email, customer.phone],
    );
    const [rows] = await this.pool.query<Array<RowDataPacket & { id: string }>>(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [customer.email],
    );
    return assertFound(rows[0]?.id, "USER_NOT_FOUND", "Customer not found.");
  }
}

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
  };
}

function mapProduct(row: ProductRow): Product {
  if (
    !row.image_id ||
    !row.image_url ||
    !row.image_alt ||
    !row.image_width ||
    !row.image_height
  ) {
    throw new ApiError(
      500,
      "PRODUCT_IMAGE_MISSING",
      `Product ${row.id} does not have a valid image.`,
    );
  }

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
      description: row.category_description,
    },
    priceInCents: row.price_in_cents,
    compareAtPriceInCents: row.compare_at_price_in_cents,
    stock: row.stock,
    lowStockThreshold: row.low_stock_threshold,
    lowStockWarningEnabled: Boolean(row.low_stock_warning_enabled),
    images: [
      {
        id: row.image_id,
        url: row.image_url,
        alt: row.image_alt,
        width: row.image_width,
        height: row.image_height,
        contentType:
          row.image_content_type === "image/png" ||
          row.image_content_type === "image/jpeg" ||
          row.image_content_type === "image/webp"
            ? row.image_content_type
            : undefined,
        sizeBytes: row.image_size_bytes ?? undefined,
      },
    ],
    tags: [],
    isActive: Boolean(row.is_active),
    isFeatured: Boolean(row.is_featured),
    sortOrder: row.sort_order,
  };
}

function mapOrder(row: OrderRow, items: OrderItemRow[]): StoredOrder {
  const missingImageItem = items.find((item) => !item.image_url);
  if (missingImageItem) {
    throw new ApiError(
      500,
      "ORDER_ITEM_IMAGE_MISSING",
      `Order item ${missingImageItem.id} does not have an image snapshot.`,
    );
  }

  return {
    id: row.id,
    publicReference: row.public_reference,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    status: row.status,
    salesChannel: row.sales_channel,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    shippingMode: row.shipping_mode,
    shippingStatus: row.shipping_status,
    contactStatus: row.contact_status,
    subtotalInCents: row.subtotal_in_cents,
    discountInCents: row.discount_in_cents,
    shippingAmountInCents: row.shipping_in_cents,
    totalInCents: row.total_in_cents,
    currency: row.currency,
    shippingNotes: row.shipping_notes,
    deliveryMethod: row.delivery_method,
    deliveryAddress: row.delivery_address,
    pickupInstructions: row.pickup_instructions,
    shippingContactedAt: row.shipping_contacted_at?.toISOString() ?? null,
    shippingArrangedAt: row.shipping_arranged_at?.toISOString() ?? null,
    revenueConfirmedAt: row.revenue_confirmed_at?.toISOString() ?? null,
    archivedAt: row.archived_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    pixPayload: row.pix_payload,
    items: items.map((item) => ({
      productId: item.product_id,
      name: item.product_name,
      sku: item.sku,
      quantity: item.quantity,
      unitPriceInCents: item.unit_price_in_cents,
      subtotalInCents: item.subtotal_in_cents,
      imageUrl: item.image_url!,
    })),
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
        ON DUPLICATE KEY UPDATE slug = VALUES(slug), name = VALUES(name), description = VALUES(description), is_active = TRUE
      `,
      [category.id, category.slug, category.name, category.description],
    );
  }
}

async function seedDemoProductsOnFirstRun(connection: PoolConnection) {
  const [productRows] = await connection.query<
    Array<RowDataPacket & { count: number }>
  >("SELECT COUNT(*) AS count FROM products");
  const [settingsRows] = await connection.query<
    Array<RowDataPacket & { count: number }>
  >("SELECT COUNT(*) AS count FROM store_settings WHERE setting_key = ?", [
    storefrontSettingKey,
  ]);

  if ((productRows[0]?.count ?? 0) > 0 || (settingsRows[0]?.count ?? 0) > 0) {
    return;
  }

  for (const product of demoProducts) {
    const image = product.images[0];
    if (!image) {
      throw new ApiError(
        500,
        "SEED_PRODUCT_IMAGE_MISSING",
        `Seed product ${product.id} does not have an image.`,
      );
    }

    const mediaAssetId = image.id;
    await connection.execute(
      `
        INSERT INTO products (
          id, category_id, slug, sku, name, subtitle, description, price_in_cents,
          compare_at_price_in_cents, stock, low_stock_threshold, low_stock_warning_enabled,
          is_active, is_featured, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        product.lowStockWarningEnabled,
        product.isActive,
        product.isFeatured,
        product.sortOrder,
      ],
    );
    await insertMedia(connection, {
      mediaAssetId,
      storageKey: `seed-products/${product.id}/${mediaAssetId}`,
      url: image.url,
      alt: image.alt,
    });
    const [imageRows] = await connection.query<
      Array<RowDataPacket & { count: number }>
    >(
      "SELECT COUNT(*) AS count FROM product_images WHERE product_id = ? AND media_asset_id = ?",
      [product.id, mediaAssetId],
    );
    if ((imageRows[0]?.count ?? 0) === 0) {
      await connection.execute(
        "INSERT INTO product_images (id, product_id, media_asset_id, position) VALUES (?, ?, ?, 0)",
        [randomUUID(), product.id, mediaAssetId],
      );
    }
  }
}

async function ensureSchema(connection: PoolConnection) {
  const initialMigration = readFileSync(
    resolve(projectRoot, "database/migrations/001_initial_schema.sql"),
    "utf8",
  );
  await connection.query(initialMigration);
  await connection.query(
    `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        migration_name VARCHAR(160) PRIMARY KEY,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `,
  );
  await connection.execute(
    "INSERT IGNORE INTO schema_migrations (migration_name) VALUES (?)",
    ["001_initial_schema.sql"],
  );
  await applyMigration(connection, "002_product_merchandising.sql");
  await applyMigration(connection, "003_backfill_product_sort_order.sql");
  await applyMigration(
    connection,
    "004_manual_shipping_and_payment_confirmation.sql",
  );
  await applyMigration(
    connection,
    "005_replace_default_product_categories.sql",
  );
  await applyMigration(connection, "006_storefront_setting_revisions.sql");
  await applyMigration(connection, "007_product_low_stock_warning.sql");
  await applyMigration(connection, "008_order_reporting_and_archiving.sql");
  await applyMigration(connection, "009_manual_pix_payment.sql");
  await ensureWhatsappItemImageColumn(connection);
}

async function applyMigration(
  connection: PoolConnection,
  migrationName: string,
) {
  const [rows] = await connection.query<
    Array<RowDataPacket & { count: number }>
  >(
    "SELECT COUNT(*) AS count FROM schema_migrations WHERE migration_name = ?",
    [migrationName],
  );
  if ((rows[0]?.count ?? 0) > 0) return;

  const migration = readFileSync(
    resolve(projectRoot, "database/migrations", migrationName),
    "utf8",
  );
  await connection.query(migration);
  await connection.execute(
    "INSERT INTO schema_migrations (migration_name) VALUES (?)",
    [migrationName],
  );
}

async function ensureWhatsappItemImageColumn(connection: PoolConnection) {
  const [rows] = await connection.query<
    Array<RowDataPacket & { count: number }>
  >(
    `
      SELECT COUNT(*) AS count
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'whatsapp_request_items'
        AND column_name = 'image_url'
    `,
  );

  if ((rows[0]?.count ?? 0) === 0) {
    await connection.query(
      "ALTER TABLE whatsapp_request_items ADD COLUMN image_url VARCHAR(500) AFTER subtotal_in_cents",
    );
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
    `,
  );
}

function isDuplicateEntry(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ER_DUP_ENTRY"
  );
}

async function insertMedia(
  connection: PoolConnection,
  input: {
    mediaAssetId: string;
    storageKey: string;
    url: string;
    alt: string;
    width?: number;
    height?: number;
    contentType?: "image/png" | "image/jpeg" | "image/webp";
    sizeBytes?: number;
  },
) {
  await connection.execute(
    `
      INSERT INTO media_assets (id, storage_key, public_url, alt_text, width, height, content_type, size_bytes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        public_url = VALUES(public_url),
        alt_text = VALUES(alt_text),
        width = VALUES(width),
        height = VALUES(height),
        content_type = VALUES(content_type),
        size_bytes = VALUES(size_bytes)
    `,
    [
      input.mediaAssetId,
      input.storageKey,
      input.url,
      input.alt,
      input.width ?? 1200,
      input.height ?? 1200,
      input.contentType ?? imageContentTypeFromUrl(input.url),
      input.sizeBytes ?? 0,
    ],
  );
}

function imageContentTypeFromUrl(url: string) {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    if (pathname.endsWith(".png")) return "image/png";
    if (pathname.endsWith(".webp")) return "image/webp";
  } catch {
    // External legacy URLs may not be parseable; JPEG is the safest fallback.
  }
  return "image/jpeg";
}

async function insertOrderItems(
  connection: PoolConnection,
  orderId: string,
  priced: PricedCart,
) {
  for (const item of orderItemsFromCart(priced)) {
    await connection.execute(
      `
        INSERT INTO order_items (
          id, order_id, product_id, product_name, sku, unit_price_in_cents, quantity, subtotal_in_cents, image_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        randomUUID(),
        orderId,
        item.productId,
        item.name,
        item.sku,
        item.unitPriceInCents,
        item.quantity,
        item.subtotalInCents,
        item.imageUrl,
      ],
    );
  }
}

async function insertWhatsappItems(
  connection: PoolConnection,
  requestId: string,
  priced: PricedCart,
) {
  for (const item of orderItemsFromCart(priced)) {
    await connection.execute(
      `
        INSERT INTO whatsapp_request_items (
          id, request_id, product_id, product_name, sku, unit_price_in_cents, quantity, subtotal_in_cents, image_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        randomUUID(),
        requestId,
        item.productId,
        item.name,
        item.sku,
        item.unitPriceInCents,
        item.quantity,
        item.subtotalInCents,
        item.imageUrl,
      ],
    );
  }
}
