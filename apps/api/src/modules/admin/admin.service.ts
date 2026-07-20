import type { AdminProductInput, StorefrontSettings } from "@bespoke/contracts";
import type { CommerceStoreAdapter } from "../store/commerce.store.js";

export class AdminService {
  constructor(private readonly store: CommerceStoreAdapter) {}

  async overview() {
    const products = await this.store.products({ includeInactive: true });
    const orders = await this.store.orders();
    const confirmedRevenueInCents = orders
      .filter((order) => order.status === "paid" || order.status === "preparing" || order.status === "shipped" || order.status === "delivered")
      .reduce((total, order) => total + order.totalInCents, 0);
    const pendingOrders = orders.filter((order) => order.status === "pending_payment" || order.status === "contact_requested").length;
    const inventoryValueInCents = products.reduce((total, product) => total + product.priceInCents * product.stock, 0);
    const lowStockCount = products.filter((product) => product.stock <= product.lowStockThreshold).length;

    return {
      metrics: {
        confirmedRevenueInCents,
        pendingOrders,
        lowStockCount,
        activeProducts: products.filter((product) => product.isActive).length,
        inventoryValueInCents
      },
      categories: await this.store.categories(),
      recentOrders: orders.slice(0, 6),
      alerts: lowStockCount > 0 ? [{ tone: "warning", message: "Produtos abaixo do limite de estoque precisam de revisao." }] : []
    };
  }

  async products() {
    return this.store.adminProducts();
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
    return this.store.orders();
  }

  async storefront() {
    return this.store.storefront();
  }

  async updateStorefront(input: StorefrontSettings) {
    return this.store.updateStorefront(input);
  }
}
