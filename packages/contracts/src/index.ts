import { z } from "zod";

export const idSchema = z.string().uuid();
export const slugSchema = z.string().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const moneyInCentsSchema = z.number().int().min(0).max(99_999_999);
export const quantitySchema = z.number().int().min(1).max(99);

export const orderStatusSchema = z.enum([
  "draft",
  "pending_payment",
  "paid",
  "preparing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded"
]);

export const paymentStatusSchema = z.enum([
  "created",
  "pending",
  "approved",
  "rejected",
  "cancelled",
  "refunded"
]);

export const whatsappStatusSchema = z.enum([
  "contact_requested",
  "conversation_started",
  "quote_confirmed",
  "awaiting_payment",
  "converted_to_order",
  "completed",
  "cancelled"
]);

export const categorySchema = z.object({
  id: idSchema,
  slug: slugSchema,
  name: z.string().min(2).max(80),
  description: z.string().max(240).nullable()
});

export const productImageSchema = z.object({
  id: idSchema,
  url: z.string().url(),
  alt: z.string().min(1).max(160),
  width: z.number().int().positive(),
  height: z.number().int().positive()
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
  images: z.array(productImageSchema).min(1),
  tags: z.array(z.string().min(1).max(40)).max(12),
  isActive: z.boolean()
});

export const catalogQuerySchema = z
  .object({
    cursor: z.string().min(1).max(200).optional(),
    limit: z.coerce.number().int().min(1).max(24).default(12),
    search: z.string().trim().max(80).optional(),
    category: slugSchema.optional(),
    sort: z.enum(["featured", "price_asc", "price_desc", "newest"]).default("featured")
  })
  .strict();

export const catalogResponseSchema = z.object({
  items: z.array(productSchema),
  nextCursor: z.string().nullable()
});

export const cartItemInputSchema = z
  .object({
    productId: idSchema,
    quantity: quantitySchema
  })
  .strict();

export const postalCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{5}-?\d{3}$/, "CEP invalido.");

export const shippingQuoteSchema = z.object({
  provider: z.enum(["correios", "fallback", "store_policy"]),
  serviceCode: z.string().min(2).max(20),
  destinationPostalCode: postalCodeSchema.optional(),
  priceInCents: moneyInCentsSchema,
  estimatedDays: z.number().int().min(0).nullable(),
  message: z.string().max(240).optional()
});

export const cartPriceRequestSchema = z
  .object({
    items: z.array(cartItemInputSchema).min(1).max(50),
    destinationPostalCode: postalCodeSchema.optional()
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
  stock: z.number().int().min(0)
});

export const pricedCartSchema = z.object({
  lines: z.array(cartLineSchema),
  subtotalInCents: moneyInCentsSchema,
  discountInCents: moneyInCentsSchema,
  shippingInCents: moneyInCentsSchema,
  totalInCents: moneyInCentsSchema,
  currency: z.literal("BRL"),
  shipping: shippingQuoteSchema
});

export const checkoutRequestSchema = z
  .object({
    items: z.array(cartItemInputSchema).min(1).max(50),
    customer: z
      .object({
        name: z.string().min(2).max(120),
        email: z.string().email().max(160),
        phone: z.string().min(8).max(24)
      })
      .strict(),
    shipping: z
      .object({
        destinationPostalCode: postalCodeSchema
      })
      .strict()
  })
  .strict();

export const checkoutResponseSchema = z.object({
  orderReference: z.string().min(8).max(40),
  preferenceId: z.string().min(1).max(120).nullable(),
  checkoutUrl: z.string().url(),
  status: z.literal("pending_payment")
});

export const whatsappRequestSchema = z
  .object({
    items: z.array(cartItemInputSchema).min(1).max(50),
    destinationPostalCode: postalCodeSchema.optional()
  })
  .strict();

export const whatsappResponseSchema = z.object({
  requestReference: z.string().min(8).max(40),
  url: z.string().url(),
  status: whatsappStatusSchema
});

