import { describe, expect, it } from "vitest";
import {
  adminProductInputSchema,
  adminOrderUpdateSchema,
  adminCategoryInputSchema,
  cartPriceRequestSchema,
  checkoutRequestSchema,
  catalogQuerySchema,
  defaultFooterLinks,
  defaultHomeSections,
  formatFooterCopyright,
  orderFooterLinks,
  storefrontSettingsSchema,
} from "./index.js";

describe("contracts", () => {
  it("rejects unknown cart item fields", () => {
    const result = cartPriceRequestSchema.safeParse({
      items: [
        {
          productId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
          quantity: 1,
          priceInCents: 1,
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("requires explicit shipping acknowledgement without accepting a CEP", () => {
    const base = {
      items: [
        {
          productId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
          quantity: 1,
        },
      ],
      customer: {
        name: "Cliente Teste",
        email: "cliente@example.test",
        phone: "11999999999",
      },
    };
    expect(
      checkoutRequestSchema.safeParse({
        ...base,
        shippingAcknowledged: true,
      }).success,
    ).toBe(true);
    expect(
      checkoutRequestSchema.safeParse({
        ...base,
        shippingAcknowledged: false,
      }).success,
    ).toBe(false);
    expect(
      checkoutRequestSchema.safeParse({
        ...base,
        shippingAcknowledged: true,
        destinationPostalCode: "01001001",
      }).success,
    ).toBe(false);
  });

  it("accepts safe footer destinations and rejects executable links", () => {
    const base = {
      brandName: "Bespoke",
      logoUrl: "",
      heroImageUrl: "https://example.com/hero.webp",
      heroTitle: "Bespoke",
      manifestoLineOne: "UMA EXPERIENCIA EXCLUSIVA, SOFISTICADA",
      manifestoLineTwo:
        "CUIDADOSAMENTE SELECIONADA PARA QUEM VALORIZA PRESENCA",
      primaryColor: "#090907",
      accentColor: "#c9a76d",
      backgroundColor: "#ffffff",
    };

    const valid = storefrontSettingsSchema.safeParse({
      ...base,
      footerLinks: [
        {
          id: "00000000-0000-4000-8000-000000000201",
          label: "Instagram",
          href: "https://instagram.com/bespoke",
          iconUrl: "https://example.com/instagram.webp",
        },
        {
          id: "00000000-0000-4000-8000-000000000202",
          label: "Telefone",
          href: "tel:+5511999999999",
          iconUrl: "",
        },
      ],
    });
    const invalid = storefrontSettingsSchema.safeParse({
      ...base,
      footerLinks: [
        {
          id: "00000000-0000-4000-8000-000000000203",
          label: "Inseguro",
          href: "javascript:alert(1)",
          iconUrl: "",
        },
      ],
    });

    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.heroEyebrowFontSize).toBe(12);
      expect(valid.data.heroTitleFontSize).toBe(56);
      expect(valid.data.footerShowBrandName).toBe(true);
      expect(
        storefrontSettingsSchema.parse({
          ...valid.data,
          footerShowBrandName: false,
        }).footerShowBrandName,
      ).toBe(false);
    }
    expect(invalid.success).toBe(false);
  });

  it("keeps every footer copy field editable and resolves white-label tokens", () => {
    const settings = storefrontSettingsSchema.parse({
      brandName: "Divinas",
      logoUrl: "",
      heroImageUrl: "https://example.com/hero.webp",
      heroTitle: "Divinas",
      primaryColor: "#090907",
      accentColor: "#c9a76d",
      backgroundColor: "#ffffff",
      footerSlogan: "",
      footerServiceLineTwo: "",
      footerSecurityText: "",
    });

    expect(settings.footerHeading).toBe("Loja");
    expect(settings.footerServiceHeading).toBe("Atendimento");
    expect(settings.footerSlogan).toBe("");
    expect(settings.footerServiceLineTwo).toBe("");
    expect(settings.footerSecurityText).toBe("");
    expect(
      formatFooterCopyright(
        "\u00a9 {{year}} {{brand}} · Texto editavel.",
        "Divinas",
        2030,
      ),
    ).toBe("\u00a9 2030 Divinas · Texto editavel.");
  });

  it("accepts an icon-only footer link and rejects an invisible link", () => {
    const base = storefrontSettingsSchema.parse({
      brandName: "Bespoke",
      logoUrl: "",
      heroImageUrl: "https://example.com/hero.webp",
      heroTitle: "Bespoke",
      manifestoLineOne: "UMA EXPERIENCIA EXCLUSIVA, SOFISTICADA",
      manifestoLineTwo:
        "CUIDADOSAMENTE SELECIONADA PARA QUEM VALORIZA PRESENCA",
      primaryColor: "#090907",
      accentColor: "#c9a76d",
      backgroundColor: "#ffffff",
    });
    const iconOnlyLink = {
      id: "00000000-0000-4000-8000-000000000204",
      label: "",
      href: "https://instagram.com/bespoke",
      iconUrl: "https://example.com/instagram.webp",
    };

    expect(
      storefrontSettingsSchema.safeParse({
        ...base,
        footerLinks: [iconOnlyLink],
      }).success,
    ).toBe(true);
    expect(
      storefrontSettingsSchema.safeParse({
        ...base,
        footerLinks: [{ ...iconOnlyLink, iconUrl: "" }],
      }).success,
    ).toBe(false);
  });

  it("keeps custom footer links above the built-in navigation", () => {
    const customLink = {
      id: "00000000-0000-4000-8000-000000000210",
      label: "Instagram",
      href: "https://instagram.com/bespoke",
      iconUrl: "https://example.com/instagram.webp",
    };

    expect(
      orderFooterLinks([
        defaultFooterLinks[2]!,
        customLink,
        defaultFooterLinks[0]!,
        defaultFooterLinks[1]!,
      ]),
    ).toEqual([customLink, ...defaultFooterLinks]);
  });

  it("validates responsive hero typography limits", () => {
    const base = storefrontSettingsSchema.parse({
      brandName: "Bespoke",
      logoUrl: "",
      heroImageUrl: "https://example.com/hero.webp",
      heroTitle: "Bespoke",
      manifestoLineOne: "UMA EXPERIENCIA EXCLUSIVA, SOFISTICADA",
      manifestoLineTwo:
        "CUIDADOSAMENTE SELECIONADA PARA QUEM VALORIZA PRESENCA",
      primaryColor: "#090907",
      accentColor: "#c9a76d",
      backgroundColor: "#ffffff",
    });

    expect(
      storefrontSettingsSchema.safeParse({
        ...base,
        heroEyebrowFontSize: 14,
        heroTitleFontSize: 64,
      }).success,
    ).toBe(true);
    expect(
      storefrontSettingsSchema.safeParse({
        ...base,
        heroTitleFontSize: 120,
      }).success,
    ).toBe(false);
  });

  it("accepts optional Hero copy and validates per-block visual settings", () => {
    const settings = storefrontSettingsSchema.parse({
      brandName: "Bespoke",
      logoUrl: "",
      heroImageUrl: "https://example.com/hero.webp",
      heroEyebrow: "",
      heroTitle: "",
      manifestoLineOne: "PRIMEIRA LINHA",
      manifestoLineTwo: "SEGUNDA LINHA",
      primaryColor: "#090907",
      accentColor: "#c9a76d",
      backgroundColor: "#ffffff",
    });

    expect(settings.heroEyebrow).toBe("");
    expect(settings.heroTitle).toBe("");
    expect(settings.homeMotionByBlock.navigation).toBe("cascade");
    expect(settings.homeTextStyles.heroTitle.fontFamily).toBe("display");
    expect(settings.editorialNavigationMobileEnabled).toBe(false);
    expect(
      storefrontSettingsSchema.safeParse({
        ...settings,
        homeTextStyles: {
          ...settings.homeTextStyles,
          featuredTitle: {
            ...settings.homeTextStyles.featuredTitle,
            color: "champagne",
          },
        },
      }).success,
    ).toBe(false);
  });

  it("keeps editable WhatsApp messages as plain complementary text", () => {
    const settings = storefrontSettingsSchema.parse({
      brandName: "Bespoke",
      logoUrl: "",
      heroImageUrl: "https://example.com/hero.webp",
      heroTitle: "Bespoke",
      manifestoLineOne: "PRIMEIRA LINHA",
      manifestoLineTwo: "SEGUNDA LINHA",
      primaryColor: "#090907",
      accentColor: "#c9a76d",
      backgroundColor: "#ffffff",
    });
    expect(
      storefrontSettingsSchema.safeParse({
        ...settings,
        whatsappPurchaseMessage: "<script>alterar pedido</script>",
      }).success,
    ).toBe(false);
    expect(
      storefrontSettingsSchema.safeParse({
        ...settings,
        postPaymentWhatsappMessage: "Pedido {{internal_id}} confirmado.",
      }).success,
    ).toBe(false);
  });

  it("validates white-label brand and SEO settings", () => {
    const settings = storefrontSettingsSchema.parse({
      brandName: "Marca Exemplo",
      legalName: "Marca Exemplo Comercio Ltda",
      logoUrl: "https://example.com/logo.webp",
      logoOnDarkUrl: "https://example.com/logo-clara.webp",
      faviconUrl: "https://example.com/favicon.webp",
      socialImageUrl: "https://example.com/social.webp",
      contactEmail: "contato@example.com",
      defaultMetaTitle: "Marca Exemplo | Catalogo",
      defaultMetaDescription:
        "Conheca a curadoria da Marca Exemplo e escolha como concluir sua compra.",
      heroImageUrl: "https://example.com/hero.webp",
      heroTitle: "Marca Exemplo",
      manifestoLineOne: "PRIMEIRA LINHA",
      manifestoLineTwo: "SEGUNDA LINHA",
      primaryColor: "#090907",
      accentColor: "#c9a76d",
      backgroundColor: "#ffffff",
    });

    expect(settings.legalName).toBe("Marca Exemplo Comercio Ltda");
    expect(settings.faviconUrl).toContain("favicon.webp");
    expect(
      storefrontSettingsSchema.safeParse({
        ...settings,
        contactEmail: "email-invalido",
      }).success,
    ).toBe(false);
  });

  it("applies versioned Home defaults to legacy appearance settings", () => {
    const settings = storefrontSettingsSchema.parse({
      brandName: "Bespoke",
      logoUrl: "",
      heroImageUrl: "https://example.com/hero.webp",
      heroTitle: "Bespoke",
      manifestoLineOne: "PRIMEIRA LINHA DO MANIFESTO",
      manifestoLineTwo: "SEGUNDA LINHA DO MANIFESTO",
      primaryColor: "#090907",
      accentColor: "#c9a76d",
      backgroundColor: "#ffffff",
    });

    expect(settings.settingsVersion).toBe(2);
    expect(settings.homeSections).toEqual(defaultHomeSections);
    expect(settings.homeMotionPreset).toBe("editorial");
    expect(settings.homeTransitionPreset).toBe("editorial");
    expect(settings.featuredAddButtonLabel).toBe("Adicionar");
    expect(settings.featuredAddedButtonLabel).toBe("Adicionado");
    expect(settings.footerColor).toBe("#c9a76d");
  });

  it("accepts an empty manifesto and rejects invalid Home composition", () => {
    const base = storefrontSettingsSchema.parse({
      brandName: "Bespoke",
      logoUrl: "",
      heroImageUrl: "https://example.com/hero.webp",
      heroTitle: "Bespoke",
      manifestoLineOne: "",
      manifestoLineTwo: "",
      manifestoItems: [],
      primaryColor: "#090907",
      accentColor: "#c9a76d",
      backgroundColor: "#ffffff",
    });

    expect(base.manifestoItems).toEqual([]);
    expect(
      storefrontSettingsSchema.safeParse({
        ...base,
        homeSections: [
          { id: "manifesto", enabled: true },
          { id: "manifesto", enabled: false },
          { id: "featured", enabled: true },
        ],
      }).success,
    ).toBe(false);
    expect(
      storefrontSettingsSchema.safeParse({
        ...base,
        homeSurfaceColor: "champagne",
      }).success,
    ).toBe(false);
    expect(
      storefrontSettingsSchema.safeParse({
        ...base,
        homeTransitionOverlap: 120,
      }).success,
    ).toBe(false);
  });

  it("normalizes merchandising query and product defaults", () => {
    const query = catalogQuerySchema.parse({ featured: "true" });
    const product = adminProductInputSchema.parse({
      name: "Produto de teste",
      description: "Descricao suficientemente longa para validar o produto.",
      categorySlug: "rituais",
      priceInCents: 1000,
      stock: 2,
      lowStockThreshold: 1,
      imageUrl: "https://example.com/product.webp",
      imageAlt: "Produto de teste",
    });

    expect(query.featured).toBe(true);
    expect(product).toMatchObject({
      isActive: true,
      isFeatured: true,
      lowStockWarningEnabled: false,
      sortOrder: 0,
    });
    expect(product.sku).toBeUndefined();
  });

  it("validates categories created by the administrator", () => {
    expect(adminCategoryInputSchema.parse({ name: "  Presentes  " })).toEqual({
      name: "Presentes",
    });
    expect(adminCategoryInputSchema.safeParse({ name: "A" }).success).toBe(
      false,
    );
  });

  it("requires an address when delivery is already arranged", () => {
    const base = {
      shippingStatus: "arranged",
      contactStatus: "contact_started",
      shippingAmountInCents: null,
      shippingNotes: null,
      deliveryMethod: "delivery",
      pickupInstructions: null,
    };
    expect(
      adminOrderUpdateSchema.safeParse({ ...base, deliveryAddress: null })
        .success,
    ).toBe(false);
    expect(
      adminOrderUpdateSchema.safeParse({
        ...base,
        deliveryAddress: "Endereco informado durante o atendimento.",
      }).success,
    ).toBe(true);
  });

  it("rejects the obsolete single-line manifesto field", () => {
    const result = storefrontSettingsSchema.safeParse({
      brandName: "Bespoke",
      logoUrl: "",
      heroImageUrl: "https://example.com/hero.webp",
      heroTitle: "Bespoke",
      heroSubtitle: "Manifesto antigo que nao pertence ao contrato atual.",
      primaryColor: "#090907",
      accentColor: "#c9a76d",
      backgroundColor: "#ffffff",
    });

    expect(result.success).toBe(false);
  });
});
