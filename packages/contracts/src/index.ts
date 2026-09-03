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
export const productCardDescriptionMaxLength = 200;

export function formatProductCardDescription(description: string) {
  if (description.length <= productCardDescriptionMaxLength) return description;

  const clipped = description.slice(0, productCardDescriptionMaxLength - 1);
  const lastBoundary = Math.max(
    clipped.lastIndexOf(" "),
    clipped.lastIndexOf("\n"),
  );
  const safeBoundary =
    lastBoundary >= productCardDescriptionMaxLength * 0.75
      ? lastBoundary
      : clipped.length;

  return `${clipped.slice(0, safeBoundary).trimEnd()}…`;
}

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
  "humanist",
  "editorial",
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
  "humanist",
  "editorial",
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
    spacingAfter: 40,
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
  categoryEyebrow: {
    color: "",
    fontSize: 13,
    spacingAfter: 10,
    fontFamily: "body",
  },
  categoryTitle: {
    color: "",
    fontSize: 44,
    spacingAfter: 14,
    fontFamily: "display",
  },
  categoryBody: {
    color: "",
    fontSize: 16,
    spacingAfter: 0,
    fontFamily: "body",
  },
  productCardTitle: {
    color: "",
    fontSize: 26,
    spacingAfter: 12,
    fontFamily: "display",
  },
  commerceEyebrow: {
    color: "",
    fontSize: 13,
    spacingAfter: 10,
    fontFamily: "body",
  },
  commerceTitle: {
    color: "",
    fontSize: 48,
    spacingAfter: 18,
    fontFamily: "display",
  },
  commerceBody: {
    color: "",
    fontSize: 16,
    spacingAfter: 0,
    fontFamily: "body",
  },
  reviewsEyebrow: {
    color: "",
    fontSize: 13,
    spacingAfter: 12,
    fontFamily: "body",
  },
  reviewsTitle: {
    color: "",
    fontSize: 48,
    spacingAfter: 20,
    fontFamily: "display",
  },
  reviewsBody: {
    color: "",
    fontSize: 16,
    spacingAfter: 0,
    fontFamily: "body",
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
    categoryEyebrow: storefrontTextStyleSchema,
    categoryTitle: storefrontTextStyleSchema,
    categoryBody: storefrontTextStyleSchema,
    productCardTitle: storefrontTextStyleSchema,
    commerceEyebrow: storefrontTextStyleSchema,
    commerceTitle: storefrontTextStyleSchema,
    commerceBody: storefrontTextStyleSchema,
    reviewsEyebrow: storefrontTextStyleSchema,
    reviewsTitle: storefrontTextStyleSchema,
    reviewsBody: storefrontTextStyleSchema,
    footerSlogan: storefrontTextStyleSchema,
  })
  .strict();

export const defaultCatalogTextStyles = {
  eyebrow: {
    color: "",
    fontSize: 13,
    spacingAfter: 12,
    fontFamily: "body",
  },
  title: {
    color: "",
    fontSize: 64,
    spacingAfter: 0,
    fontFamily: "display",
  },
  description: {
    color: "",
    fontSize: 17,
    spacingAfter: 0,
    fontFamily: "body",
  },
  category: {
    color: "",
    fontSize: 12,
    spacingAfter: 8,
    fontFamily: "modern",
  },
  cardTitle: {
    color: "",
    fontSize: 20,
    spacingAfter: 8,
    fontFamily: "modern",
  },
  cardDescription: {
    color: "",
    fontSize: 15,
    spacingAfter: 0,
    fontFamily: "modern",
  },
  price: {
    color: "",
    fontSize: 22,
    spacingAfter: 0,
    fontFamily: "modern",
  },
  button: {
    color: "",
    fontSize: 14,
    spacingAfter: 0,
    fontFamily: "modern",
  },
} as const;

