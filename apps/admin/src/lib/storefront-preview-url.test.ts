import { describe, expect, it } from "vitest";
import { resolveStorefrontPreviewUrl } from "./storefront-preview-url";

describe("resolveStorefrontPreviewUrl", () => {
  it("prioritizes the active instance runtime URL on a remote Admin", () => {
    expect(
      resolveStorefrontPreviewUrl(
        "https://store.example.com",
        "http://localhost:5173",
        "https://admin.example.com/aparencia",
      ),
    ).toBe("https://store.example.com/?storefront-preview=admin");
  });

  it("rejects a loopback fallback when the Admin is remote", () => {
    expect(
      resolveStorefrontPreviewUrl(
        undefined,
        "http://localhost:5173",
        "https://admin.example.com/aparencia",
      ),
    ).toBeNull();
  });

  it("uses the shared public origin for the temporary ngrok Admin", () => {
    expect(
      resolveStorefrontPreviewUrl(
        undefined,
        "http://localhost:5173",
        "https://demo.ngrok-free.dev/painel-123456789012345678901234/aparencia",
      ),
    ).toBe("https://demo.ngrok-free.dev/?storefront-preview=admin");
  });

  it("keeps the local Storefront on port 5173 during development", () => {
    expect(
      resolveStorefrontPreviewUrl(
        undefined,
        undefined,
        "http://localhost:5174/aparencia",
      ),
    ).toBe("http://localhost:5173/?storefront-preview=admin");
  });
});
