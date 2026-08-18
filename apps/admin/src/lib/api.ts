import type {
  AdminCategoryInput,
  AdminOrderArchiveInput,
  AdminOrderUpdate,
  AdminProductInput,
  AdminProductRow,
  Category,
  ImageDeleteResponse,
  ImageUploadResponse,
  OrderSummary,
  PixSettings,
  Product,
  StorefrontSettings,
  SupportedImageContentType,
} from "@bespoke/contracts";
import {
  resolveAdminApiBaseUrl,
  resolveAdminMediaUrl,
} from "./api-base-url";

const apiBaseUrl = resolveAdminApiBaseUrl(
  import.meta.env.VITE_API_BASE_URL,
  typeof window === "undefined" ? undefined : window.location.href,
);
const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
export const adminUnauthorizedEvent = "bespoke:admin-unauthorized";
let csrfToken: string | null = null;
let authGeneration = 0;

export const adminMediaUrl = (url: string) =>
  resolveAdminMediaUrl(url, apiBaseUrl);

export type AdminSession = {
  admin: {
    email: string;
    role: "owner" | "manager" | "support";
  };
  csrfToken: string;
  expiresAt: string;
};

export type AdminRuntime = {
  instanceId: string;
  publicApiUrl: string;
  publicWebUrl: string;
};

export class AdminApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

export type AdminOverview = {
  metrics: {
    confirmedRevenueInCents: number;
    pendingOrders: number;
    lowStockCount: number;
    activeProducts: number;
    activeStockUnits: number;
    inventoryValueInCents: number;
  };
  revenueByChannel: { online: number; whatsapp: number };
  monthlyRevenue: Array<{
    month: string;
    onlineInCents: number;
    whatsappInCents: number;
    totalInCents: number;
  }>;
  alerts: Array<{ tone: "warning" | "danger" | "success"; message: string }>;
  recentOrders: OrderSummary[];
};

