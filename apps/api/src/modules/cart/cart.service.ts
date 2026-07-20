import type { CartItemInput, PricedCart, ShippingQuote } from "@bespoke/contracts";
import { ApiError } from "../../shared/api-error.js";
import { CatalogService } from "../catalog/catalog.service.js";
import { ShippingService } from "../shipping/shipping.service.js";

export class CartService {
  constructor(private readonly catalog: CatalogService, private readonly shipping: ShippingService) {}

  async price(items: CartItemInput[], destinationPostalCode?: string): Promise<PricedCart> {
    const snapshot = await this.priceWithoutShipping(items);
    const shipping = await this.shipping.quote({
      items,
      subtotalInCents: snapshot.subtotalInCents,
      destinationPostalCode
    });

    return this.withShipping(snapshot, shipping);
  }

  async assertAvailable(items: CartItemInput[], destinationPostalCode?: string) {
    const priced = await this.price(items, destinationPostalCode);
    const unavailable = priced.lines.find((line) => !line.available);
    if (unavailable) {
      throw new ApiError(409, "INSUFFICIENT_STOCK", "Requested quantity is not available.");
    }

    return priced;
  }

  private async priceWithoutShipping(items: CartItemInput[]): Promise<Omit<PricedCart, "shippingInCents" | "totalInCents" | "shipping">> {
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

  private withShipping(
    cart: Omit<PricedCart, "shippingInCents" | "totalInCents" | "shipping">,
    shipping: ShippingQuote
  ): PricedCart {
    return {
      ...cart,
      shippingInCents: shipping.priceInCents,
      totalInCents: cart.subtotalInCents - cart.discountInCents + shipping.priceInCents,
      shipping
    };
  }
}