const catalogTextStylesSchema = z
  .object({
    eyebrow: storefrontTextStyleSchema,
    title: storefrontTextStyleSchema,
    description: storefrontTextStyleSchema,
    category: storefrontTextStyleSchema,
    cardTitle: storefrontTextStyleSchema,
    cardDescription: storefrontTextStyleSchema,
    price: storefrontTextStyleSchema,
    button: storefrontTextStyleSchema,
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
  categories: "cascade",
  featuredHeading: "scroll",
  productCards: "cascade",
  commerce: "soft",
  reviews: "soft",
  footer: "soft",
} as const;

const homeMotionByBlockSchema = z
  .object({
    manifesto: homeMotionPresetSchema,
    navigation: homeMotionPresetSchema,
    categories: homeMotionPresetSchema,
    featuredHeading: homeMotionPresetSchema,
    productCards: homeMotionPresetSchema,
    commerce: homeMotionPresetSchema,
    reviews: homeMotionPresetSchema,
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
    fontFamily: "inherit",
    fontSize: 0,
    spacingAfter: 40,
  },
  {
    id: "00000000-0000-4000-8000-000000000302",
    type: "headline",
    content: "CUIDADOSAMENTE SELECIONADA PARA QUEM VALORIZA PRESEN\u00c7A",
    enabled: true,
    alignment: "center",
    emphasis: "strong",
    fontFamily: "inherit",
    fontSize: 0,
    spacingAfter: 40,
  },
] as const;

export const defaultHomeSections = [
  { id: "manifesto", enabled: true },
  { id: "navigation", enabled: true },
  { id: "categories", enabled: true },
  { id: "featured", enabled: true },
  { id: "commerce", enabled: true },
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

export const paymentMethodSchema = z.enum(["mercado_pago", "pix_manual"]);

const pixKeySchema = z
  .string()
  .trim()
  .max(77)
  .refine(
    (value) =>
      ![...value].some((character) => {
        const code = character.charCodeAt(0);
        return code <= 31 || code === 127;
      }),
    "A chave Pix contem caracteres invalidos.",
  )
  .refine(
    (value) => value === "" || isValidPixKey(value),
    "Informe uma chave Pix valida: CPF, CNPJ, telefone com +55, e-mail ou chave aleatoria.",
  );

function isValidPixKey(value: string) {
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return true;
  if (/^\+[1-9]\d{7,14}$/.test(value)) return true;
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    return true;
  }
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11) return hasValidDocumentDigits(digits, 9);
  if (digits.length === 14) return hasValidDocumentDigits(digits, 12);
  return false;
}

function hasValidDocumentDigits(value: string, baseLength: 9 | 12) {
  if (/^(\d)\1+$/.test(value)) return false;
  if (baseLength === 9) {
    const first = documentCheckDigit(value.slice(0, 9), 10);
    const second = documentCheckDigit(`${value.slice(0, 9)}${first}`, 11);
    return value.endsWith(`${first}${second}`);
  }
  const first = cnpjCheckDigit(value.slice(0, 12));
  const second = cnpjCheckDigit(`${value.slice(0, 12)}${first}`);
  return value.endsWith(`${first}${second}`);
}

function documentCheckDigit(value: string, startWeight: number) {
  const sum = [...value].reduce(
    (total, digit, index) => total + Number(digit) * (startWeight - index),
    0,
  );
  const remainder = (sum * 10) % 11;
  return remainder === 10 ? 0 : remainder;
}

function cnpjCheckDigit(value: string) {
  const weights =
    value.length === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const sum = [...value].reduce(
    (total, digit, index) => total + Number(digit) * weights[index]!,
    0,
  );
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

export const pixSettingsSchema = z
  .object({
    enabled: z.boolean().default(false),
    key: pixKeySchema.default(""),
    receiverName: z.string().trim().max(100).default(""),
    receiverCity: z.string().trim().max(100).default(""),
  })
  .strict()
  .superRefine((input, context) => {
    if (!input.enabled) return;
    const requiredFields = [
      ["key", input.key, 3],
      ["receiverName", input.receiverName, 2],
      ["receiverCity", input.receiverCity, 2],
    ] as const;
    for (const [field, value, minimum] of requiredFields) {
      if (value.length < minimum) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: "Preencha este campo para ativar o Pix.",
        });
      }
    }
  });

