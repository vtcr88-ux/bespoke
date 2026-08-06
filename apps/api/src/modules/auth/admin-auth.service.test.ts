import { describe, expect, it } from "vitest";
import {
  createAdminPasswordHash,
  isAdminPasswordHash,
  verifyAdminPasswordHash,
} from "./admin-auth.service.js";

describe("admin password hashing", () => {
  it("accepts only the exact password used to create the hash", async () => {
    const password = "correct-password-with-space ";
    const hash = await createAdminPasswordHash(password);

    expect(isAdminPasswordHash(hash)).toBe(true);
    await expect(verifyAdminPasswordHash(password, hash)).resolves.toBe(true);
    await expect(
      verifyAdminPasswordHash(password.trimEnd(), hash),
    ).resolves.toBe(false);
    await expect(
      verifyAdminPasswordHash("another-password", hash),
    ).resolves.toBe(false);
  });

  it("rejects a malformed hash without attempting authentication", async () => {
    await expect(
      verifyAdminPasswordHash("correct-password", "invalid-hash"),
    ).resolves.toBe(false);
  });
});
