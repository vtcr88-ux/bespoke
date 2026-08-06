// @ts-check
import { expect } from "@playwright/test";

const adminLoginUrl = "http://127.0.0.1:3333/admin/auth/login";

export function hasAdminTestCredentials() {
  return Boolean(
    process.env.BESPOKE_E2E_ADMIN_EMAIL &&
      process.env.BESPOKE_E2E_ADMIN_PASSWORD,
  );
}

export async function authenticateAdmin(request) {
  const email = process.env.BESPOKE_E2E_ADMIN_EMAIL;
  const password = process.env.BESPOKE_E2E_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "Defina BESPOKE_E2E_ADMIN_EMAIL e BESPOKE_E2E_ADMIN_PASSWORD para este teste.",
    );
  }

  const response = await request.post(adminLoginUrl, {
    data: { email, password },
  });
  expect(response.ok()).toBe(true);
  const session = await response.json();
  return { "x-csrf-token": session.csrfToken };
}
