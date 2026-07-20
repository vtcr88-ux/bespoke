import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import type {
  AdminProductInput,
  AdminProductRow,
  Category,
  OrderSummary,
  PricedCart,
  Product,
  StorefrontSettings
} from "@bespoke/contracts";
import { storefrontSettingsSchema } from "@bespoke/contracts";
import { categories as demoCategories, products as demoProducts } from "../../data/demo-catalog.js";
import { ApiError, assertFound } from "../../shared/api-error.js";

export type StoredOrder = OrderSummary & {
  mercadoPagoPreferenceId?: string | null;
  checkoutUrl?: string | null;
};

type CommerceState = {
  categories: Category[];
  products: Product[];
  orders: StoredOrder[];
  storefront: StorefrontSettings;
};

type MaybePromise<T> = T | Promise<T>;

export interface CommerceStoreAdapter {
  categories(): MaybePromise<Category[]>;
  products(options?: { includeInactive?: boolean }): MaybePromise<Product[]>;
  findProductById(id: string): MaybePromise<Product | null>;
  findProductBySlug(slug: string): MaybePromise<Product | null>;
  adminProducts(): MaybePromise<AdminProductRow[]>;
  createProduct(input: AdminProductInput): MaybePromise<Product>;
  updateProduct(id: string, input: AdminProductInput): MaybePromise<Product>;
  deleteProduct(id: string): MaybePromise<void>;
  createOnlineOrder(input: {
    orderReference: string;
    customer: { name: string; email: string; phone: string };
    priced: PricedCart;
  }): MaybePromise<StoredOrder>;
  attachMercadoPagoPreference(orderReference: string, preferenceId: string | null, checkoutUrl: string): MaybePromise<void>;
  createWhatsappRequest(input: { requestReference: string; priced: PricedCart }): MaybePromise<StoredOrder>;
  orders(): MaybePromise<StoredOrder[]>;
  storefront(): MaybePromise<StorefrontSettings>;
  updateStorefront(input: StorefrontSettings): MaybePromise<StorefrontSettings>;
}

