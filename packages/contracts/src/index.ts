import { z } from "zod";

export const idSchema = z.string().uuid();
export const slugSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const moneyInCentsSchema = z.number().int().min(0).max(99_999_999);
export const quantitySchema = z.number().int().min(1).max(99);

export const supportedImageContentTypes = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;
export const supportedImageContentTypeSchema = z.enum(
  supportedImageContentTypes,
);
export const maxImageUploadBytes = 8 * 1024 * 1024;

export const imageUploadResponseSchema = z.object({
  url: z.string().url(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  contentType: supportedImageContentTypeSchema,
  sizeBytes: z.number().int().positive().max(maxImageUploadBytes),
});

export const imageDeleteRequestSchema = z
  .object({
    url: z.string().url(),
  })
  .strict();

export const imageDeleteResponseSchema = z
  .object({
    deleted: z.boolean(),
  })
  .strict();

export const typographyPresetSchema = z.enum([
  "signature",
  "modern",
  "classic",
]);

const footerHrefSchema = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .refine((value) => {
    if (value.startsWith("/") && !value.startsWith("//")) return true;

    try {
      return ["https:", "mailto:", "tel:"].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  }, "Use uma rota interna ou um link HTTPS, de email ou telefone.");

export const footerLinkSchema = z
  .object({
    id: idSchema,
    label: z
      .string()
      .trim()
      .max(60)
      .refine((value) => value.length === 0 || value.length >= 2, {
        message: "Use ao menos 2 caracteres ou deixe o texto vazio.",
      }),
    href: footerHrefSchema,
    iconUrl: z.string().url().or(z.literal("")),
  })
  .strict()
  .superRefine((link, context) => {
    if (!link.label && !link.iconUrl) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe um texto ou envie um icone para o link.",
        path: ["label"],
      });
    }
  });

export const defaultFooterLinks = [
  {
    id: "00000000-0000-4000-8000-000000000101",
    label: "Privacidade",
    href: "/privacidade",
    iconUrl: "",
  },
  {
    id: "00000000-0000-4000-8000-000000000102",
    label: "Catalogo",
    href: "/catalogo",
    iconUrl: "",
  },
  {
    id: "00000000-0000-4000-8000-000000000103",
    label: "Suporte",
    href: "/suporte",
    iconUrl: "",
  },
];

function systemFooterLinkOrder(link: { id: string; href: string }) {
  return defaultFooterLinks.findIndex(
    (systemLink) => systemLink.id === link.id || systemLink.href === link.href,
  );
}

export function isSystemFooterLink(link: { id: string; href: string }) {
  return systemFooterLinkOrder(link) >= 0;
}

export function orderFooterLinks<T extends { id: string; href: string }>(
  links: readonly T[],
) {
  return links
    .map((link, index) => ({
      index,
      link,
      systemOrder: systemFooterLinkOrder(link),
    }))
    .sort((left, right) => {
      if (left.systemOrder < 0 && right.systemOrder < 0) {
        return left.index - right.index;
      }
      if (left.systemOrder < 0) return -1;
      if (right.systemOrder < 0) return 1;
      return left.systemOrder - right.systemOrder;
    })
    .map(({ link }) => link);
}

export function formatFooterCopyright(
  template: string,
  brandName: string,
  year = new Date().getFullYear(),
) {
  return template
    .replaceAll("{{year}}", String(year))
    .replaceAll("{{brand}}", brandName);
}

const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const storefrontTextFontSchema = z.enum([
  "inherit",
  "display",
  "body",
  "modern",
  "classic",
]);

const storefrontTextStyleSchema = z
  .object({
    color: colorSchema.or(z.literal("")),
    fontSize: z.number().int().min(10).max(96),
    spacingAfter: z.number().int().min(0).max(96),
    fontFamily: storefrontTextFontSchema,
  })
  .strict();

