import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import type {
  AdminCategoryInput,
  AdminOrderArchiveInput,
  AdminOrderUpdate,
  AdminProductInput,
  AdminProductRow,
  Category,
  OrderSummary,
  PixSettings,
  PaymentStatus,
  PricedCart,
  Product,
  StorefrontSettings,
} from "@bespoke/contracts";
import {
  defaultCatalogTextStyles,
  defaultFooterLinks,
  defaultHomeMotionByBlock,
  defaultHomeSections,
  defaultManifestoItems,
  defaultStorefrontTextStyles,
  pixSettingsSchema,
  storefrontSettingsSchema,
} from "@bespoke/contracts";
import {
  categories as demoCategories,
  products as demoProducts,
} from "../../data/demo-catalog.js";
import { ApiError, assertFound } from "../../shared/api-error.js";

export type StoredOrder = OrderSummary & {
  mercadoPagoPreferenceId?: string | null;
  checkoutUrl?: string | null;
  providerPaymentId?: string | null;
  pixPayload?: string | null;
};

export type PixOrderCreationResult = {
  order: StoredOrder;
  reused: boolean;
};

export type OrdersQuery = { archived?: boolean };

type CommerceState = {
  categories: Category[];
  products: Product[];
  orders: StoredOrder[];
  checkoutAccess: Record<string, string>;
  webhookEvents: string[];
  storefront: StorefrontSettings;
  pixSettings: PixSettings;
  pixIdempotency: Record<string, string>;
};

export type PaymentUpdateResult = "processed" | "duplicate" | "ignored";

type MaybePromise<T> = T | Promise<T>;

export interface CommerceStoreAdapter {
  healthCheck(): MaybePromise<void>;
  close(): MaybePromise<void>;
  categories(): MaybePromise<Category[]>;
  createCategory(input: AdminCategoryInput): MaybePromise<Category>;
  products(options?: { includeInactive?: boolean }): MaybePromise<Product[]>;
  findProductById(id: string): MaybePromise<Product | null>;
  findProductBySlug(slug: string): MaybePromise<Product | null>;
  adminProducts(): MaybePromise<AdminProductRow[]>;
  createProduct(input: AdminProductInput): MaybePromise<Product>;
  updateProduct(id: string, input: AdminProductInput): MaybePromise<Product>;
  deleteProduct(id: string): MaybePromise<void>;
  createOnlineOrder(input: {
    orderReference: string;
    checkoutAccessTokenHash: string;
    customer: { name: string; email: string; phone: string };
    priced: PricedCart;
  }): MaybePromise<StoredOrder>;
  createPixOrder(input: {
    orderReference: string;
    operationId: string;
    requestHash: string;
    checkoutAccessTokenHash: string;
    customer: { name: string; email: string; phone: string };
    priced: PricedCart;
    pixPayload: string;
  }): MaybePromise<PixOrderCreationResult>;
  attachMercadoPagoPreference(
    orderReference: string,
    preferenceId: string | null,
    checkoutUrl: string,
  ): MaybePromise<void>;
  createWhatsappRequest(input: {
    requestReference: string;
    priced: PricedCart;
  }): MaybePromise<StoredOrder>;
  findCheckoutOrder(
    orderReference: string,
    checkoutAccessTokenHash: string,
  ): MaybePromise<StoredOrder | null>;
  processMercadoPagoPayment(input: {
    eventId: string;
    eventType: string;
    providerPaymentId: string;
    orderReference: string;
    status: PaymentStatus;
    amountInCents: number;
  }): MaybePromise<PaymentUpdateResult>;
  recordWhatsappOpen(
    orderReference: string,
    checkoutAccessTokenHash: string,
  ): MaybePromise<boolean>;
  recordPixWhatsappOpen(
    orderReference: string,
    checkoutAccessTokenHash: string,
  ): MaybePromise<boolean>;
  setPixPaymentStatus(
    orderReference: string,
    status: "approved" | "rejected",
  ): MaybePromise<StoredOrder>;
  updateOrder(
    orderReference: string,
    input: AdminOrderUpdate,
  ): MaybePromise<StoredOrder>;
  setWhatsappRevenueConfirmed(
    orderReference: string,
    confirmed: boolean,
  ): MaybePromise<StoredOrder>;
  setOrdersArchived(input: AdminOrderArchiveInput): MaybePromise<number>;
  orders(query?: OrdersQuery): MaybePromise<StoredOrder[]>;
  storefront(): MaybePromise<StorefrontSettings>;
  updateStorefront(input: StorefrontSettings): MaybePromise<StorefrontSettings>;
  pixSettings(): MaybePromise<PixSettings>;
  updatePixSettings(input: PixSettings): MaybePromise<PixSettings>;
}

export const defaultPixSettings: PixSettings = {
  enabled: false,
  key: "",
  receiverName: "",
  receiverCity: "",
};