async function adminApi<T>(
  path: string,
  init?: RequestInit,
  notifyUnauthorized = true,
): Promise<T> {
  const requestAuthGeneration = authGeneration;
  const headers = new Headers(init?.headers);
  if (typeof init?.body === "string" && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const method = (init?.method ?? "GET").toUpperCase();
  if (unsafeMethods.has(method) && csrfToken) {
    headers.set("x-csrf-token", csrfToken);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    cache: "no-store",
    credentials: "include",
    headers,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    if (
      response.status === 401 &&
      notifyUnauthorized &&
      requestAuthGeneration === authGeneration &&
      typeof window !== "undefined"
    ) {
      window.dispatchEvent(new Event(adminUnauthorizedEvent));
    }
    throw new AdminApiError(
      errorMessage(payload, "Falha ao consultar administracao."),
      response.status,
      errorCode(payload),
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function getAdminSession() {
  const session = await adminApi<AdminSession>(
    "/admin/auth/session",
    undefined,
    false,
  );
  setAdminSession(session);
  return session;
}

export async function loginAdmin(payload: { email: string; password: string }) {
  const loginSession = await adminApi<AdminSession>(
    "/admin/auth/login",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    false,
  );
  setAdminSession(loginSession);

  try {
    const confirmedSession = await adminApi<AdminSession>(
      "/admin/auth/session",
      undefined,
      false,
    );
    csrfToken = confirmedSession.csrfToken;
    return confirmedSession;
  } catch (error) {
    clearAdminSession();
    if (error instanceof AdminApiError && error.status === 401) {
      throw new AdminApiError(
        "O navegador nao conseguiu manter a sessao administrativa.",
        401,
        "SESSION_COOKIE_UNAVAILABLE",
      );
    }
    throw error;
  }
}

export async function logoutAdmin() {
  await adminApi<void>("/admin/auth/logout", { method: "POST" }, false);
  clearAdminSession();
}

export function clearAdminSession() {
  csrfToken = null;
  authGeneration += 1;
}

function setAdminSession(session: AdminSession) {
  csrfToken = session.csrfToken;
  authGeneration += 1;
}

export const getOverview = () => adminApi<AdminOverview>("/admin/overview");
export const getAdminRuntime = () => adminApi<AdminRuntime>("/admin/runtime");
export const getProducts = () =>
  adminApi<{ items: AdminProductRow[] }>("/admin/products");
export const getCategories = () =>
  adminApi<{ items: Category[] }>("/catalog/categories");
export const createCategory = (payload: AdminCategoryInput) =>
  adminApi<Category>("/admin/categories", {
    method: "POST",
    body: JSON.stringify(payload),
  });
export const createProduct = (payload: AdminProductInput) =>
  adminApi<Product>("/admin/products", {
    method: "POST",
    body: JSON.stringify(payload),
  });
export const updateProduct = (id: string, payload: AdminProductInput) =>
  adminApi<Product>(`/admin/products/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
export const deleteProduct = (id: string) =>
  adminApi<void>(`/admin/products/${id}`, { method: "DELETE" });
export const getOrders = (archived = false) =>
  adminApi<{ items: OrderSummary[] }>(
    `/admin/orders${archived ? "?archived=true" : ""}`,
  );
export const setOrdersArchived = (payload: AdminOrderArchiveInput) =>
  adminApi<{ changed: number }>("/admin/orders/archive", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
export const setWhatsappRevenueConfirmed = (
  reference: string,
  confirmed: boolean,
) =>
  adminApi<OrderSummary>(
    `/admin/orders/${encodeURIComponent(reference)}/whatsapp-revenue`,
    {
      method: "PATCH",
      body: JSON.stringify({ confirmed }),
    },
  );
export const updateOrder = (reference: string, payload: AdminOrderUpdate) =>
  adminApi<OrderSummary>(`/admin/orders/${encodeURIComponent(reference)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
export const getPixSettings = () =>
  adminApi<PixSettings>("/admin/payments/pix");
export const updatePixSettings = (payload: PixSettings) =>
  adminApi<PixSettings>("/admin/payments/pix", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
export const setPixPaymentStatus = (
  reference: string,
  status: "approved" | "rejected",
) =>
  adminApi<OrderSummary>(
    `/admin/orders/${encodeURIComponent(reference)}/pix-payment`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );
export const getStorefront = () =>
  adminApi<StorefrontSettings>("/admin/storefront");
export const updateStorefront = (payload: StorefrontSettings) =>
  adminApi<StorefrontSettings>("/admin/storefront", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
export function uploadImage(
  file: Blob,
  contentType: SupportedImageContentType,
  onProgress?: (progress: number) => void,
) {
  return new Promise<ImageUploadResponse>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", `${apiBaseUrl}/admin/uploads/images`);
    request.withCredentials = true;
    request.setRequestHeader("content-type", contentType);
    if (csrfToken) request.setRequestHeader("x-csrf-token", csrfToken);
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable)
        onProgress?.(Math.round((event.loaded / event.total) * 100));
    });
    request.addEventListener("load", () => {
      const payload = parseJson(request.responseText);
      if (request.status >= 200 && request.status < 300) {
        onProgress?.(100);
        resolve(payload as ImageUploadResponse);
        return;
      }
      if (request.status === 401 && typeof window !== "undefined") {
        window.dispatchEvent(new Event(adminUnauthorizedEvent));
      }
      reject(new Error(errorMessage(payload, "Falha ao enviar a imagem.")));
    });
    request.addEventListener("error", () =>
      reject(
        new Error("Nao foi possivel conectar a API para enviar a imagem."),
      ),
    );
    request.addEventListener("abort", () =>
      reject(new Error("O envio da imagem foi cancelado.")),
    );
    request.send(file);
  });
}

export const deleteImage = (url: string) =>
  adminApi<ImageDeleteResponse>("/admin/uploads/images", {
    method: "DELETE",
    body: JSON.stringify({ url }),
  });

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function errorMessage(payload: unknown, fallback: string) {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    payload.error &&
    typeof payload.error === "object" &&
    "message" in payload.error &&
    typeof payload.error.message === "string"
  ) {
    return payload.error.message;
  }
  return fallback;
}

function errorCode(payload: unknown) {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    payload.error &&
    typeof payload.error === "object" &&
    "code" in payload.error &&
    typeof payload.error.code === "string"
  ) {
    return payload.error.code;
  }
  return undefined;
}