export const defaultStorefrontTextStyles = {
  heroEyebrow: {
    color: "",
    fontSize: 12,
    spacingAfter: 8,
    fontFamily: "body",
  },
  heroTitle: {
    color: "",
    fontSize: 56,
    spacingAfter: 0,
    fontFamily: "display",
  },
  manifesto: {
    color: "",
    fontSize: 68,
    spacingAfter: 36,
    fontFamily: "display",
  },
  navigation: {
    color: "",
    fontSize: 16,
    spacingAfter: 0,
    fontFamily: "body",
  },
  featuredEyebrow: {
    color: "",
    fontSize: 13,
    spacingAfter: 12,
    fontFamily: "body",
  },
  featuredTitle: {
    color: "",
    fontSize: 56,
    spacingAfter: 0,
    fontFamily: "display",
  },
  productCardTitle: {
    color: "",
    fontSize: 26,
    spacingAfter: 12,
    fontFamily: "display",
  },
  footerSlogan: {
    color: "",
    fontSize: 14,
    spacingAfter: 16,
    fontFamily: "body",
  },
} as const;

const homeTextStylesSchema = z
  .object({
    heroEyebrow: storefrontTextStyleSchema,
    heroTitle: storefrontTextStyleSchema,
    manifesto: storefrontTextStyleSchema,
    navigation: storefrontTextStyleSchema,
    featuredEyebrow: storefrontTextStyleSchema,
    featuredTitle: storefrontTextStyleSchema,
    productCardTitle: storefrontTextStyleSchema,
    footerSlogan: storefrontTextStyleSchema,
  })
  .strict();

export const homeMotionPresetSchema = z.enum([
  "editorial",
  "scroll",
  "soft",
  "cascade",
  "structured",
  "subtle",
  "static",
]);

export const defaultHomeMotionByBlock = {
  manifesto: "scroll",
  navigation: "cascade",
  featuredHeading: "scroll",
  productCards: "cascade",
  footer: "soft",
} as const;

const homeMotionByBlockSchema = z
  .object({
    manifesto: homeMotionPresetSchema,
    navigation: homeMotionPresetSchema,
    featuredHeading: homeMotionPresetSchema,
    productCards: homeMotionPresetSchema,
    footer: homeMotionPresetSchema,
  })
  .strict();

export const defaultManifestoItems = [
  {
    id: "00000000-0000-4000-8000-000000000301",
    type: "headline",
    content: "UMA EXPERI\u00caNCIA EXCLUSIVA, SOFISTICADA",
    enabled: true,
    alignment: "center",
    emphasis: "strong",
  },
  {
    id: "00000000-0000-4000-8000-000000000302",
    type: "headline",
    content: "CUIDADOSAMENTE SELECIONADA PARA QUEM VALORIZA PRESEN\u00c7A",
    enabled: true,
    alignment: "center",
    emphasis: "strong",
  },
] as const;

export const defaultHomeSections = [
  { id: "manifesto", enabled: true },
  { id: "navigation", enabled: true },
  { id: "featured", enabled: true },
] as const;

export const orderStatusSchema = z.enum([
  "draft",
  "pending_payment",
  "paid",
  "preparing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
]);

export const paymentStatusSchema = z.enum([
  "created",
  "pending",
  "approved",
  "rejected",
  "cancelled",
  "refunded",
]);

export const shippingModeSchema = z.enum([
  "legacy_calculated",
  "whatsapp_after_payment",
  "manual",
]);

export const shippingStatusSchema = z.enum([
  "awaiting_payment",
  "awaiting_contact",
  "contact_started",
  "awaiting_customer_response",
  "arranged",
  "ready_for_pickup",
  "dispatched",
  "delivered",
  "cancelled",
]);

export const contactStatusSchema = z.enum([
  "not_started",
  "whatsapp_opened",
  "contact_started",
  "completed",
]);

export const deliveryMethodSchema = z.enum(["undecided", "delivery", "pickup"]);

