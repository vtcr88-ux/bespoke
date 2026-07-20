import { describe, expect, it } from "vitest";
import { cartPriceRequestSchema } from "./index.js";

describe("contracts", () => {
  it("rejects unknown cart item fields", () => {
    const result = cartPriceRequestSchema.safeParse({
      items: [
        {
          productId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
          quantity: 1,
          priceInCents: 1
        }
      ]
    });

    expect(result.success).toBe(false);
  });
});