export const adminProductInputSchema = z
  .object({
    sku: z.string().min(2).max(48),
    slug: slugSchema.optional(),
    name: z.string().min(2).max(120),
    subtitle: z.string().max(160).nullable().optional(),
    description: z.string().min(20).max(2000),
    categorySlug: slugSchema,
    priceInCents: moneyInCentsSchema.refine((value) => value > 0, "Preco deve ser maior que zero."),
    compareAtPriceInCents: moneyInCentsSchema.nullable().optional(),
    stock: z.number().int().min(0),
    lowStockThreshold: z.number().int().min(0),
    imageUrl: z.string().url(),
    imageAlt: z.string().min(1).max(160),
    isActive: z.boolean().default(true)
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
  status: z.enum(["active", "inactive"]),
  lowStock: z.boolean(),
  imageUrl: z.string().url(),
  imageAlt: z.string()
});

export const orderSummarySchema = z.object({
  id: idSchema,
  publicReference: z.string().min(8).max(40),
  customerName: z.string().min(2).max(120).nullable(),
  customerEmail: z.string().email().nullable(),
  customerPhone: z.string().min(8).max(24).nullable(),
  status: orderStatusSchema.or(whatsappStatusSchema),
  salesChannel: z.enum(["online", "whatsapp"]),
  subtotalInCents: moneyInCentsSchema,
  discountInCents: moneyInCentsSchema,
  shippingInCents: moneyInCentsSchema,
  totalInCents: moneyInCentsSchema,
  currency: z.literal("BRL"),
  createdAt: z.string(),
  updatedAt: z.string(),
  items: z.array(cartLineSchema.pick({
    productId: true,
    name: true,
    sku: true,
    quantity: true,
    unitPriceInCents: true,
    subtotalInCents: true,
    imageUrl: true
  }))
});

export const storefrontSettingsSchema = z
  .object({
    brandName: z.string().min(2).max(80),
    logoUrl: z.string().url().or(z.literal("")),
    heroImageUrl: z.string().url(),
    heroEyebrow: z.string().min(2).max(80).default("Loja Bespoke"),
    heroTitle: z.string().min(2).max(100),
    heroSubtitle: z.string().min(10).max(280),
    heroPrimaryCtaLabel: z.string().min(2).max(80).default("Explorar catalogo"),
    heroSecondaryCtaLabel: z.string().min(2).max(80).default("Atendimento exclusivo"),
    heroHeight: z.enum(["compact", "balanced", "immersive"]).default("balanced"),
    featuredEyebrow: z.string().min(2).max(80).default("Selecao inicial"),
    featuredTitle: z.string().min(2).max(100).default("Produtos em destaque"),
    featuredLinkLabel: z.string().min(2).max(80).default("Ver todos"),
    homeLayout: z.enum(["editorial", "compact", "showcase"]).default("editorial"),
    productCardStyle: z.enum(["minimal", "boutique", "editorial"]).default("boutique"),
    imageFit: z.enum(["contain", "cover"]).default("contain"),
    footerSlogan: z.string().min(10).max(220).default("Curadoria reservada, cuidado impecavel e escolhas feitas para poucos."),
    footerPrivacyLabel: z.string().min(2).max(40).default("Privacidade"),
    footerCatalogLabel: z.string().min(2).max(40).default("Catalogo"),
    footerSupportLabel: z.string().min(2).max(40).default("Suporte"),
    primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/)
  })
  .strict();

export type Category = z.infer<typeof categorySchema>;
export type Product = z.infer<typeof productSchema>;
export type CatalogQuery = z.infer<typeof catalogQuerySchema>;
export type CatalogResponse = z.infer<typeof catalogResponseSchema>;
export type CartItemInput = z.infer<typeof cartItemInputSchema>;
export type ShippingQuote = z.infer<typeof shippingQuoteSchema>;
export type PricedCart = z.infer<typeof pricedCartSchema>;
export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;
export type CheckoutResponse = z.infer<typeof checkoutResponseSchema>;
export type WhatsappRequest = z.infer<typeof whatsappRequestSchema>;
export type WhatsappResponse = z.infer<typeof whatsappResponseSchema>;
export type AdminProductInput = z.infer<typeof adminProductInputSchema>;
export type AdminProductRow = z.infer<typeof adminProductRowSchema>;
export type OrderSummary = z.infer<typeof orderSummarySchema>;
export type StorefrontSettings = z.infer<typeof storefrontSettingsSchema>;