export const whatsappStatusSchema = z.enum([
  "contact_requested",
  "conversation_started",
  "quote_confirmed",
  "awaiting_payment",
  "converted_to_order",
  "completed",
  "cancelled",
]);

export const categorySchema = z.object({
  id: idSchema,
  slug: slugSchema,
  name: z.string().min(2).max(80),
  description: z.string().max(240).nullable(),
});

export const productImageSchema = z.object({
  id: idSchema,
  url: z.string().url(),
  alt: z.string().min(1).max(160),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  contentType: supportedImageContentTypeSchema.optional(),
  sizeBytes: z.number().int().min(0).max(maxImageUploadBytes).optional(),
});

export const productSchema = z.object({
  id: idSchema,
  slug: slugSchema,
  sku: z.string().min(2).max(48),
  name: z.string().min(2).max(120),
  subtitle: z.string().max(160).nullable(),
  description: z.string().min(20).max(2000),
  category: categorySchema,
  priceInCents: moneyInCentsSchema,
  compareAtPriceInCents: moneyInCentsSchema.nullable(),
  stock: z.number().int().min(0),
  lowStockThreshold: z.number().int().min(0),
  lowStockWarningEnabled: z.boolean().default(false),
  images: z.array(productImageSchema).min(1),
  tags: z.array(z.string().min(1).max(40)).max(12),
  isActive: z.boolean(),
  isFeatured: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

export const maxCatalogPageSize = 24;

export const catalogQuerySchema = z
  .object({
    cursor: z.string().min(1).max(200).optional(),
    limit: z.coerce.number().int().min(1).max(maxCatalogPageSize).default(12),
    search: z.string().trim().max(80).optional(),
    category: slugSchema.optional(),
    featured: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),
    sort: z
      .enum(["featured", "price_asc", "price_desc", "newest"])
      .default("featured"),
  })
  .strict();

export const catalogResponseSchema = z.object({
  items: z.array(productSchema),
  nextCursor: z.string().nullable(),
});

export const cartItemInputSchema = z
  .object({
    productId: idSchema,
    quantity: quantitySchema,
  })
  .strict();

export const cartPriceRequestSchema = z
  .object({
    items: z.array(cartItemInputSchema).min(1).max(50),
  })
  .strict();

export const cartLineSchema = z.object({
  productId: idSchema,
  name: z.string(),
  sku: z.string(),
  quantity: quantitySchema,
  unitPriceInCents: moneyInCentsSchema,
  subtotalInCents: moneyInCentsSchema,
  imageUrl: z.string().url(),
  available: z.boolean(),
  stock: z.number().int().min(0),
});

export const pricedCartSchema = z.object({
  lines: z.array(cartLineSchema),
  subtotalInCents: moneyInCentsSchema,
  discountInCents: moneyInCentsSchema,
  shippingAmountInCents: moneyInCentsSchema.nullable(),
  shippingMode: z.literal("whatsapp_after_payment"),
  totalInCents: moneyInCentsSchema,
  currency: z.literal("BRL"),
});

export const checkoutRequestSchema = z
  .object({
    items: z.array(cartItemInputSchema).min(1).max(50),
    customer: z
      .object({
        name: z.string().min(2).max(120),
        email: z.string().email().max(160),
        phone: z.string().min(8).max(24),
      })
      .strict(),
    shippingAcknowledged: z.literal(true),
  })
  .strict();

export const checkoutResponseSchema = z.object({
  orderReference: z.string().min(8).max(40),
  preferenceId: z.string().min(1).max(120).nullable(),
  checkoutUrl: z.string().url(),
  checkoutAccessToken: z.string().min(32).max(128),
  status: z.literal("pending_payment"),
});

export const whatsappRequestSchema = z
  .object({
    items: z.array(cartItemInputSchema).min(1).max(50),
  })
  .strict();

export const whatsappResponseSchema = z.object({
  requestReference: z.string().min(8).max(40),
  url: z.string().url(),
  status: whatsappStatusSchema,
});

export const adminProductInputSchema = z
  .object({
    sku: z.string().trim().min(2).max(48).optional(),
    slug: slugSchema.optional(),
    name: z.string().min(2).max(120),
    subtitle: z.string().max(160).nullable().optional(),
    description: z.string().min(20).max(2000),
    categorySlug: slugSchema,
    priceInCents: moneyInCentsSchema.refine(
      (value) => value > 0,
      "Preco deve ser maior que zero.",
    ),
    compareAtPriceInCents: moneyInCentsSchema.nullable().optional(),
    stock: z.number().int().min(0),
    lowStockThreshold: z.number().int().min(0),
    lowStockWarningEnabled: z.boolean().default(false),
    imageUrl: z.string().url(),
    imageAlt: z.string().min(1).max(160),
    imageWidth: z.number().int().positive().optional(),
    imageHeight: z.number().int().positive().optional(),
    imageContentType: supportedImageContentTypeSchema.optional(),
    imageSizeBytes: z.number().int().min(0).max(maxImageUploadBytes).optional(),
    isActive: z.boolean().default(true),
    isFeatured: z.boolean().default(true),
    sortOrder: z.number().int().min(0).max(9999).default(0),
  })
  .strict();

export const adminCategoryInputSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
  })
  .strict();