export const paymentMethodsResponseSchema = z
  .object({
    pixManualEnabled: z.boolean(),
    mercadoPagoEnabled: z.boolean(),
  })
  .strict();

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

export const pixCheckoutRequestSchema = checkoutRequestSchema
  .extend({
    operationId: z.string().uuid(),
  })
  .strict();

const pixPaymentDetailsShape = {
  orderReference: z.string().min(8).max(40),
  amountInCents: moneyInCentsSchema,
  currency: z.literal("BRL"),
  pixCode: z.string().min(40).max(600),
  qrCodeDataUrl: z.string().startsWith("data:image/png;base64,").max(250_000),
  whatsappUrl: z.string().url(),
  paymentStatus: paymentStatusSchema,
  status: z.enum(["pending_confirmation", "approved", "rejected"]),
} as const;

export const pixCheckoutResponseSchema = z
  .object({
    ...pixPaymentDetailsShape,
    checkoutAccessToken: z.string().min(32).max(128),
    reused: z.boolean(),
  })
  .strict();

export const pixPaymentDetailsSchema = z
  .object(pixPaymentDetailsShape)
  .strict();

export const adminPixPaymentDecisionSchema = z
  .object({
    status: z.enum(["approved", "rejected"]),
  })
  .strict();

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
  paymentMethod: paymentMethodSchema.nullable().default(null),
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
  revenueConfirmedAt: z.string().nullable().default(null),
  archivedAt: z.string().nullable().default(null),
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
    fontFamily: storefrontTextFontSchema.default("inherit"),
    fontSize: z.number().int().min(0).max(96).default(0),
    spacingAfter: z.number().int().min(12).max(120).default(40),
  })
  .strict();

export const adminWhatsappRevenueUpdateSchema = z
  .object({
    confirmed: z.boolean(),
  })
  .strict();

export const adminOrderArchiveInputSchema = z
  .object({
    references: z
      .array(z.string().min(8).max(40))
      .min(1)
      .max(500)
      .transform((references) => [...new Set(references)]),
    archived: z.boolean(),
  })
  .strict();

const reviewItemSchema = z
  .object({
    id: idSchema,
    author: z.string().trim().max(80),
    context: z.string().trim().max(100),
    content: z.string().trim().max(360),
    rating: z.number().int().min(1).max(5),
    enabled: z.boolean(),
  })
  .strict();

const homeSectionSchema = z
  .object({
    id: z.enum([
      "manifesto",
      "navigation",
      "categories",
      "featured",
      "commerce",
    ]),
    enabled: z.boolean(),
  })
  .strict();

