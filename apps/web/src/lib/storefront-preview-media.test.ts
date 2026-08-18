import { describe, expect, it, vi } from "vitest";
import {
  fetchStorefrontPreviewMedia,
  resolveStorefrontMediaUrl,
  shouldProxyStorefrontPreviewMedia,
} from "./storefront-preview-media";

const uploadId = "cc761687-183b-4f25-a71f-8f3f7819c0dc";
const ngrokOrigin = "https://example.ngrok-free.dev";

describe("resolveStorefrontMediaUrl", () => {
  it("mantem uploads gerenciados na mesma origem da vitrine", () => {
    expect(
      resolveStorefrontMediaUrl(
        `${ngrokOrigin}/uploads/images/${uploadId}.png?variant=card`,
        "http://localhost:5173/catalogo",
      ),
    ).toBe(
      `http://localhost:5173/uploads/images/${uploadId}.png?variant=card`,
    );
  });

  it("preserva imagens externas que nao pertencem aos uploads da loja", () => {
    const externalImage = "https://images.example/produto.png";
    expect(
      resolveStorefrontMediaUrl(externalImage, "https://loja.example/catalogo"),
    ).toBe(externalImage);
  });
});

describe("shouldProxyStorefrontPreviewMedia", () => {
  it("protege uploads no preview incorporado do ngrok", () => {
    expect(
      shouldProxyStorefrontPreviewMedia(
        `${ngrokOrigin}/uploads/images/${uploadId}.png?variant=logo`,
        `${ngrokOrigin}/painel/aparencia`,
        true,
      ),
    ).toBe(true);
  });

  it("mantem URLs diretas fora do preview temporario", () => {
    const upload = `${ngrokOrigin}/uploads/images/${uploadId}.webp`;
    expect(
      shouldProxyStorefrontPreviewMedia(
        upload,
        `${ngrokOrigin}/painel/aparencia`,
        false,
      ),
    ).toBe(false);
    expect(
      shouldProxyStorefrontPreviewMedia(
        "https://loja.example/uploads/images/cc761687-183b-4f25-a71f-8f3f7819c0dc.jpg",
        "https://admin.example/aparencia",
        true,
      ),
    ).toBe(false);
  });
});

describe("fetchStorefrontPreviewMedia", () => {
  it("exige uma resposta de imagem e envia o bypass oficial", async () => {
    const blob = new Blob(["image"], { type: "image/png" });
    const fetcher = vi.fn().mockResolvedValue(
      new Response(blob, {
        status: 200,
        headers: { "content-type": "image/png" },
      }),
    );

    await expect(
      fetchStorefrontPreviewMedia(`${ngrokOrigin}/logo.png`, fetcher),
    ).resolves.toBeInstanceOf(Blob);
    expect(fetcher).toHaveBeenCalledWith(
      `${ngrokOrigin}/logo.png`,
      expect.objectContaining({
        cache: "no-store",
        credentials: "include",
        headers: expect.objectContaining({
          "ngrok-skip-browser-warning":
            "bespoke-storefront-preview-media",
        }),
      }),
    );
  });

  it("recusa o HTML intermediario do ngrok", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response("ERR_NGROK_6024", {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
    );

    await expect(
      fetchStorefrontPreviewMedia(`${ngrokOrigin}/logo.png`, fetcher),
    ).rejects.toThrow("STOREFRONT_PREVIEW_MEDIA_INVALID");
  });
});