export const adminProductRowSchema = z.object({
  id: idSchema,
  sku: z.string(),
  slug: slugSchema,
  name: z.string(),
  subtitle: z.string().nullable(),
  description: z.string(),
  category: z.string(),
  categorySlug: slugSchema,
  priceInCents: moneyInCentsSchema,
  compareAtPriceInCents: moneyInCentsSchema.nullable(),
  stock: z.number().int().min(0),
  lowStockThreshold: z.number().int().min(0),
  lowStockWarningEnabled: z.boolean(),
  status: z.enum(["active", "inactive"]),
  lowStock: z.boolean(),
  imageUrl: z.string().url(),
  imageAlt: z.string(),
  imageWidth: z.number().int().positive().optional(),
  imageHeight: z.number().int().positive().optional(),
  imageContentType: supportedImageContentTypeSchema.optional(),
  imageSizeBytes: z.number().int().min(0).max(maxImageUploadBytes).optional(),
  isFeatured: z.boolean(),
  sortOrder: z.number().int().min(0).max(9999),
});

export const orderSummarySchema = z.object({
  id: idSchema,
  publicReference: z.string().min(8).max(40),
  customerName: z.string().min(2).max(120).nullable(),
  customerEmail: z.string().email().nullable(),
  customerPhone: z.string().min(8).max(24).nullable(),
  status: orderStatusSchema.or(whatsappStatusSchema),
  salesChannel: z.enum(["online", "whatsapp"]),
  paymentStatus: paymentStatusSchema.nullable(),
  shippingMode: shippingModeSchema.nullable(),
  shippingStatus: shippingStatusSchema.nullable(),
  contactStatus: contactStatusSchema.nullable(),
  subtotalInCents: moneyInCentsSchema,
  discountInCents: moneyInCentsSchema,
  shippingAmountInCents: moneyInCentsSchema.nullable(),
  totalInCents: moneyInCentsSchema,
  currency: z.literal("BRL"),
  shippingNotes: z.string().max(1000).nullable(),
  deliveryMethod: deliveryMethodSchema.nullable(),
  deliveryAddress: z.string().max(500).nullable(),
  pickupInstructions: z.string().max(500).nullable(),
  shippingContactedAt: z.string().nullable(),
  shippingArrangedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  items: z.array(
    cartLineSchema.pick({
      productId: true,
      name: true,
      sku: true,
      quantity: true,
      unitPriceInCents: true,
      subtotalInCents: true,
      imageUrl: true,
    }),
  ),
});