const homeSectionsSchema = z
  .array(homeSectionSchema)
  .length(5)
  .superRefine((sections, context) => {
    const ids = new Set(sections.map((section) => section.id));
    if (ids.size !== 5) {
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
    manifestoDividerMobileEnabled: z.boolean().default(false),
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
    featuredDescription: z
      .string()
      .trim()
      .max(220)
      .default("Uma selecao preparada para facilitar sua escolha."),
    featuredLinkLabel: z.string().min(2).max(80).default("Ver todos"),
    featuredAddButtonLabel: z.string().min(2).max(40).default("Adicionar"),
    featuredAddedButtonLabel: z.string().min(2).max(40).default("Adicionado"),
    categoryEyebrow: z.string().trim().max(80).default("Explore"),
    categoryTitle: z.string().trim().max(100).default("Compre por categoria"),
    categoryDescription: z
      .string()
      .trim()
      .max(220)
      .default("Encontre rapidamente o que combina com o seu momento."),
    categoryLinkLabel: z
      .string()
      .trim()
      .min(2)
      .max(60)
      .default("Ver catalogo completo"),
    categoryLayout: z.enum(["rail", "grid"]).default("rail"),
    categoryLimit: z.number().int().min(3).max(8).default(6),
    commerceEyebrow: z.string().trim().max(80).default("Compre do seu jeito"),
    commerceTitle: z
      .string()
      .trim()
      .max(120)
      .default("Atendimento proximo ou pagamento online"),
    commerceDescription: z
      .string()
      .trim()
      .max(280)
      .default(
        "Escolha a experiencia que faz mais sentido para voce, com a mesma seguranca em toda a jornada.",
      ),
    commerceWhatsappTitle: z
      .string()
      .trim()
      .min(2)
      .max(80)
      .default("Comprar pelo WhatsApp"),
    commerceWhatsappDescription: z
      .string()
      .trim()
      .max(180)
      .default(
        "Finalize com atendimento humano para tirar duvidas e combinar os detalhes diretamente com a loja.",
      ),
    commerceOnlineTitle: z
      .string()
      .trim()
      .min(2)
      .max(80)
      .default("Pagar online"),
    commerceOnlineDescription: z
      .string()
      .trim()
      .max(180)
      .default(
        "Conclua o pagamento com Pix ou cartao e continue o atendimento pelo WhatsApp quando necessario.",
      ),
    commerceCtaLabel: z
      .string()
      .trim()
      .min(2)
      .max(60)
      .default("Explorar produtos"),
    catalogEyebrow: z.string().trim().max(80).default("Loja"),
    catalogTitle: z.string().trim().min(2).max(100).default("Catalogo"),
    catalogDescription: z
      .string()
      .trim()
      .max(220)
      .default(
        "Explore os produtos, compare opcoes e encontre a escolha certa para voce.",
      ),
    catalogDensity: z.enum(["comfortable", "compact"]).default("comfortable"),
    catalogBackgroundColor: colorSchema.default("#f9f6f0"),
    catalogSurfaceColor: colorSchema.default("#ffffff"),
    catalogTextColor: colorSchema.default("#090907"),
    catalogSecondaryTextColor: colorSchema.default("#5c584f"),
    catalogAccentColor: colorSchema.default("#c9a76d"),
    catalogBorderColor: colorSchema.default("#d8d1c5"),
    catalogButtonBackgroundColor: colorSchema.default("#090907"),
    catalogButtonTextColor: colorSchema.default("#ffffff"),
    catalogCardStyle: z
      .enum(["minimal", "boutique", "editorial", "ecommerce"])
      .default("boutique"),
    catalogImageFit: z.enum(["contain", "cover"]).default("contain"),
    catalogImageRatio: z
      .enum(["square", "portrait", "landscape"])
      .default("landscape"),
    catalogButtonStyle: z
      .enum(["solid", "outline", "minimal"])
      .default("solid"),
    catalogCardRadius: z.number().int().min(0).max(16).default(8),
    catalogColumnsDesktop: z.number().int().min(3).max(4).default(4),
    catalogColumnsTablet: z.number().int().min(2).max(3).default(2),
    catalogColumnsMobile: z.number().int().min(1).max(2).default(2),
    catalogTextStyles: catalogTextStylesSchema.default(
      defaultCatalogTextStyles,
    ),
    homeLayout: z
      .enum(["editorial", "compact", "showcase"])
      .default("editorial"),
    productCardStyle: z
      .enum(["minimal", "boutique", "editorial", "ecommerce"])
      .default("boutique"),
    imageFit: z.enum(["contain", "cover"]).default("contain"),
    homeProductImageRatio: z.enum(["square", "landscape"]).default("landscape"),
    homeProductDescriptionMode: z.enum(["full", "compact"]).default("full"),
    homeProductColumnsDesktop: z.number().int().min(3).max(4).default(4),
    homeProductColumnsTablet: z.number().int().min(2).max(3).default(2),
    homeProductColumnsMobile: z.number().int().min(1).max(2).default(2),
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
    reviewsEnabled: z.boolean().default(false),
    reviewsEyebrow: z.string().trim().max(80).default("Avaliacoes"),
    reviewsTitle: z
      .string()
      .trim()
      .max(100)
      .default("Experiencias compartilhadas"),
    reviewsItems: z.array(reviewItemSchema).max(12).default([]),
    reviewsSpeedSeconds: z.number().int().min(18).max(80).default(38),
    reviewsBackgroundColor: colorSchema.default("#faf8f4"),
    reviewsCardColor: colorSchema.default("#ffffff"),
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
    headerBackgroundColor: colorSchema.default("#ffffff"),
    headerTextColor: colorSchema.default("#090907"),
    headerAccentColor: colorSchema.default("#c9a76d"),
    headerButtonMode: z.enum(["automatic", "custom"]).default("automatic"),
    headerButtonBackgroundColor: colorSchema.default("#090907"),
    headerButtonTextColor: colorSchema.default("#ffffff"),
    headerFontFamily: storefrontTextFontSchema.default("modern"),
    headerNavFontSize: z.number().int().min(12).max(20).default(15),
    headerButtonFontSize: z.number().int().min(12).max(20).default(15),
    headerHeight: z.number().int().min(56).max(96).default(72),
    headerLogoWidth: z.number().int().min(140).max(360).default(300),
    headerButtonStyle: z.enum(["solid", "outline", "minimal"]).default("solid"),
    headerButtonRadius: z.number().int().min(0).max(24).default(6),
    headerBorderColor: colorSchema.default("#d8d1c5"),
    headerBorderWidth: z.number().int().min(0).max(3).default(1),
    headerShadow: z.enum(["none", "subtle", "pronounced"]).default("subtle"),
    headerSticky: z.boolean().default(true),
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

const controlDomainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(253)
  .regex(
    /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/,
    "Use um dominio valido sem protocolo ou caminho.",
  );

export const controlInstanceStatusSchema = z.enum([
  "draft",
  "prepared",
  "provisioning",
  "active",
  "failed",
  "suspended",
]);

const controlInstanceFields = {
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9][a-z0-9-]{2,62}$/,
      "Use letras minusculas, numeros e hifens.",
    ),
  name: z.string().trim().min(2).max(120),
  publicDomain: controlDomainSchema,
  adminDomain: controlDomainSchema,
  apiDomain: controlDomainSchema,
  ownerEmail: z.string().trim().toLowerCase().email().max(254),
  whatsappPhone: z
    .string()
    .trim()
    .regex(/^\d{10,15}$/)
    .or(z.literal(""))
    .default(""),
  notes: z.string().trim().max(500).default(""),
} as const;

export const controlInstanceInputSchema = z
  .object(controlInstanceFields)
  .strict()
  .refine(
    (value) =>
      new Set([value.publicDomain, value.adminDomain, value.apiDomain]).size ===
      3,
    {
      message:
        "Os dominios publico, administrativo e da API devem ser diferentes.",
      path: ["apiDomain"],
    },
  );

export const controlInstanceSchema = z
  .object({
    ...controlInstanceFields,
    id: z.string().uuid(),
    apiPort: z.number().int().min(1024).max(65535),
    status: controlInstanceStatusSchema,
    lastErrorCode: z.string().max(80).nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict()
  .refine(
    (value) =>
      new Set([value.publicDomain, value.adminDomain, value.apiDomain]).size ===
      3,
    {
      message:
        "Os dominios publico, administrativo e da API devem ser diferentes.",
      path: ["apiDomain"],
    },
  );

export const controlInstanceEventSchema = z
  .object({
    id: z.string().uuid(),
    instanceId: z.string().uuid(),
    type: z.enum([
      "created",
      "prepared",
      "status_changed",
      "preparation_failed",
    ]),
    message: z.string().trim().min(1).max(240),
    createdAt: z.string().datetime(),
  })
  .strict();

export const controlOverviewSchema = z
  .object({
    total: z.number().int().nonnegative(),
    draft: z.number().int().nonnegative(),
    prepared: z.number().int().nonnegative(),
    active: z.number().int().nonnegative(),
    attention: z.number().int().nonnegative(),
  })
  .strict();

export const controlReadinessItemSchema = z
  .object({
    key: z.string().trim().min(1).max(60),
    label: z.string().trim().min(1).max(100),
    status: z.enum(["pending", "ready", "blocked"]),
    detail: z.string().trim().min(1).max(240),
  })
  .strict();

export const controlReadinessSchema = z
  .object({
    instanceId: z.string().uuid(),
    readyToProvision: z.boolean(),
    items: z.array(controlReadinessItemSchema).max(12),
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
export type PixCheckoutRequest = z.infer<typeof pixCheckoutRequestSchema>;
export type PixCheckoutResponse = z.infer<typeof pixCheckoutResponseSchema>;
export type PixPaymentDetails = z.infer<typeof pixPaymentDetailsSchema>;
export type PixSettings = z.infer<typeof pixSettingsSchema>;
export type PaymentMethodsResponse = z.infer<
  typeof paymentMethodsResponseSchema
>;
export type AdminPixPaymentDecision = z.infer<
  typeof adminPixPaymentDecisionSchema
>;
export type CheckoutStatusResponse = z.infer<
  typeof checkoutStatusResponseSchema
>;
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
export type WhatsappRequest = z.infer<typeof whatsappRequestSchema>;
export type WhatsappResponse = z.infer<typeof whatsappResponseSchema>;
export type AdminProductInput = z.infer<typeof adminProductInputSchema>;
export type AdminCategoryInput = z.infer<typeof adminCategoryInputSchema>;
export type AdminProductRow = z.infer<typeof adminProductRowSchema>;
export type OrderSummary = z.infer<typeof orderSummarySchema>;
export type AdminOrderUpdate = z.infer<typeof adminOrderUpdateSchema>;
export type AdminWhatsappRevenueUpdate = z.infer<
  typeof adminWhatsappRevenueUpdateSchema
>;
export type AdminOrderArchiveInput = z.infer<
  typeof adminOrderArchiveInputSchema
>;
export type StorefrontSettings = z.infer<typeof storefrontSettingsSchema>;
export type StorefrontTextStyle = z.infer<typeof storefrontTextStyleSchema>;
export type StorefrontTextFont = z.infer<typeof storefrontTextFontSchema>;
export type HomeMotionPreset = z.infer<typeof homeMotionPresetSchema>;
export type ManifestoItem = z.infer<typeof manifestoItemSchema>;
export type ReviewItem = z.infer<typeof reviewItemSchema>;
export type HomeSection = z.infer<typeof homeSectionSchema>;
export type FooterLink = z.infer<typeof footerLinkSchema>;
export type TypographyPreset = z.infer<typeof typographyPresetSchema>;
export type ImageUploadResponse = z.infer<typeof imageUploadResponseSchema>;
export type ImageDeleteRequest = z.infer<typeof imageDeleteRequestSchema>;
export type ImageDeleteResponse = z.infer<typeof imageDeleteResponseSchema>;
export type SupportedImageContentType = z.infer<
  typeof supportedImageContentTypeSchema
>;
export type ControlInstanceStatus = z.infer<typeof controlInstanceStatusSchema>;
export type ControlInstanceInput = z.infer<typeof controlInstanceInputSchema>;
export type ControlInstance = z.infer<typeof controlInstanceSchema>;
export type ControlInstanceEvent = z.infer<typeof controlInstanceEventSchema>;
export type ControlOverview = z.infer<typeof controlOverviewSchema>;
export type ControlReadinessItem = z.infer<typeof controlReadinessItemSchema>;
export type ControlReadiness = z.infer<typeof controlReadinessSchema>;