export const defaultStorefront: StorefrontSettings = {
  settingsVersion: 2,
  brandName: "Bespoke",
  legalName: "Bespoke",
  logoUrl: "",
  logoOnDarkUrl: "",
  faviconUrl: "",
  socialImageUrl: "",
  contactEmail: "",
  defaultMetaTitle: "Bespoke | Catalogo",
  defaultMetaDescription:
    "Descubra a curadoria de produtos e compre online ou pelo WhatsApp.",
  heroImageUrl:
    "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1800&q=82",
  heroEyebrow: "Loja Bespoke",
  heroEyebrowFontSize: 12,
  heroTitle: "Bespoke",
  heroTitleFontSize: 56,
  manifestoLineOne: "UMA EXPERI\u00caNCIA EXCLUSIVA, SOFISTICADA",
  manifestoLineTwo:
    "CUIDADOSAMENTE SELECIONADA PARA QUEM VALORIZA PRESEN\u00c7A",
  manifestoItems: defaultManifestoItems.map((item) => ({ ...item })),
  manifestoMaxWidth: 880,
  manifestoDivider: "line",
  manifestoDividerMobileEnabled: false,
  editorialCatalogLabel: "Explorar catalogo",
  editorialSupportLabel: "Atendimento exclusivo",
  editorialOrdersLabel: "Acompanhar pedidos",
  editorialAccountLabel: "Minha conta",
  editorialNavigationMobileEnabled: false,
  heroHeight: "balanced",
  featuredEyebrow: "Selecao inicial",
  featuredTitle: "Produtos em destaque",
  featuredLinkLabel: "Ver todos",
  featuredAddButtonLabel: "Adicionar",
  featuredAddedButtonLabel: "Adicionado",
  catalogEyebrow: "Loja",
  catalogTitle: "Catalogo",
  catalogDescription:
    "Explore os produtos, compare opcoes e encontre a escolha certa para voce.",
  catalogDensity: "comfortable",
  catalogBackgroundColor: "#f9f6f0",
  catalogSurfaceColor: "#ffffff",
  catalogTextColor: "#090907",
  catalogSecondaryTextColor: "#5c584f",
  catalogAccentColor: "#c9a76d",
  catalogBorderColor: "#d8d1c5",
  catalogButtonBackgroundColor: "#090907",
  catalogButtonTextColor: "#ffffff",
  catalogCardStyle: "boutique",
  catalogImageFit: "contain",
  catalogImageRatio: "landscape",
  catalogButtonStyle: "solid",
  catalogCardRadius: 8,
  catalogColumnsDesktop: 4,
  catalogColumnsTablet: 2,
  catalogColumnsMobile: 2,
  catalogTextStyles: {
    eyebrow: { ...defaultCatalogTextStyles.eyebrow },
    title: { ...defaultCatalogTextStyles.title },
    description: { ...defaultCatalogTextStyles.description },
    category: { ...defaultCatalogTextStyles.category },
    cardTitle: { ...defaultCatalogTextStyles.cardTitle },
    cardDescription: { ...defaultCatalogTextStyles.cardDescription },
    price: { ...defaultCatalogTextStyles.price },
    button: { ...defaultCatalogTextStyles.button },
  },
  homeLayout: "editorial",
  productCardStyle: "boutique",
  imageFit: "contain",
  homeSections: defaultHomeSections.map((section) => ({ ...section })),
  homeSectionSpacing: "balanced",
  homeTransitionPreset: "editorial",
  homeTransitionOverlap: 64,
  homeTransitionOpacity: 82,
  homeDepthIntensity: "balanced",
  homeMotionEnabled: true,
  homeMotionPreset: "editorial",
  homeMotionByBlock: { ...defaultHomeMotionByBlock },
  homeMotionIntensity: "balanced",
  homeTextStyles: {
    heroEyebrow: { ...defaultStorefrontTextStyles.heroEyebrow },
    heroTitle: { ...defaultStorefrontTextStyles.heroTitle },
    manifesto: { ...defaultStorefrontTextStyles.manifesto },
    navigation: { ...defaultStorefrontTextStyles.navigation },
    featuredEyebrow: { ...defaultStorefrontTextStyles.featuredEyebrow },
    featuredTitle: { ...defaultStorefrontTextStyles.featuredTitle },
    productCardTitle: { ...defaultStorefrontTextStyles.productCardTitle },
    reviewsEyebrow: { ...defaultStorefrontTextStyles.reviewsEyebrow },
    reviewsTitle: { ...defaultStorefrontTextStyles.reviewsTitle },
    reviewsBody: { ...defaultStorefrontTextStyles.reviewsBody },
    footerSlogan: { ...defaultStorefrontTextStyles.footerSlogan },
  },
  storefrontFont: "signature",
  adminFont: "signature",
  reviewsEnabled: false,
  reviewsEyebrow: "Avaliacoes",
  reviewsTitle: "Experiencias compartilhadas",
  reviewsItems: [],
  reviewsSpeedSeconds: 38,
  reviewsBackgroundColor: "#faf8f4",
  reviewsCardColor: "#ffffff",
  footerSlogan:
    "Curadoria reservada, cuidado impecavel e escolhas feitas para poucos.",
  footerShowBrandName: true,
  footerHeading: "Loja",
  footerServiceHeading: "Atendimento",
  footerServiceLineOne: "Seg-Sex · 9h as 19h",
  footerServiceLineTwo: "Sabado · 9h as 14h",
  footerWhatsappButtonLabel: "Atendimento WhatsApp",
  footerWhatsappLinkLabel: "Falar agora",
  footerCopyrightText:
    "\u00a9 {{year}} {{brand}} · Todos os direitos reservados.",
  footerSecurityText: "Pagamento seguro",
  footerLinks: defaultFooterLinks,
  footerPrivacyLabel: "Privacidade",
  footerCatalogLabel: "Catalogo",
  footerSupportLabel: "Suporte",
  whatsappNumber: "",
  whatsappPurchaseMessage:
    "Gostaria de confirmar disponibilidade e combinar os proximos passos diretamente com a loja.",
  postPaymentWhatsappMessage:
    "Meu pagamento foi confirmado. Gostaria de combinar o frete ou a retirada com a equipe.",
  primaryColor: "#090907",
  accentColor: "#c9a76d",
  headerBackgroundColor: "#ffffff",
  headerTextColor: "#090907",
  headerAccentColor: "#c9a76d",
  headerButtonMode: "automatic",
  headerButtonBackgroundColor: "#090907",
  headerButtonTextColor: "#ffffff",
  headerFontFamily: "modern",
  headerNavFontSize: 15,
  headerButtonFontSize: 15,
  headerHeight: 72,
  headerLogoWidth: 300,
  headerButtonStyle: "solid",
  headerButtonRadius: 6,
  headerBorderColor: "#d8d1c5",
  headerBorderWidth: 1,
  headerShadow: "subtle",
  headerSticky: true,
  footerColor: "#c9a76d",
  backgroundColor: "#ffffff",
  homeSurfaceColor: "#faf8f4",
  homeAlternateColor: "#f3efe8",
  homeSecondaryTextColor: "#5c584f",
  homeBorderColor: "#d8d1c5",
  homeShadowColor: "#090907",
  homeTransitionStartColor: "#c9a76d",
  homeTransitionEndColor: "#faf8f4",
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function initialState(): CommerceState {
  return {
    categories: clone(demoCategories),
    products: clone(demoProducts),
    orders: [],
    checkoutAccess: {},
    webhookEvents: [],
    storefront: defaultStorefront,
    pixSettings: defaultPixSettings,
    pixIdempotency: {},
  };
}

function normalizeState(value: Partial<CommerceState> | null): CommerceState {
  const state = initialState();
  return {
    categories: value?.categories ?? state.categories,
    products: (value?.products ?? state.products).map((product, index) => ({
      ...product,
      isFeatured: product.isFeatured ?? true,
      sortOrder: product.sortOrder ?? (index + 1) * 10,
    })),
    orders: (value?.orders ?? state.orders).map(normalizeStoredOrder),
    checkoutAccess: value?.checkoutAccess ?? state.checkoutAccess,
    webhookEvents: value?.webhookEvents ?? state.webhookEvents,
    storefront: normalizeStorefrontSettings(value?.storefront),
    pixSettings: pixSettingsSchema.parse(
      value?.pixSettings ?? state.pixSettings,
    ),
    pixIdempotency: value?.pixIdempotency ?? state.pixIdempotency,
  };
}

function normalizeStoredOrder(value: StoredOrder): StoredOrder {
  const legacy = value as StoredOrder & { shippingInCents?: number };
  const isOnline = value.salesChannel === "online";
  return {
    ...value,
    paymentMethod:
      value.paymentMethod ?? (isOnline ? "mercado_pago" : null),
    paymentStatus: value.paymentStatus ?? (isOnline ? "pending" : null),
    shippingMode:
      value.shippingMode ?? (isOnline ? "legacy_calculated" : "manual"),
    shippingStatus:
      value.shippingStatus ??
      (value.status === "delivered"
        ? "delivered"
        : value.status === "shipped"
          ? "dispatched"
          : isOnline
            ? "awaiting_payment"
            : "awaiting_contact"),
    contactStatus:
      value.contactStatus ?? (isOnline ? "not_started" : "whatsapp_opened"),
    shippingAmountInCents:
      value.shippingAmountInCents ?? legacy.shippingInCents ?? null,
    shippingNotes: value.shippingNotes ?? null,
    deliveryMethod: value.deliveryMethod ?? "undecided",
    deliveryAddress: value.deliveryAddress ?? null,
    pickupInstructions: value.pickupInstructions ?? null,
    shippingContactedAt: value.shippingContactedAt ?? null,
    shippingArrangedAt: value.shippingArrangedAt ?? null,
    revenueConfirmedAt:
      value.revenueConfirmedAt ??
      (value.salesChannel === "online" && value.paymentStatus === "approved"
        ? value.updatedAt
        : null),
    archivedAt: value.archivedAt ?? null,
  };
}

type LegacyStorefrontSettings = Partial<StorefrontSettings> & {
  heroSubtitle?: string;
  heroPrimaryCtaLabel?: string;
  heroSecondaryCtaLabel?: string;
};

export function normalizeStorefrontSettings(
  value?: LegacyStorefrontSettings | null,
): StorefrontSettings {
  const footerLinks = value?.footerLinks ?? [
    {
      ...defaultFooterLinks[0]!,
      label: value?.footerPrivacyLabel ?? defaultStorefront.footerPrivacyLabel,
    },
    {
      ...defaultFooterLinks[1]!,
      label: value?.footerCatalogLabel ?? defaultStorefront.footerCatalogLabel,
    },
    {
      ...defaultFooterLinks[2]!,
      label: value?.footerSupportLabel ?? defaultStorefront.footerSupportLabel,
    },
  ];
  const currentSettings = { ...(value ?? {}) };
  delete currentSettings.heroSubtitle;
  delete currentSettings.heroPrimaryCtaLabel;
  delete currentSettings.heroSecondaryCtaLabel;

  const manifestoItems = value?.manifestoItems
    ? value.manifestoItems
    : defaultManifestoItems.map((item, index) => ({
        ...item,
        content:
          index === 0
            ? (value?.manifestoLineOne ?? defaultStorefront.manifestoLineOne)
            : (value?.manifestoLineTwo ?? defaultStorefront.manifestoLineTwo),
      }));
  const legacyMotionPreset =
    value?.homeMotionPreset ?? defaultStorefront.homeMotionPreset;
  const legacyMotionByBlock = {
    manifesto: legacyMotionPreset,
    navigation: legacyMotionPreset,
    featuredHeading: legacyMotionPreset,
    productCards: legacyMotionPreset,
    reviews: defaultStorefront.homeMotionByBlock.reviews,
    footer: legacyMotionPreset,
  };
  const homeMotionByBlock = {
    ...defaultStorefront.homeMotionByBlock,
    ...legacyMotionByBlock,
    ...(value?.homeMotionByBlock ?? {}),
  };
  const configuredTextStyles = value?.homeTextStyles;
  const homeTextStyles = {
    heroEyebrow: {
      ...defaultStorefront.homeTextStyles.heroEyebrow,
      ...(configuredTextStyles?.heroEyebrow ?? {}),
      fontSize:
        configuredTextStyles?.heroEyebrow?.fontSize ??
        value?.heroEyebrowFontSize ??
        defaultStorefront.homeTextStyles.heroEyebrow.fontSize,
    },
    heroTitle: {
      ...defaultStorefront.homeTextStyles.heroTitle,
      ...(configuredTextStyles?.heroTitle ?? {}),
      fontSize:
        configuredTextStyles?.heroTitle?.fontSize ??
        value?.heroTitleFontSize ??
        defaultStorefront.homeTextStyles.heroTitle.fontSize,
    },
    manifesto: {
      ...defaultStorefront.homeTextStyles.manifesto,
      ...(configuredTextStyles?.manifesto ?? {}),
    },
    navigation: {
      ...defaultStorefront.homeTextStyles.navigation,
      ...(configuredTextStyles?.navigation ?? {}),
    },
    featuredEyebrow: {
      ...defaultStorefront.homeTextStyles.featuredEyebrow,
      ...(configuredTextStyles?.featuredEyebrow ?? {}),
    },
    featuredTitle: {
      ...defaultStorefront.homeTextStyles.featuredTitle,
      ...(configuredTextStyles?.featuredTitle ?? {}),
    },
    productCardTitle: {
      ...defaultStorefront.homeTextStyles.productCardTitle,
      ...(configuredTextStyles?.productCardTitle ?? {}),
    },
    reviewsEyebrow: {
      ...defaultStorefront.homeTextStyles.reviewsEyebrow,
      ...(configuredTextStyles?.reviewsEyebrow ?? {}),
    },
    reviewsTitle: {
      ...defaultStorefront.homeTextStyles.reviewsTitle,
      ...(configuredTextStyles?.reviewsTitle ?? {}),
    },
    reviewsBody: {
      ...defaultStorefront.homeTextStyles.reviewsBody,
      ...(configuredTextStyles?.reviewsBody ?? {}),
    },
    footerSlogan: {
      ...defaultStorefront.homeTextStyles.footerSlogan,
      ...(configuredTextStyles?.footerSlogan ?? {}),
    },
  };
  const configuredCatalogTextStyles = value?.catalogTextStyles;
  const catalogTextStyles = {
    eyebrow: {
      ...defaultStorefront.catalogTextStyles.eyebrow,
      ...(configuredCatalogTextStyles?.eyebrow ?? {}),
    },
    title: {
      ...defaultStorefront.catalogTextStyles.title,
      ...(configuredCatalogTextStyles?.title ?? {}),
    },
    description: {
      ...defaultStorefront.catalogTextStyles.description,
      ...(configuredCatalogTextStyles?.description ?? {}),
    },
    category: {
      ...defaultStorefront.catalogTextStyles.category,
      ...(configuredCatalogTextStyles?.category ?? {}),
    },
    cardTitle: {
      ...defaultStorefront.catalogTextStyles.cardTitle,
      ...(configuredCatalogTextStyles?.cardTitle ?? {}),
    },
    cardDescription: {
      ...defaultStorefront.catalogTextStyles.cardDescription,
      ...(configuredCatalogTextStyles?.cardDescription ?? {}),
    },
    price: {
      ...defaultStorefront.catalogTextStyles.price,
      ...(configuredCatalogTextStyles?.price ?? {}),
    },
    button: {
      ...defaultStorefront.catalogTextStyles.button,
      ...(configuredCatalogTextStyles?.button ?? {}),
    },
  };

  return storefrontSettingsSchema.parse({
    ...defaultStorefront,
    ...currentSettings,
    editorialCatalogLabel:
      value?.editorialCatalogLabel ??
      value?.heroPrimaryCtaLabel ??
      defaultStorefront.editorialCatalogLabel,
    editorialSupportLabel:
      value?.editorialSupportLabel ??
      value?.heroSecondaryCtaLabel ??
      defaultStorefront.editorialSupportLabel,
    manifestoItems,
    homeMotionByBlock,
    homeTextStyles,
    catalogTextStyles,
    footerColor:
      value?.footerColor ?? value?.accentColor ?? defaultStorefront.footerColor,
    footerHeading:
      value?.footerHeading && value.footerHeading !== "Links e atendimento"
        ? value.footerHeading
        : defaultStorefront.footerHeading,
    footerLinks,
  });
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

export function uniqueSlug(
  base: string,
  products: Product[],
  currentId?: string,
) {
  const root = slugify(base) || "produto";
  let candidate = root;
  let index = 2;
  while (
    products.some(
      (product) => product.slug === candidate && product.id !== currentId,
    )
  ) {
    candidate = `${root}-${index}`;
    index += 1;
  }
  return candidate;
}

export function uniqueSku(
  base: string,
  products: Product[],
  currentId?: string,
) {
  const productCode = slugify(base)
    .replace(/-/g, "")
    .slice(0, 12)
    .toUpperCase();
  const root = `PRD-${productCode || "ITEM"}`;
  let candidate = root;
  let index = 2;
  while (
    products.some(
      (product) => product.sku === candidate && product.id !== currentId,
    )
  ) {
    candidate = `${root}-${index}`;
    index += 1;
  }
  return candidate;
}

export function uniqueCategorySlug(base: string, categories: Category[]) {
  const root = slugify(base) || "categoria";
  let candidate = root;
  let index = 2;
  while (categories.some((category) => category.slug === candidate)) {
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
    imageUrl: line.imageUrl,
  }));
}