export const checkoutStatusResponseSchema = z.object({
  orderReference: z.string().min(8).max(40),
  paymentStatus: paymentStatusSchema,
  shippingStatus: shippingStatusSchema,
  shippingAmountInCents: moneyInCentsSchema.nullable(),
  totalPaidInCents: moneyInCentsSchema,
  currency: z.literal("BRL"),
  items: z.array(
    cartLineSchema.pick({
      productId: true,
      name: true,
      quantity: true,
      unitPriceInCents: true,
      subtotalInCents: true,
      imageUrl: true,
    }),
  ),
  whatsappUrl: z.string().url().nullable(),
  canContinueOnWhatsapp: z.boolean(),
});

export const adminOrderUpdateSchema = z
  .object({
    shippingStatus: shippingStatusSchema,
    contactStatus: contactStatusSchema,
    shippingAmountInCents: moneyInCentsSchema.nullable(),
    shippingNotes: z.string().trim().max(1000).nullable(),
    deliveryMethod: deliveryMethodSchema,
    deliveryAddress: z.string().trim().max(500).nullable(),
    pickupInstructions: z.string().trim().max(500).nullable(),
  })
  .strict()
  .superRefine((input, context) => {
    const deliveryAlreadyArranged = [
      "arranged",
      "dispatched",
      "delivered",
    ].includes(input.shippingStatus);
    if (
      input.deliveryMethod === "delivery" &&
      deliveryAlreadyArranged &&
      !input.deliveryAddress
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["deliveryAddress"],
        message: "Informe o endereco para uma entrega ja combinada.",
      });
    }
  });

const manifestoItemSchema = z
  .object({
    id: idSchema,
    type: z.enum(["eyebrow", "headline", "supporting", "paragraph"]),
    content: z.string().trim().max(280),
    enabled: z.boolean(),
    alignment: z.enum(["start", "center"]),
    emphasis: z.enum(["subtle", "standard", "strong"]),
  })
  .strict();

const homeSectionSchema = z
  .object({
    id: z.enum(["manifesto", "navigation", "featured"]),
    enabled: z.boolean(),
  })
  .strict();

const homeSectionsSchema = z
  .array(homeSectionSchema)
  .length(3)
  .superRefine((sections, context) => {
    const ids = new Set(sections.map((section) => section.id));
    if (ids.size !== 3) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cada secao da Home deve aparecer uma unica vez.",
      });
    }
  });

const checkoutMessageSchema = z
  .string()
  .trim()
  .min(10)
  .max(600)
  .refine(
    (value) => !/[<>{}]/.test(value),
    "Use somente texto simples, sem HTML ou placeholders.",
  );

