import { describe, expect, it } from "vitest";
import { slugFromName } from "./helpers";

describe("slugFromName", () => {
  it("creates a stable instance identifier", () => {
    expect(slugFromName("Loja Sao Joao & Cia")).toBe("loja-sao-joao-cia");
  });
});
