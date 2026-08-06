import type { CartItemInput, PricedCart } from "@bespoke/contracts";
import { ApiError } from "../../shared/api-error.js";
import { CatalogService } from "../catalog/catalog.service.js";

export class CartService {
  constructor(private readonly catalog: CatalogService) {}

  async price(items: CartItemInput[]): Promise<PricedCart> {
    const snapshot = await this.priceProducts(items);
    return {
      ...snapshot,
      shippingAmountInCents: null,
      shippingMode: "whatsapp_after_payment",
      totalInCents: snapshot.subtotalInCents - snapshot.discountInCents,
    };
  }

  async assertAvailable(items: CartItemInput[]) {
    const priced = await this.price(items);
    const unavailable = priced.lines.find((line) => !line.available);
    if (unavailable) {
      throw new ApiError(409, "INSUFFICIENT_STOCK", "Requested quantity is not available.");
    }

    return priced;
  }

  private async priceProducts(
    items: CartItemInput[],
  ): Promise<
    Omit<
      PricedCart,
      "shippingAmountInCents" | "shippingMode" | "totalInCents"
    >
  > {
    const aggregated = new Map<string, number>();
    for (const item of items) {
      aggregated.set(item.productId, (aggregated.get(item.productId) ?? 0) + item.quantity);
    }

    const lines = await Promise.all([...aggregated.entries()].map(async ([productId, quantity]) => {
      const product = await this.catalog.findById(productId);
      if (!product) {
        throw new ApiError(404, "PRODUCT_NOT_FOUND", "Product not found.");
      }

      const available = product.stock >= quantity;
      const subtotalInCents = product.priceInCents * quantity;

      return {
        productId,
        name: product.name,
        sku: product.sku,
        quantity,
        unitPriceInCents: product.priceInCents,
        subtotalInCents,
        imageUrl: product.images[0]!.url,
        available,
        stock: product.stock
      };
    }));

    const subtotalInCents = lines.reduce((total, line) => total + line.subtotalInCents, 0);
    const discountInCents = 0;

    return {
      lines,
      subtotalInCents,
      discountInCents,
      currency: "BRL"
    };
  }

}