export class CommerceStore implements CommerceStoreAdapter {
  private constructor(
    private state: CommerceState,
    private readonly persist?: (state: CommerceState) => void,
  ) {}

  static memory() {
    return new CommerceStore(initialState());
  }

  static fromFile(filePath: string) {
    const absolutePath = resolve(filePath);
    const state = existsSync(absolutePath)
      ? normalizeState(
          JSON.parse(
            readFileSync(absolutePath, "utf8"),
          ) as Partial<CommerceState>,
        )
      : initialState();

    return new CommerceStore(state, (nextState) => {
      mkdirSync(dirname(absolutePath), { recursive: true });
      writeFileSync(absolutePath, JSON.stringify(nextState, null, 2), "utf8");
    });
  }

  categories() {
    return this.state.categories;
  }

  healthCheck() {}

  close() {}

  createCategory(input: AdminCategoryInput) {
    const normalizedName = slugify(input.name);
    const existing = this.state.categories.find(
      (category) => slugify(category.name) === normalizedName,
    );
    if (existing) return existing;

    const category: Category = {
      id: randomUUID(),
      slug: uniqueCategorySlug(input.name, this.state.categories),
      name: input.name,
      description: null,
    };
    this.state.categories = [...this.state.categories, category].sort(
      (first, second) => first.name.localeCompare(second.name, "pt-BR"),
    );
    this.save();
    return category;
  }

