import { describe, expect, it } from "vitest";
import { isValidHexColor, normalizeHexColorInput } from "./hex-color";

describe("hex color", () => {
  it("normaliza o prefixo e a caixa do codigo", () => {
    expect(normalizeHexColorInput("c9a76d")).toBe("#C9A76D");
    expect(normalizeHexColorInput(" #2f6f74 ")).toBe("#2F6F74");
  });

  it("aceita somente seis digitos hexadecimais", () => {
    expect(isValidHexColor("#090907")).toBe(true);
    expect(isValidHexColor("FFFFFF")).toBe(true);
    expect(isValidHexColor("#FFF")).toBe(false);
    expect(isValidHexColor("#12ZZ99")).toBe(false);
    expect(isValidHexColor("")).toBe(false);
  });
});
