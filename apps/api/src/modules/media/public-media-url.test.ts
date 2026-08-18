import { describe, expect, it } from "vitest";
import {
  publicMediaUrl,
  publicProductMedia,
  publicStorefrontMedia,
} from "./public-media-url.js";
import { defaultStorefront } from "../store/commerce.store.js";
import type { Product } from "@bespoke/contracts";

const uploadId = "123e4567-e89b-42d3-a456-426614174000";
const localUpload = `http://127.0.0.1:3333/uploads/images/${uploadId}.png`;
const publicApiUrl = "https://example.ngrok-free.dev/api";

describe("publicMediaUrl", () => {
  it("rebases a managed upload onto the active public origin", () => {
    expect(publicMediaUrl(localUpload, publicApiUrl)).toBe(
      `https://example.ngrok-free.dev/uploads/images/${uploadId}.png`,
    );
  });

  it("preserves external and unmanaged image URLs", () => {
    const external = "https://images.example.com/catalog/product.png";
    const unmanaged = "http://127.0.0.1:3333/other/product.png";

    expect(publicMediaUrl(external, publicApiUrl)).toBe(external);
    expect(publicMediaUrl(unmanaged, publicApiUrl)).toBe(unmanaged);
  });

  it("rebases product images without mutating the stored product", () => {
    const product = {
      id: uploadId,
      slug: "produto-teste",
      sku: "PROD-001",
      name: "Produto teste",
      subtitle: null,
      description: "Descricao completa para o produto de teste.",
      category: {
        id: "223e4567-e89b-42d3-a456-426614174000",
        slug: "categoria",
        name: "Categoria",
        description: null,
      },
      priceInCents: 1000,
      compareAtPriceInCents: null,
      stock: 10,
      lowStockThreshold: 2,
      lowStockWarningEnabled: false,
      images: [
        {
          id: "323e4567-e89b-42d3-a456-426614174000",
          url: localUpload,
          alt: "Produto teste",
          width: 800,
          height: 800,
        },
      ],
      tags: [],
      isActive: true,
      isFeatured: true,
      sortOrder: 0,
    } satisfies Product;

    const result = publicProductMedia(product, publicApiUrl);

    expect(result.images[0]?.url).toContain("example.ngrok-free.dev/uploads");
    expect(product.images[0]?.url).toBe(localUpload);
  });

  it("rebases every managed storefront asset without mutating settings", () => {
    const settings = {
      ...defaultStorefront,
      logoUrl: localUpload,
      logoOnDarkUrl: localUpload,
      faviconUrl: localUpload,
      socialImageUrl: localUpload,
      heroImageUrl: localUpload,
      footerLinks: defaultStorefront.footerLinks.map((link, index) => ({
        ...link,
        iconUrl: index === 0 ? localUpload : link.iconUrl,
      })),
    };

    const result = publicStorefrontMedia(settings, publicApiUrl);

    expect(result.logoUrl).toContain("example.ngrok-free.dev/uploads");
    expect(result.logoUrl).toContain("variant=logo");
    expect(result.logoOnDarkUrl).toContain("variant=logo");
    expect(result.heroImageUrl).toContain("example.ngrok-free.dev/uploads");
    expect(result.footerLinks[0]?.iconUrl).toContain(
      "example.ngrok-free.dev/uploads",
    );
    expect(settings.logoUrl).toBe(localUpload);
  });
});
