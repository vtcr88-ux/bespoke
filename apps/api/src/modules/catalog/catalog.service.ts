import type {
  CatalogQuery,
  CatalogResponse,
  Product,
} from "@bespoke/contracts";
import type { CommerceStoreAdapter } from "../store/commerce.store.js";

export class CatalogService {
  constructor(private readonly store: CommerceStoreAdapter) {}

  async list(query: CatalogQuery): Promise<CatalogResponse> {
    const search = query.search?.toLocaleLowerCase("pt-BR");
    let filtered = await this.store.products();

    if (query.category) {
      filtered = filtered.filter(
        (product) => product.category.slug === query.category,
      );
    }

    if (query.featured !== undefined) {
      filtered = filtered.filter(
        (product) => product.isFeatured === query.featured,
      );
    }

    if (search) {
      filtered = filtered.filter((product) =>
        [
          product.name,
          product.subtitle,
          product.description,
          product.sku,
          ...product.tags,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLocaleLowerCase("pt-BR").includes(search),
          ),
      );
    }

    filtered = [...filtered].sort((a, b) => {
      if (query.sort === "price_asc") return a.priceInCents - b.priceInCents;
      if (query.sort === "price_desc") return b.priceInCents - a.priceInCents;
      if (query.sort === "newest") return b.id.localeCompare(a.id);
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.name.localeCompare(b.name, "pt-BR");
    });

    const offset = query.cursor
      ? Number.parseInt(
          Buffer.from(query.cursor, "base64url").toString("utf8"),
          10,
        )
      : 0;
    const safeOffset = Number.isFinite(offset) && offset >= 0 ? offset : 0;
    const items = filtered.slice(safeOffset, safeOffset + query.limit);
    const nextOffset = safeOffset + query.limit;

    return {
      items,
      nextCursor:
        nextOffset < filtered.length
          ? Buffer.from(String(nextOffset)).toString("base64url")
          : null,
    };
  }

  async findBySlug(slug: string): Promise<Product | null> {
    return this.store.findProductBySlug(slug);
  }

  async findById(id: string): Promise<Product | null> {
    return this.store.findProductById(id);
  }
}
