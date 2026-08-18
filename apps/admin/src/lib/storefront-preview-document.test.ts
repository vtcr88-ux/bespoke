import { describe, expect, it } from "vitest";
import {
  createStorefrontPreviewDocument,
  shouldEmbedStorefrontPreview,
} from "./storefront-preview-document";

describe("shouldEmbedStorefrontPreview", () => {
  it("uses an embedded document for the shared ngrok origin", () => {
    expect(
      shouldEmbedStorefrontPreview(
        "https://demo.ngrok-free.dev/?storefront-preview=admin",
        "https://demo.ngrok-free.dev/painel-secret/aparencia",
      ),
    ).toBe(true);
  });

  it("keeps local and production domains on the direct iframe", () => {
    expect(
      shouldEmbedStorefrontPreview(
        "http://localhost:5173/?storefront-preview=admin",
        "http://localhost:5174/aparencia",
      ),
    ).toBe(false);
    expect(
      shouldEmbedStorefrontPreview(
        "https://store.example.com/?storefront-preview=admin",
        "https://admin.example.com/aparencia",
      ),
    ).toBe(false);
  });
});

describe("createStorefrontPreviewDocument", () => {
  it("injects the preview marker, base and route before the public bundle", () => {
    const document = createStorefrontPreviewDocument(
      '<!doctype html><html><head><script type="module" src="/assets/app.js"></script></head><body><div id="root"></div></body></html>',
      "https://demo.ngrok-free.dev/",
    );

    expect(document).toContain(
      '<base href="https://demo.ngrok-free.dev/">',
    );
    expect(document).toContain(
      "window.__BESPOKE_EMBEDDED_STOREFRONT_PREVIEW__=true",
    );
    expect(document.indexOf("<base")).toBeLessThan(
      document.indexOf('src="/assets/app.js"'),
    );
    expect(document).toContain("storefront-preview=admin");
  });

  it("rejects an ngrok warning or another unexpected document", () => {
    expect(() =>
      createStorefrontPreviewDocument("ERR_NGROK_6024", "https://demo.ngrok.app"),
    ).toThrow("STOREFRONT_DOCUMENT_INVALID");
  });
});