export const storefrontSettingsSchema = z
  .object({
    settingsVersion: z.literal(2).default(2),
    brandName: z.string().min(2).max(80),
    legalName: z.string().trim().min(2).max(140).default("Bespoke"),
    logoUrl: z.string().url().or(z.literal("")),
    logoOnDarkUrl: z.string().url().or(z.literal("")).default(""),
    faviconUrl: z.string().url().or(z.literal("")).default(""),
    socialImageUrl: z.string().url().or(z.literal("")).default(""),
    contactEmail: z.string().trim().email().or(z.literal("")).default(""),
    defaultMetaTitle: z
      .string()
      .trim()
      .min(2)
      .max(70)
      .default("Bespoke | Catalogo"),
    defaultMetaDescription: z
      .string()
      .trim()
      .min(20)
      .max(180)
      .default(
        "Descubra a curadoria de produtos e compre online ou pelo WhatsApp.",
      ),
    heroImageUrl: z.string().url(),
    heroEyebrow: z.string().trim().max(80).default("Loja Bespoke"),
    heroEyebrowFontSize: z.number().int().min(10).max(18).default(12),
    heroTitle: z.string().trim().max(100).default("Bespoke"),
    heroTitleFontSize: z.number().int().min(40).max(80).default(56),
    manifestoLineOne: z
      .string()
      .trim()
      .max(140)
      .default("UMA EXPERI\u00caNCIA EXCLUSIVA, SOFISTICADA"),
    manifestoLineTwo: z
      .string()
      .trim()
      .max(140)
      .default("CUIDADOSAMENTE SELECIONADA PARA QUEM VALORIZA PRESEN\u00c7A"),
    manifestoItems: z
      .array(manifestoItemSchema)
      .max(8)
      .default(defaultManifestoItems.map((item) => ({ ...item }))),
    manifestoMaxWidth: z.number().int().min(560).max(1120).default(880),
    manifestoDivider: z.enum(["none", "line", "accent"]).default("line"),
    editorialCatalogLabel: z
      .string()
      .min(2)
      .max(80)
      .default("Explorar catalogo"),
    editorialSupportLabel: z
      .string()
      .min(2)
      .max(80)
      .default("Atendimento exclusivo"),
    editorialOrdersLabel: z
      .string()
      .min(2)
      .max(80)
      .default("Acompanhar pedidos"),
    editorialAccountLabel: z.string().min(2).max(80).default("Minha conta"),
    editorialNavigationMobileEnabled: z.boolean().default(false),
    heroHeight: z
      .enum(["compact", "balanced", "immersive"])
      .default("balanced"),
    featuredEyebrow: z.string().min(2).max(80).default("Selecao inicial"),
    featuredTitle: z.string().min(2).max(100).default("Produtos em destaque"),
    featuredLinkLabel: z.string().min(2).max(80).default("Ver todos"),
    featuredAddButtonLabel: z.string().min(2).max(40).default("Adicionar"),
    featuredAddedButtonLabel: z.string().min(2).max(40).default("Adicionado"),
    homeLayout: z
      .enum(["editorial", "compact", "showcase"])
      .default("editorial"),
    productCardStyle: z
      .enum(["minimal", "boutique", "editorial"])
      .default("boutique"),
    imageFit: z.enum(["contain", "cover"]).default("contain"),
    homeSections: homeSectionsSchema.default(
      defaultHomeSections.map((section) => ({ ...section })),
    ),
    homeSectionSpacing: z
      .enum(["compact", "balanced", "airy"])
      .default("balanced"),
    homeTransitionPreset: z
      .enum(["soft", "editorial", "depth", "minimal", "none"])
      .default("editorial"),
    homeTransitionOverlap: z.number().int().min(0).max(96).default(64),
    homeTransitionOpacity: z.number().int().min(0).max(100).default(82),
    homeDepthIntensity: z
      .enum(["subtle", "balanced", "pronounced"])
      .default("balanced"),
    homeMotionEnabled: z.boolean().default(true),
    homeMotionPreset: homeMotionPresetSchema.default("editorial"),
    homeMotionByBlock: homeMotionByBlockSchema.default(
      defaultHomeMotionByBlock,
    ),
    homeMotionIntensity: z
      .enum(["subtle", "balanced", "expressive"])
      .default("balanced"),
    homeTextStyles: homeTextStylesSchema.default(defaultStorefrontTextStyles),
    storefrontFont: typographyPresetSchema.default("signature"),
    adminFont: typographyPresetSchema.default("signature"),
    footerSlogan: z
      .string()
      .trim()
      .max(220)
      .default(
        "Curadoria reservada, cuidado impecavel e escolhas feitas para poucos.",
      ),
    footerShowBrandName: z.boolean().default(true),
    footerHeading: z.string().trim().max(80).default("Loja"),
    footerServiceHeading: z.string().trim().max(80).default("Atendimento"),
    footerServiceLineOne: z
      .string()
      .trim()
      .max(100)
      .default("Seg-Sex · 9h as 19h"),
    footerServiceLineTwo: z
      .string()
      .trim()
      .max(100)
      .default("Sabado · 9h as 14h"),
    footerWhatsappButtonLabel: z
      .string()
      .trim()
      .max(60)
      .default("Atendimento WhatsApp"),
    footerWhatsappLinkLabel: z.string().trim().max(60).default("Falar agora"),
    footerCopyrightText: z
      .string()
      .trim()
      .max(180)
      .default("\u00a9 {{year}} {{brand}} · Todos os direitos reservados."),
    footerSecurityText: z.string().trim().max(100).default("Pagamento seguro"),
    footerLinks: z.array(footerLinkSchema).max(8).default(defaultFooterLinks),
    footerPrivacyLabel: z.string().min(2).max(40).default("Privacidade"),
    footerCatalogLabel: z.string().min(2).max(40).default("Catalogo"),
    footerSupportLabel: z.string().min(2).max(40).default("Suporte"),
    whatsappNumber: z
      .string()
      .trim()
      .regex(/^\d{10,15}$/)
      .or(z.literal(""))
      .default(""),
    whatsappPurchaseMessage: checkoutMessageSchema.default(
      "Gostaria de confirmar disponibilidade e combinar os proximos passos diretamente com a loja.",
    ),
    postPaymentWhatsappMessage: checkoutMessageSchema.default(
      "Meu pagamento foi confirmado. Gostaria de combinar o frete ou a retirada com a equipe.",
    ),
    primaryColor: colorSchema,
    accentColor: colorSchema,
    footerColor: colorSchema.default("#c9a76d"),
    backgroundColor: colorSchema,
    homeSurfaceColor: colorSchema.default("#faf8f4"),
    homeAlternateColor: colorSchema.default("#f3efe8"),
    homeSecondaryTextColor: colorSchema.default("#5c584f"),
    homeBorderColor: colorSchema.default("#d8d1c5"),
    homeShadowColor: colorSchema.default("#090907"),
    homeTransitionStartColor: colorSchema.default("#c9a76d"),
    homeTransitionEndColor: colorSchema.default("#faf8f4"),
  })
  .strict();

