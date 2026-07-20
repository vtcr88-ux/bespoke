import { describe, expect, it } from "vitest";
import { formatMoney } from "./format";

describe("formatMoney", () => {
  it("formats cents as BRL", () => {
    expect(formatMoney(12990)).toContain("129,90");
  });
});
