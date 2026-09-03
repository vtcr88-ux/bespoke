import type {
  AdminCategoryInput,
  AdminOrderArchiveInput,
  AdminOrderUpdate,
  AdminProductInput,
  AdminPixPaymentDecision,
  PixSettings,
  StorefrontSettings,
} from "@bespoke/contracts";
import { orderSummarySchema } from "@bespoke/contracts";
import type { CommerceStoreAdapter } from "../store/commerce.store.js";
import { ApiError, assertFound } from "../../shared/api-error.js";

export class AdminService {
  constructor(private readonly store: CommerceStoreAdapter) {}

  async overview() {
    const products = await this.store.adminProducts();
    const orders = await this.store.orders();
    const confirmedOrders = orders.filter(
      (order) => order.revenueConfirmedAt !== null,
    );
    const confirmedRevenueInCents = confirmedOrders
      .reduce((total, order) => total + order.totalInCents, 0);
    const pendingOrders = orders.filter(
      (order) =>
        order.status === "pending_payment" ||
        order.status === "contact_requested",
    ).length;
    const activeProducts = products.filter(
      (product) => product.status === "active",
    );
    const inventoryValueInCents = activeProducts.reduce(
      (total, product) => total + product.priceInCents * product.stock,
      0,
    );
    const activeStockUnits = activeProducts.reduce(
      (total, product) => total + product.stock,
      0,
    );
    const lowStockCount = activeProducts.filter(
      (product) =>
        product.lowStockWarningEnabled &&
        product.stock <= product.lowStockThreshold,
    ).length;
    const revenueByChannel = confirmedOrders.reduce(
      (totals, order) => ({
        ...totals,
        [order.salesChannel]: totals[order.salesChannel] + order.totalInCents,
      }),
      { online: 0, whatsapp: 0 },
    );
    const monthlyRevenueMap = new Map<
      string,
      { onlineInCents: number; whatsappInCents: number }
    >();
    for (const order of confirmedOrders) {
      const month = order.revenueConfirmedAt!.slice(0, 7);
      const current = monthlyRevenueMap.get(month) ?? {
        onlineInCents: 0,
        whatsappInCents: 0,
      };
      current[
        order.salesChannel === "online" ? "onlineInCents" : "whatsappInCents"
      ] += order.totalInCents;
      monthlyRevenueMap.set(month, current);
    }
    const monthlyRevenue = [...monthlyRevenueMap.entries()]
      .sort(([left], [right]) => right.localeCompare(left))
      .map(([month, values]) => ({
        month,
        ...values,
        totalInCents: values.onlineInCents + values.whatsappInCents,
      }));

    return {
      metrics: {
        confirmedRevenueInCents,
        pendingOrders,
        lowStockCount,
        activeProducts: activeProducts.length,
        activeStockUnits,
        inventoryValueInCents,
      },
      revenueByChannel,
      monthlyRevenue,
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

  async orders(archived = false) {
    return (await this.store.orders({ archived })).map((order) =>
      orderSummarySchema.parse(order),
    );
  }

  async setWhatsappRevenueConfirmed(
    orderReference: string,
    confirmed: boolean,
  ) {
    const order = assertFound(
      (await this.store.orders()).find(
        (candidate) => candidate.publicReference === orderReference,
      ),
      "ORDER_NOT_FOUND",
      "Order not found.",
    );
    if (order.salesChannel !== "whatsapp") {
      throw new ApiError(
        409,
        "PAYMENT_PROVIDER_AUTHORITATIVE",
        "Pagamentos online so podem ser confirmados pelo Mercado Pago.",
      );
    }
    return orderSummarySchema.parse(
      await this.store.setWhatsappRevenueConfirmed(orderReference, confirmed),
    );
  }

  async setPixPaymentStatus(
    orderReference: string,
    input: AdminPixPaymentDecision,
  ) {
    const order = assertFound(
      (await this.store.orders()).find(
        (candidate) => candidate.publicReference === orderReference,
      ),
      "ORDER_NOT_FOUND",
      "Order not found.",
    );
    if (order.paymentMethod !== "pix_manual") {
      throw new ApiError(
        409,
        "PAYMENT_PROVIDER_AUTHORITATIVE",
        "Somente pagamentos Pix manuais podem ser revisados por esta acao.",
      );
    }
    return orderSummarySchema.parse(
      await this.store.setPixPaymentStatus(orderReference, input.status),
    );
  }

  async setOrdersArchived(input: AdminOrderArchiveInput) {
    return this.store.setOrdersArchived(input);
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

  async pixSettings() {
    return this.store.pixSettings();
  }

  async updatePixSettings(input: PixSettings) {
    return this.store.updatePixSettings(input);
  }

  async isImageReferenced(url: string) {
    const [products, orders, archivedOrders, storefront] = await Promise.all([
      this.store.products({ includeInactive: true }),
      this.store.orders(),
      this.store.orders({ archived: true }),
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
      [...orders, ...archivedOrders].some((order) =>
        order.items.some((item) => item.imageUrl === url),
      )
    );
  }
}