export const defaultStorefront: StorefrontSettings = {
  brandName: "Bespoke",
  logoUrl: "",
  heroImageUrl: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1800&q=82",
  heroEyebrow: "Loja Bespoke",
  heroTitle: "Bespoke",
  heroSubtitle: "Uma experiencia exclusiva, sofisticada e cuidadosamente selecionada para quem valoriza presenca, beleza e atendimento impecavel.",
  heroPrimaryCtaLabel: "Explorar catalogo",
  heroSecondaryCtaLabel: "Atendimento exclusivo",
  heroHeight: "balanced",
  featuredEyebrow: "Selecao inicial",
  featuredTitle: "Produtos em destaque",
  featuredLinkLabel: "Ver todos",
  homeLayout: "editorial",
  productCardStyle: "boutique",
  imageFit: "contain",
  footerSlogan: "Curadoria reservada, cuidado impecavel e escolhas feitas para poucos.",
  footerPrivacyLabel: "Privacidade",
  footerCatalogLabel: "Catalogo",
  footerSupportLabel: "Suporte",
  primaryColor: "#090907",
  accentColor: "#c9a76d",
  backgroundColor: "#ffffff"
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function initialState(): CommerceState {
  return {
    categories: clone(demoCategories),
    products: clone(demoProducts),
    orders: [],
    storefront: defaultStorefront
  };
}

function normalizeState(value: Partial<CommerceState> | null): CommerceState {
  const state = initialState();
  return {
    categories: value?.categories?.length ? value.categories : state.categories,
    products: value?.products?.length ? value.products : state.products,
    orders: value?.orders ?? state.orders,
    storefront: storefrontSettingsSchema.parse({ ...state.storefront, ...value?.storefront })
  };
}

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

export function uniqueSlug(base: string, products: Product[], currentId?: string) {
  const root = slugify(base) || "produto";
  let candidate = root;
  let index = 2;
  while (products.some((product) => product.slug === candidate && product.id !== currentId)) {
    candidate = `${root}-${index}`;
    index += 1;
  }
  return candidate;
}

export function orderItemsFromCart(priced: PricedCart): OrderSummary["items"] {
  return priced.lines.map((line) => ({
    productId: line.productId,
    name: line.name,
    sku: line.sku,
    quantity: line.quantity,
    unitPriceInCents: line.unitPriceInCents,
    subtotalInCents: line.subtotalInCents,
    imageUrl: line.imageUrl
  }));
}

export class CommerceStore implements CommerceStoreAdapter {
  private constructor(private state: CommerceState, private readonly persist?: (state: CommerceState) => void) {}

  static memory() {
    return new CommerceStore(initialState());
  }

  static fromFile(filePath: string) {
    const absolutePath = resolve(filePath);
    const state = existsSync(absolutePath)
      ? normalizeState(JSON.parse(readFileSync(absolutePath, "utf8")) as Partial<CommerceState>)
      : initialState();

    return new CommerceStore(state, (nextState) => {
      mkdirSync(dirname(absolutePath), { recursive: true });
      writeFileSync(absolutePath, JSON.stringify(nextState, null, 2), "utf8");
    });
  }

  categories() {
    return this.state.categories;
  }

  products({ includeInactive = false }: { includeInactive?: boolean } = {}) {
    return includeInactive ? this.state.products : this.state.products.filter((product) => product.isActive);
  }

  findProductById(id: string) {
    return this.state.products.find((product) => product.id === id && product.isActive) ?? null;
  }

  findProductBySlug(slug: string) {
    return this.state.products.find((product) => product.slug === slug && product.isActive) ?? null;
  }

  adminProducts(): AdminProductRow[] {
    return this.state.products.map((product) => ({
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

  createProduct(input: AdminProductInput) {
    const category = this.findCategory(input.categorySlug);
    const slug = input.slug ?? uniqueSlug(input.name, this.state.products);
    this.assertUniqueProductIdentity({ sku: input.sku, slug });

    const product: Product = {
      id: randomUUID(),
      slug,
      sku: input.sku,
      name: input.name,
      subtitle: input.subtitle ?? null,
      description: input.description,
      category,
      priceInCents: input.priceInCents,
      compareAtPriceInCents: input.compareAtPriceInCents ?? null,
      stock: input.stock,
      lowStockThreshold: input.lowStockThreshold,
      images: [
        {
          id: randomUUID(),
          url: input.imageUrl,
          alt: input.imageAlt,
          width: 1200,
          height: 1500
        }
      ],
      tags: [],
      isActive: input.isActive
    };

    this.state.products = [product, ...this.state.products];
    this.save();
    return product;
  }

  updateProduct(id: string, input: AdminProductInput) {
    const existing = assertFound(
      this.state.products.find((product) => product.id === id),
      "PRODUCT_NOT_FOUND",
      "Product not found."
    );
    const category = this.findCategory(input.categorySlug);
    const slug = input.slug ?? uniqueSlug(input.name, this.state.products, id);
    this.assertUniqueProductIdentity({ sku: input.sku, slug, currentId: id });

    const product: Product = {
      ...existing,
      slug,
      sku: input.sku,
      name: input.name,
      subtitle: input.subtitle ?? null,
      description: input.description,
      category,
      priceInCents: input.priceInCents,
      compareAtPriceInCents: input.compareAtPriceInCents ?? null,
      stock: input.stock,
      lowStockThreshold: input.lowStockThreshold,
      images: [
        {
          id: existing.images[0]?.id ?? randomUUID(),
          url: input.imageUrl,
          alt: input.imageAlt,
          width: existing.images[0]?.width ?? 1200,
          height: existing.images[0]?.height ?? 1500
        }
      ],
      isActive: input.isActive
    };

    this.state.products = this.state.products.map((item) => (item.id === id ? product : item));
    this.save();
    return product;
  }

  deleteProduct(id: string) {
    const existing = assertFound(
      this.state.products.find((product) => product.id === id),
      "PRODUCT_NOT_FOUND",
      "Product not found."
    );
    this.state.products = this.state.products.filter((product) => product.id !== existing.id);
    this.save();
  }

  createOnlineOrder(input: {
    orderReference: string;
    customer: { name: string; email: string; phone: string };
    priced: PricedCart;
  }) {
    const now = new Date().toISOString();
    const order: StoredOrder = {
      id: randomUUID(),
      publicReference: input.orderReference,
      customerName: input.customer.name,
      customerEmail: input.customer.email,
      customerPhone: input.customer.phone,
      status: "pending_payment",
      salesChannel: "online",
      subtotalInCents: input.priced.subtotalInCents,
      discountInCents: input.priced.discountInCents,
      shippingInCents: input.priced.shippingInCents,
      totalInCents: input.priced.totalInCents,
      currency: "BRL",
      createdAt: now,
      updatedAt: now,
      items: orderItemsFromCart(input.priced),
      mercadoPagoPreferenceId: null,
      checkoutUrl: null
    };

    this.state.orders = [order, ...this.state.orders];
    this.save();
    return order;
  }

  attachMercadoPagoPreference(orderReference: string, preferenceId: string | null, checkoutUrl: string) {
    this.state.orders = this.state.orders.map((order) =>
      order.publicReference === orderReference
        ? { ...order, mercadoPagoPreferenceId: preferenceId, checkoutUrl, updatedAt: new Date().toISOString() }
        : order
    );
    this.save();
  }

  createWhatsappRequest(input: { requestReference: string; priced: PricedCart }) {
    const now = new Date().toISOString();
    const request: StoredOrder = {
      id: randomUUID(),
      publicReference: input.requestReference,
      customerName: null,
      customerEmail: null,
      customerPhone: null,
      status: "contact_requested",
      salesChannel: "whatsapp",
      subtotalInCents: input.priced.subtotalInCents,
      discountInCents: input.priced.discountInCents,
      shippingInCents: input.priced.shippingInCents,
      totalInCents: input.priced.totalInCents,
      currency: "BRL",
      createdAt: now,
      updatedAt: now,
      items: orderItemsFromCart(input.priced)
    };

    this.state.orders = [request, ...this.state.orders];
    this.save();
    return request;
  }

  orders() {
    return this.state.orders;
  }

  storefront() {
    return this.state.storefront;
  }

  updateStorefront(input: StorefrontSettings) {
    this.state.storefront = storefrontSettingsSchema.parse(input);
    this.save();
    return this.state.storefront;
  }

  private findCategory(slug: string) {
    return assertFound(
      this.state.categories.find((category) => category.slug === slug),
      "CATEGORY_NOT_FOUND",
      "Category not found."
    );
  }

  private assertUniqueProductIdentity(input: { sku: string; slug: string; currentId?: string }) {
    const duplicatedSku = this.state.products.some((product) => product.sku === input.sku && product.id !== input.currentId);
    if (duplicatedSku) {
      throw new ApiError(409, "PRODUCT_SKU_EXISTS", "SKU already exists.");
    }

    const duplicatedSlug = this.state.products.some((product) => product.slug === input.slug && product.id !== input.currentId);
    if (duplicatedSlug) {
      throw new ApiError(409, "PRODUCT_SLUG_EXISTS", "Slug already exists.");
    }
  }

  private save() {
    this.persist?.(this.state);
  }
}