export type Category = z.infer<typeof categorySchema>;
export type Product = z.infer<typeof productSchema>;
export type CatalogQuery = z.infer<typeof catalogQuerySchema>;
export type CatalogResponse = z.infer<typeof catalogResponseSchema>;
export type CartItemInput = z.infer<typeof cartItemInputSchema>;
export type PricedCart = z.infer<typeof pricedCartSchema>;
export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;
export type CheckoutResponse = z.infer<typeof checkoutResponseSchema>;
export type CheckoutStatusResponse = z.infer<
  typeof checkoutStatusResponseSchema
>;
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;
export type WhatsappRequest = z.infer<typeof whatsappRequestSchema>;
export type WhatsappResponse = z.infer<typeof whatsappResponseSchema>;
export type AdminProductInput = z.infer<typeof adminProductInputSchema>;
export type AdminCategoryInput = z.infer<typeof adminCategoryInputSchema>;
export type AdminProductRow = z.infer<typeof adminProductRowSchema>;
export type OrderSummary = z.infer<typeof orderSummarySchema>;
export type AdminOrderUpdate = z.infer<typeof adminOrderUpdateSchema>;
export type StorefrontSettings = z.infer<typeof storefrontSettingsSchema>;
export type StorefrontTextStyle = z.infer<typeof storefrontTextStyleSchema>;
export type StorefrontTextFont = z.infer<typeof storefrontTextFontSchema>;
export type HomeMotionPreset = z.infer<typeof homeMotionPresetSchema>;
export type ManifestoItem = z.infer<typeof manifestoItemSchema>;
export type HomeSection = z.infer<typeof homeSectionSchema>;
export type FooterLink = z.infer<typeof footerLinkSchema>;
export type TypographyPreset = z.infer<typeof typographyPresetSchema>;
export type ImageUploadResponse = z.infer<typeof imageUploadResponseSchema>;
export type ImageDeleteRequest = z.infer<typeof imageDeleteRequestSchema>;
export type ImageDeleteResponse = z.infer<typeof imageDeleteResponseSchema>;
export type SupportedImageContentType = z.infer<
  typeof supportedImageContentTypeSchema
>;
