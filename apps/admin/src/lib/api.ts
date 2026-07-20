import type { AdminProductInput, AdminProductRow, OrderSummary, StorefrontSettings } from "@bespoke/contracts";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3333";

export type AdminOverview = {
  metrics: {
    confirmedRevenueInCents: number;
    pendingOrders: number;
    lowStockCount: number;
    activeProducts: number;
    inventoryValueInCents: number;
  };
  alerts: Array<{ tone: "warning" | "danger" | "success"; message: string }>;
  recentOrders: OrderSummary[];
};

async function adminApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    credentials: "include",
    headers: {
      "content-type": "application/json",
      "x-bespoke-admin-session": "dev-admin-session",
      ...init?.headers
    },
    ...init
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error?.message ?? "Falha ao consultar administracao.");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const getOverview = () => adminApi<AdminOverview>("/admin/overview");
export const getProducts = () => adminApi<{ items: AdminProductRow[] }>("/admin/products");
export const createProduct = (payload: AdminProductInput) =>
  adminApi("/admin/products", { method: "POST", body: JSON.stringify(payload) });
export const updateProduct = (id: string, payload: AdminProductInput) =>
  adminApi(`/admin/products/${id}`, { method: "PUT", body: JSON.stringify(payload) });
export const deleteProduct = (id: string) => adminApi<void>(`/admin/products/${id}`, { method: "DELETE" });
export const getOrders = () => adminApi<{ items: OrderSummary[] }>("/admin/orders");
export const getStorefront = () => adminApi<StorefrontSettings>("/admin/storefront");
export const updateStorefront = (payload: StorefrontSettings) =>
  adminApi<StorefrontSettings>("/admin/storefront", { method: "PATCH", body: JSON.stringify(payload) });
