import { describe, expect, it } from "vitest";
import { formatImageSize, getImageContentType, validateImageFile } from "./image-upload";

describe("image upload validation", () => {
  it("accepts PNG, JPEG and WebP MIME types", () => {
    expect(getImageContentType({ name: "capa.png", type: "image/png", size: 12 })).toBe("image/png");
    expect(getImageContentType({ name: "produto.jpg", type: "image/jpeg", size: 12 })).toBe("image/jpeg");
    expect(getImageContentType({ name: "produto.webp", type: "image/webp", size: 12 })).toBe("image/webp");
  });

  it("uses the extension when the browser omits the MIME type", () => {
    expect(getImageContentType({ name: "produto.JPEG", type: "", size: 12 })).toBe("image/jpeg");
  });

  it("rejects unsupported, empty and oversized files", () => {
    expect(validateImageFile({ name: "imagem.gif", type: "image/gif", size: 12 })).toContain("PNG");
    expect(validateImageFile({ name: "imagem.png", type: "image/png", size: 0 })).toContain("vazia");
    expect(validateImageFile({ name: "imagem.png", type: "image/png", size: 8 * 1024 * 1024 + 1 })).toContain("8 MB");
  });

  it("formats upload sizes for feedback", () => {
    expect(formatImageSize(512)).toBe("512 B");
    expect(formatImageSize(2048)).toBe("2 KB");
    expect(formatImageSize(1.5 * 1024 * 1024)).toBe("1,5 MB");
  });
});
