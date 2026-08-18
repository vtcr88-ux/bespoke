import {
  maxCatalogPageSize,
  type CatalogResponse,
  type Category,
  type CheckoutRequest,
  type CheckoutResponse,
  type CheckoutStatusResponse,
  type PaymentMethodsResponse,
  type PixCheckoutRequest,
  type PixCheckoutResponse,
  type PixPaymentDetails,
  type PricedCart,
  type Product,
  type StorefrontSettings,
  type WhatsappRequest,
  type WhatsappResponse,
} from "@bespoke/contracts";

export function resolveApiBaseUrl(
  configuredUrl: string | undefined,
) {
  const configured = configuredUrl?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  return "/api";
}

const apiBaseUrl = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
export const storefrontEventsUrl = `${apiBaseUrl}/storefront/events`;

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    cache: "no-store",
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(
      payload?.error?.message ?? "Nao foi possivel concluir a solicitacao.",
    );
  }

  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}

export function listProducts(
  searchParams: URLSearchParams,
  cursor?: string,
  signal?: AbortSignal,
) {
  const params = new URLSearchParams();
  for (const name of [
    "cursor",
    "limit",
    "search",
    "category",
    "featured",
    "sort",
  ]) {
    const value = searchParams.get(name);
    if (value) params.set(name, value);
  }
  if (!params.has("limit")) params.set("limit", "8");
  if (cursor) params.set("cursor", cursor);
  return api<CatalogResponse>(`/catalog/products?${params.toString()}`, {
    signal,
  });
}

export async function listFeaturedProducts(signal?: AbortSignal) {
  const params = new URLSearchParams({
    featured: "true",
    limit: String(maxCatalogPageSize),
    sort: "featured",
  });
  const items: Product[] = [];
  const seenCursors = new Set<string>();
  let cursor: string | undefined;

  do {
    const page = await listProducts(params, cursor, signal);
    items.push(...page.items);
    cursor = page.nextCursor ?? undefined;

    if (cursor) {
      if (seenCursors.has(cursor)) {
        throw new Error(
          "A paginacao dos destaques retornou um cursor repetido.",
        );
      }
      seenCursors.add(cursor);
    }
  } while (cursor);

  return { items, nextCursor: null } satisfies CatalogResponse;
}

export function getProduct(slug: string) {
  return api<Product>(`/catalog/products/${slug}`);
}

export function getStorefrontSettings() {
  return api<StorefrontSettings>("/storefront/settings");
}

export function listCategories() {
  return api<{ items: Category[] }>("/catalog/categories");
}

export function getSupportWhatsappUrl() {
  return api<{ url: string }>("/support/whatsapp");
}

export function priceCart(items: { productId: string; quantity: number }[]) {
  return api<PricedCart>("/cart/price", {
    method: "POST",
    body: JSON.stringify({ items }),
  });
}

export function createCheckout(payload: CheckoutRequest) {
  return api<CheckoutResponse>("/checkout/mercado-pago", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getPaymentMethods() {
  return api<PaymentMethodsResponse>("/checkout/payment-methods");
}

export function createPixCheckout(payload: PixCheckoutRequest) {
  return api<PixCheckoutResponse>("/checkout/pix", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getPixPayment(orderReference: string, token: string) {
  return api<PixPaymentDetails>(
    `/checkout/orders/${encodeURIComponent(orderReference)}/pix`,
    { headers: { authorization: `Bearer ${token}` } },
  );
}

export function recordPixWhatsappOpen(
  orderReference: string,
  token: string,
) {
  return api<void>(
    `/checkout/orders/${encodeURIComponent(orderReference)}/pix/whatsapp-open`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
    },
  );
}

export function createWhatsappRequest(payload: WhatsappRequest) {
  return api<WhatsappResponse>("/whatsapp/requests", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getCheckoutStatus(orderReference: string, token: string) {
  return api<CheckoutStatusResponse>(
    `/checkout/orders/${encodeURIComponent(orderReference)}`,
    { headers: { authorization: `Bearer ${token}` } },
  );
}

export function recordCheckoutWhatsappOpen(
  orderReference: string,
  token: string,
) {
  return api<void>(
    `/checkout/orders/${encodeURIComponent(orderReference)}/whatsapp-open`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
    },
  );
}
