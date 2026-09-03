import { describe, expect, it } from "vitest";
import {
  createAdminPasswordHash,
  isAdminPasswordHash,
  verifyAdminPasswordHash,
} from "./index.js";

describe("server authentication password hashing", () => {
  it("accepts only the exact password used to create the hash", async () => {
    const password = "correct-password-with-space ";
    const hash = await createAdminPasswordHash(password);

    expect(isAdminPasswordHash(hash)).toBe(true);
    await expect(verifyAdminPasswordHash(password, hash)).resolves.toBe(true);
    await expect(
      verifyAdminPasswordHash(password.trimEnd(), hash),
    ).resolves.toBe(false);
  });
});
