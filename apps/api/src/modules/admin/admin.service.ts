import type {
  AdminCategoryInput,
  AdminOrderUpdate,
  AdminProductInput,
  StorefrontSettings,
} from "@bespoke/contracts";
import { orderSummarySchema } from "@bespoke/contracts";
import type { CommerceStoreAdapter } from "../store/commerce.store.js";
import { ApiError, assertFound } from "../../shared/api-error.js";

export class AdminService {
  constructor(private readonly store: CommerceStoreAdapter) {}

  async overview() {
    const products = await this.store.products({ includeInactive: true });
    const orders = await this.store.orders();
    const confirmedRevenueInCents = orders
      .filter(
        (order) =>
          order.status === "paid" ||
          order.status === "preparing" ||
          order.status === "shipped" ||
          order.status === "delivered",
      )
      .reduce((total, order) => total + order.totalInCents, 0);
    const pendingOrders = orders.filter(
      (order) =>
        order.status === "pending_payment" ||
        order.status === "contact_requested",
    ).length;
    const inventoryValueInCents = products.reduce(
      (total, product) => total + product.priceInCents * product.stock,
      0,
    );
    const lowStockCount = products.filter(
      (product) => product.stock <= product.lowStockThreshold,
    ).length;

    return {
      metrics: {
        confirmedRevenueInCents,
        pendingOrders,
        lowStockCount,
        activeProducts: products.filter((product) => product.isActive).length,
        inventoryValueInCents,
      },
      categories: await this.store.categories(),
      recentOrders: orders.slice(0, 6),
      alerts:
        lowStockCount > 0
          ? [
              {
                tone: "warning",
                message:
                  "Produtos abaixo do limite de estoque precisam de revisao.",
              },
            ]
          : [],
    };
  }

  async products() {
    return this.store.adminProducts();
  }

  async createCategory(input: AdminCategoryInput) {
    return this.store.createCategory(input);
  }

  async product(id: string) {
    return (
      (await this.store.adminProducts()).find((product) => product.id === id) ??
      null
    );
  }

  async createProduct(input: AdminProductInput) {
    return this.store.createProduct(input);
  }

  async updateProduct(id: string, input: AdminProductInput) {
    return this.store.updateProduct(id, input);
  }

  async deleteProduct(id: string) {
    await this.store.deleteProduct(id);
  }

  async orders() {
    return (await this.store.orders()).map((order) =>
      orderSummarySchema.parse(order),
    );
  }

  async updateOrder(orderReference: string, input: AdminOrderUpdate) {
    const order = assertFound(
      (await this.store.orders()).find(
        (candidate) => candidate.publicReference === orderReference,
      ),
      "ORDER_NOT_FOUND",
      "Order not found.",
    );
    if (
      order.paymentStatus !== "approved" &&
      !["awaiting_payment", "cancelled"].includes(input.shippingStatus)
    ) {
      throw new ApiError(
        409,
        "PAYMENT_NOT_APPROVED",
        "O pedido nao pode avancar na entrega antes da aprovacao do pagamento.",
      );
    }
    return orderSummarySchema.parse(
      await this.store.updateOrder(orderReference, input),
    );
  }

  async storefront() {
    return this.store.storefront();
  }

  async updateStorefront(input: StorefrontSettings) {
    return this.store.updateStorefront(input);
  }

  async isImageReferenced(url: string) {
    const [products, orders, storefront] = await Promise.all([
      this.store.products({ includeInactive: true }),
      this.store.orders(),
      this.store.storefront(),
    ]);
    const storefrontImages = [
      storefront.logoUrl,
      storefront.logoOnDarkUrl,
      storefront.faviconUrl,
      storefront.socialImageUrl,
      storefront.heroImageUrl,
      ...storefront.footerLinks.map((link) => link.iconUrl),
    ];

    return (
      storefrontImages.includes(url) ||
      products.some((product) =>
        product.images.some((image) => image.url === url),
      ) ||
      orders.some((order) => order.items.some((item) => item.imageUrl === url))
    );
  }
}