  products({ includeInactive = false }: { includeInactive?: boolean } = {}) {
    return includeInactive
      ? this.state.products
      : this.state.products.filter((product) => product.isActive);
  }

  findProductById(id: string) {
    return (
      this.state.products.find(
        (product) => product.id === id && product.isActive,
      ) ?? null
    );
  }

  findProductBySlug(slug: string) {
    return (
      this.state.products.find(
        (product) => product.slug === slug && product.isActive,
      ) ?? null
    );
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

  createProduct(input: AdminProductInput) {
    const category = this.findCategory(input.categorySlug);
    const slug = input.slug ?? uniqueSlug(input.name, this.state.products);
    const sku = input.sku ?? uniqueSku(input.name, this.state.products);
    this.assertUniqueProductIdentity({ sku, slug });

    const product: Product = {
      id: randomUUID(),
      slug,
      sku,
      name: input.name,
      subtitle: input.subtitle ?? null,
      description: input.description,
      category,
      priceInCents: input.priceInCents,
      compareAtPriceInCents: input.compareAtPriceInCents ?? null,
      stock: input.stock,
      lowStockThreshold: input.lowStockThreshold,
      lowStockWarningEnabled: input.lowStockWarningEnabled,
      images: [
        {
          id: randomUUID(),
          url: input.imageUrl,
          alt: input.imageAlt,
          width: input.imageWidth ?? 1200,
          height: input.imageHeight ?? 1200,
          contentType: input.imageContentType,
          sizeBytes: input.imageSizeBytes,
        },
      ],
      tags: [],
      isActive: input.isActive,
      isFeatured: input.isFeatured,
      sortOrder: input.sortOrder,
    };

    this.state.products = [product, ...this.state.products];
    this.save();
    return product;
  }

  updateProduct(id: string, input: AdminProductInput) {
    const existing = assertFound(
      this.state.products.find((product) => product.id === id),
      "PRODUCT_NOT_FOUND",
      "Product not found.",
    );
    const category = this.findCategory(input.categorySlug);
    const slug = input.slug ?? existing.slug;
    const sku = input.sku ?? existing.sku;
    this.assertUniqueProductIdentity({ sku, slug, currentId: id });

    const product: Product = {
      ...existing,
      slug,
      sku,
      name: input.name,
      subtitle: input.subtitle ?? null,
      description: input.description,
      category,
      priceInCents: input.priceInCents,
      compareAtPriceInCents: input.compareAtPriceInCents ?? null,
      stock: input.stock,
      lowStockThreshold: input.lowStockThreshold,
      lowStockWarningEnabled: input.lowStockWarningEnabled,
      images: [
        {
          id: existing.images[0]?.id ?? randomUUID(),
          url: input.imageUrl,
          alt: input.imageAlt,
          width: input.imageWidth ?? existing.images[0]?.width ?? 1200,
          height: input.imageHeight ?? existing.images[0]?.height ?? 1200,
          contentType:
            input.imageContentType ?? existing.images[0]?.contentType,
          sizeBytes: input.imageSizeBytes ?? existing.images[0]?.sizeBytes,
        },
      ],
      isActive: input.isActive,
      isFeatured: input.isFeatured,
      sortOrder: input.sortOrder,
    };

    this.state.products = this.state.products.map((item) =>
      item.id === id ? product : item,
    );
    this.save();
    return product;
  }

  deleteProduct(id: string) {
    const existing = assertFound(
      this.state.products.find((product) => product.id === id),
      "PRODUCT_NOT_FOUND",
      "Product not found.",
    );
    this.state.products = this.state.products.filter(
      (product) => product.id !== existing.id,
    );
    this.save();
  }

  createOnlineOrder(input: {
    orderReference: string;
    checkoutAccessTokenHash: string;
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
      paymentMethod: "mercado_pago",
      paymentStatus: "created",
      shippingMode: "whatsapp_after_payment",
      shippingStatus: "awaiting_payment",
      contactStatus: "not_started",
      subtotalInCents: input.priced.subtotalInCents,
      discountInCents: input.priced.discountInCents,
      shippingAmountInCents: null,
      totalInCents: input.priced.totalInCents,
      currency: "BRL",
      shippingNotes: null,
      deliveryMethod: "undecided",
      deliveryAddress: null,
      pickupInstructions: null,
      shippingContactedAt: null,
      shippingArrangedAt: null,
      revenueConfirmedAt: null,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
      items: orderItemsFromCart(input.priced),
      mercadoPagoPreferenceId: null,
      checkoutUrl: null,
    };

    this.state.orders = [order, ...this.state.orders];
    this.state.checkoutAccess[input.orderReference] =
      input.checkoutAccessTokenHash;
    this.save();
    return order;
  }

  createPixOrder(input: {
    orderReference: string;
    operationId: string;
    requestHash: string;
    checkoutAccessTokenHash: string;
    customer: { name: string; email: string; phone: string };
    priced: PricedCart;
    pixPayload: string;
  }): PixOrderCreationResult {
    const previousHash = this.state.pixIdempotency[input.operationId];
    if (previousHash) {
      if (previousHash !== input.requestHash) {
        throw new ApiError(
          409,
          "IDEMPOTENCY_KEY_REUSED",
          "Esta tentativa de pagamento ja foi usada para outro carrinho.",
        );
      }
      return {
        order: assertFound(
          this.state.orders.find(
            (order) => order.publicReference === input.orderReference,
          ),
          "ORDER_NOT_FOUND",
          "Order not found.",
        ),
        reused: true,
      };
    }

    const now = new Date().toISOString();
    const order: StoredOrder = {
      id: randomUUID(),
      publicReference: input.orderReference,
      customerName: input.customer.name,
      customerEmail: input.customer.email,
      customerPhone: input.customer.phone,
      status: "pending_payment",
      salesChannel: "online",
      paymentMethod: "pix_manual",
      paymentStatus: "pending",
      shippingMode: "whatsapp_after_payment",
      shippingStatus: "awaiting_payment",
      contactStatus: "not_started",
      subtotalInCents: input.priced.subtotalInCents,
      discountInCents: input.priced.discountInCents,
      shippingAmountInCents: null,
      totalInCents: input.priced.totalInCents,
      currency: "BRL",
      shippingNotes: null,
      deliveryMethod: "undecided",
      deliveryAddress: null,
      pickupInstructions: null,
      shippingContactedAt: null,
      shippingArrangedAt: null,
      revenueConfirmedAt: null,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
      items: orderItemsFromCart(input.priced),
      pixPayload: input.pixPayload,
    };
    this.state.orders = [order, ...this.state.orders];
    this.state.checkoutAccess[input.orderReference] =
      input.checkoutAccessTokenHash;
    this.state.pixIdempotency[input.operationId] = input.requestHash;
    this.save();
    return { order, reused: false };
  }

  attachMercadoPagoPreference(
    orderReference: string,
    preferenceId: string | null,
    checkoutUrl: string,
  ) {
    this.state.orders = this.state.orders.map((order) =>
      order.publicReference === orderReference
        ? {
            ...order,
            mercadoPagoPreferenceId: preferenceId,
            paymentStatus: "pending" as const,
            checkoutUrl,
            updatedAt: new Date().toISOString(),
          }
        : order,
    );
    this.save();
  }

  createWhatsappRequest(input: {
    requestReference: string;
    priced: PricedCart;
  }) {
    const now = new Date().toISOString();
    const request: StoredOrder = {
      id: randomUUID(),
      publicReference: input.requestReference,
      customerName: null,
      customerEmail: null,
      customerPhone: null,
      status: "contact_requested",
      salesChannel: "whatsapp",
      paymentMethod: null,
      paymentStatus: null,
      shippingMode: "manual",
      shippingStatus: "awaiting_contact",
      contactStatus: "whatsapp_opened",
      subtotalInCents: input.priced.subtotalInCents,
      discountInCents: input.priced.discountInCents,
      shippingAmountInCents: null,
      totalInCents: input.priced.totalInCents,
      currency: "BRL",
      shippingNotes: null,
      deliveryMethod: "undecided",
      deliveryAddress: null,
      pickupInstructions: null,
      shippingContactedAt: null,
      shippingArrangedAt: null,
      revenueConfirmedAt: null,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
      items: orderItemsFromCart(input.priced),
    };

    this.state.orders = [request, ...this.state.orders];
    this.save();
    return request;
  }

  findCheckoutOrder(orderReference: string, checkoutAccessTokenHash: string) {
    if (this.state.checkoutAccess[orderReference] !== checkoutAccessTokenHash) {
      return null;
    }
    return (
      this.state.orders.find(
        (order) =>
          order.publicReference === orderReference &&
          order.salesChannel === "online",
      ) ?? null
    );
  }

  processMercadoPagoPayment(input: {
    eventId: string;
    eventType: string;
    providerPaymentId: string;
    orderReference: string;
    status: PaymentStatus;
    amountInCents: number;
  }): PaymentUpdateResult {
    if (this.state.webhookEvents.includes(input.eventId)) return "duplicate";
    this.state.webhookEvents.push(input.eventId);
    const index = this.state.orders.findIndex(
      (order) =>
        order.publicReference === input.orderReference &&
        order.salesChannel === "online",
    );
    const order = this.state.orders[index];
    if (!order || order.totalInCents !== input.amountInCents) {
      this.save();
      return "ignored";
    }

    const approved = input.status === "approved";
    const refunded = input.status === "refunded";
    const cancelled = input.status === "cancelled";
    this.state.orders[index] = {
      ...order,
      paymentStatus: input.status,
      providerPaymentId: input.providerPaymentId,
      status: approved
        ? "paid"
        : refunded
          ? "refunded"
          : cancelled
            ? "cancelled"
            : order.status,
      shippingStatus: approved
        ? "awaiting_contact"
        : refunded || cancelled
          ? "cancelled"
          : order.shippingStatus,
      revenueConfirmedAt: approved
        ? order.revenueConfirmedAt ?? new Date().toISOString()
        : refunded || cancelled
          ? null
          : order.revenueConfirmedAt,
      updatedAt: new Date().toISOString(),
    };
    this.save();
    return "processed";
  }

  recordWhatsappOpen(orderReference: string, checkoutAccessTokenHash: string) {
    const order = this.findCheckoutOrder(
      orderReference,
      checkoutAccessTokenHash,
    );
    if (!order || order.paymentStatus !== "approved") return false;
    this.state.orders = this.state.orders.map((candidate) =>
      candidate.publicReference === orderReference
        ? {
            ...candidate,
            contactStatus: "whatsapp_opened" as const,
            updatedAt: new Date().toISOString(),
          }
        : candidate,
    );
    this.save();
    return true;
  }

  recordPixWhatsappOpen(
    orderReference: string,
    checkoutAccessTokenHash: string,
  ) {
    const order = this.findCheckoutOrder(
      orderReference,
      checkoutAccessTokenHash,
    );
    if (!order || order.paymentMethod !== "pix_manual") return false;
    this.state.orders = this.state.orders.map((candidate) =>
      candidate.publicReference === orderReference
        ? {
            ...candidate,
            contactStatus: "whatsapp_opened" as const,
            updatedAt: new Date().toISOString(),
          }
        : candidate,
    );
    this.save();
    return true;
  }

  setPixPaymentStatus(
    orderReference: string,
    status: "approved" | "rejected",
  ) {
    const existing = assertFound(
      this.state.orders.find(
        (order) =>
          order.publicReference === orderReference &&
          order.paymentMethod === "pix_manual",
      ),
      "PIX_ORDER_NOT_FOUND",
      "Pedido Pix nao encontrado.",
    );
    if (existing.paymentStatus === status) return existing;
    if (["approved", "rejected"].includes(existing.paymentStatus ?? "")) {
      throw new ApiError(
        409,
        "PIX_PAYMENT_ALREADY_REVIEWED",
        "Este pagamento Pix ja foi revisado.",
      );
    }
    const now = new Date().toISOString();
    const updated: StoredOrder = {
      ...existing,
      paymentStatus: status,
      status: status === "approved" ? "paid" : "cancelled",
      shippingStatus:
        status === "approved" ? "awaiting_contact" : "cancelled",
      revenueConfirmedAt: status === "approved" ? now : null,
      updatedAt: now,
    };
    this.state.orders = this.state.orders.map((order) =>
      order.publicReference === orderReference ? updated : order,
    );
    this.save();
    return updated;
  }

  updateOrder(orderReference: string, input: AdminOrderUpdate) {
    const existing = assertFound(
      this.state.orders.find(
        (order) => order.publicReference === orderReference,
      ),
      "ORDER_NOT_FOUND",
      "Order not found.",
    );
    const now = new Date().toISOString();
    const updated: StoredOrder = {
      ...existing,
      ...input,
      shippingContactedAt:
        input.contactStatus === "contact_started" &&
        !existing.shippingContactedAt
          ? now
          : existing.shippingContactedAt,
      shippingArrangedAt:
        input.shippingStatus === "arranged" && !existing.shippingArrangedAt
          ? now
          : existing.shippingArrangedAt,
      updatedAt: now,
    };
    this.state.orders = this.state.orders.map((order) =>
      order.publicReference === orderReference ? updated : order,
    );
    this.save();
    return updated;
  }

  setWhatsappRevenueConfirmed(orderReference: string, confirmed: boolean) {
    const existing = assertFound(
      this.state.orders.find(
        (order) =>
          order.publicReference === orderReference &&
          order.salesChannel === "whatsapp",
      ),
      "ORDER_NOT_FOUND",
      "Order not found.",
    );
    const now = new Date().toISOString();
    const updated: StoredOrder = {
      ...existing,
      revenueConfirmedAt: confirmed ? existing.revenueConfirmedAt ?? now : null,
      updatedAt: now,
    };
    this.state.orders = this.state.orders.map((order) =>
      order.publicReference === orderReference ? updated : order,
    );
    this.save();
    return updated;
  }

  setOrdersArchived(input: AdminOrderArchiveInput) {
    const references = new Set(input.references);
    const now = new Date().toISOString();
    let changed = 0;
    this.state.orders = this.state.orders.map((order) => {
      if (!references.has(order.publicReference)) return order;
      const archivedAt = input.archived ? order.archivedAt ?? now : null;
      if (archivedAt === order.archivedAt) return order;
      changed += 1;
      return { ...order, archivedAt, updatedAt: now };
    });
    this.save();
    return changed;
  }

  orders(query: OrdersQuery = {}) {
    return this.state.orders.filter((order) =>
      query.archived ? Boolean(order.archivedAt) : !order.archivedAt,
    );
  }

  storefront() {
    return this.state.storefront;
  }

  updateStorefront(input: StorefrontSettings) {
    this.state.storefront = storefrontSettingsSchema.parse(input);
    this.save();
    return this.state.storefront;
  }

  pixSettings() {
    return this.state.pixSettings;
  }

  updatePixSettings(input: PixSettings) {
    this.state.pixSettings = pixSettingsSchema.parse(input);
    this.save();
    return this.state.pixSettings;
  }

  private findCategory(slug: string) {
    return assertFound(
      this.state.categories.find((category) => category.slug === slug),
      "CATEGORY_NOT_FOUND",
      "Category not found.",
    );
  }

  private assertUniqueProductIdentity(input: {
    sku: string;
    slug: string;
    currentId?: string;
  }) {
    const duplicatedSku = this.state.products.some(
      (product) => product.sku === input.sku && product.id !== input.currentId,
    );
    if (duplicatedSku) {
      throw new ApiError(409, "PRODUCT_SKU_EXISTS", "SKU already exists.");
    }

    const duplicatedSlug = this.state.products.some(
      (product) =>
        product.slug === input.slug && product.id !== input.currentId,
    );
    if (duplicatedSlug) {
      throw new ApiError(409, "PRODUCT_SLUG_EXISTS", "Slug already exists.");
    }
  }

  private save() {
    this.persist?.(this.state);
  }
}
