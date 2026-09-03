import {
  controlInstanceEventSchema,
  controlInstanceInputSchema,
  controlInstanceSchema,
  controlOverviewSchema,
  controlReadinessSchema,
  type ControlInstanceInput,
} from "@bespoke/contracts";
import { z } from "zod";

const baseUrl = (import.meta.env.VITE_CONTROL_API_BASE_URL || "/control-api").replace(/\/$/, "");
const sessionSchema = z.object({
  admin: z.object({ email: z.string().email(), role: z.string() }),
  csrfToken: z.string().min(1),
  expiresAt: z.string().datetime(),
});
let csrfToken = "";

export type ControlSession = z.infer<typeof sessionSchema>;

export class ControlApiError extends Error {
  constructor(public readonly code: string, message: string, public readonly status: number) {
    super(message);
  }
}

async function requestApi(path: string, options: RequestInit = {}) {
  const method = options.method ?? "GET";
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(!["GET", "HEAD"].includes(method) && csrfToken ? { "x-csrf-token": csrfToken } : {}),
      ...options.headers,
    },
  });
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => null) as { error?: { code?: string; message?: string } } | null;
  if (!response.ok) {
    throw new ControlApiError(
      payload?.error?.code ?? "REQUEST_FAILED",
      payload?.error?.message ?? "Nao foi possivel concluir a solicitacao.",
      response.status,
    );
  }
  return payload;
}

export async function session() {
  try {
    const parsed = sessionSchema.parse(await requestApi("/auth/session"));
    csrfToken = parsed.csrfToken;
    return parsed;
  } catch (error) {
    if (error instanceof ControlApiError && error.status === 401) return null;
    throw error;
  }
}

export async function login(email: string, password: string) {
  const parsed = sessionSchema.parse(await requestApi("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  }));
  csrfToken = parsed.csrfToken;
  return parsed;
}

export async function logout() {
  await requestApi("/auth/logout", { method: "POST" });
  csrfToken = "";
}

export const getOverview = async () => controlOverviewSchema.parse(await requestApi("/overview"));
export const listInstances = async () => z.object({ items: z.array(controlInstanceSchema) }).parse(await requestApi("/instances")).items;
export const getInstance = async (id: string) => controlInstanceSchema.parse(await requestApi(`/instances/${id}`));
export const getReadiness = async (id: string) => controlReadinessSchema.parse(await requestApi(`/instances/${id}/readiness`));
export const getEvents = async (id: string) => z.object({ items: z.array(controlInstanceEventSchema) }).parse(await requestApi(`/instances/${id}/events`)).items;

export async function createInstance(input: ControlInstanceInput) {
  const validated = controlInstanceInputSchema.parse(input);
  return controlInstanceSchema.parse(await requestApi("/instances", {
    method: "POST",
    body: JSON.stringify(validated),
  }));
}

export async function prepareInstance(id: string) {
  return controlInstanceSchema.parse(await requestApi(`/instances/${id}/prepare`, { method: "POST" }));
}
