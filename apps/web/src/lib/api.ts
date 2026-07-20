import type {
  CatalogResponse,
  CheckoutRequest,
  CheckoutResponse,
  PricedCart,
  Product,
  StorefrontSettings,
  WhatsappRequest,
  WhatsappResponse
} from "@bespoke/contracts";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3333";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...init?.headers
    },
    ...init
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error?.message ?? "Nao foi possivel concluir a solicitacao.");
  }

  return response.json() as Promise<T>;
}

export function listProducts(searchParams: URLSearchParams, cursor?: string) {
  const params = new URLSearchParams(searchParams);
  params.set("limit", "8");
  if (cursor) params.set("cursor", cursor);
  return api<CatalogResponse>(`/catalog/products?${params.toString()}`);
}

export function getProduct(slug: string) {
  return api<Product>(`/catalog/products/${slug}`);
}

export function getStorefrontSettings() {
  return api<StorefrontSettings>("/storefront/settings");
}

export function getSupportWhatsappUrl() {
  return api<{ url: string }>("/support/whatsapp");
}

export function priceCart(items: { productId: string; quantity: number }[], destinationPostalCode?: string) {
  return api<PricedCart>("/cart/price", { method: "POST", body: JSON.stringify({ items, destinationPostalCode }) });
}

export function createCheckout(payload: CheckoutRequest) {
  return api<CheckoutResponse>("/checkout/mercado-pago", { method: "POST", body: JSON.stringify(payload) });
}

export function createWhatsappRequest(payload: WhatsappRequest) {
  return api<WhatsappResponse>("/whatsapp/requests", { method: "POST", body: JSON.stringify(payload) });
}
