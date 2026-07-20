import { describe, expect, it } from "vitest";
import { formatMoney, maskEmail } from "./format";

describe("admin format helpers", () => {
  it("formats money and masks email", () => {
    expect(formatMoney(12990)).toContain("129,90");
    expect(maskEmail("cliente@example.com")).toBe("cl***@example.com");
  });
});
