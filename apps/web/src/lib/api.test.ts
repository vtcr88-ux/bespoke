import { afterEach, describe, expect, it, vi } from "vitest";
import { maxCatalogPageSize } from "@bespoke/contracts";
import { listFeaturedProducts } from "./api";

function catalogPage(items: { id: string }[], nextCursor: string | null) {
  return new Response(JSON.stringify({ items, nextCursor }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("listFeaturedProducts", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("carrega todas as paginas de produtos destacados", async () => {
    const firstPage = Array.from(
      { length: maxCatalogPageSize },
      (_, index) => ({
        id: `produto-${index + 1}`,
      }),
    );
    const secondPage = Array.from({ length: 5 }, (_, index) => ({
      id: `produto-${maxCatalogPageSize + index + 1}`,
    }));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(catalogPage(firstPage, "cursor-seguinte"))
      .mockResolvedValueOnce(catalogPage(secondPage, null));
    vi.stubGlobal("fetch", fetchMock);

    const result = await listFeaturedProducts();

    expect(result.items).toHaveLength(maxCatalogPageSize + secondPage.length);
    expect(result.items.at(-1)?.id).toBe("produto-29");
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const firstRequest = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(firstRequest.searchParams.get("featured")).toBe("true");
    expect(firstRequest.searchParams.get("limit")).toBe(
      String(maxCatalogPageSize),
    );
    expect(firstRequest.searchParams.get("sort")).toBe("featured");

    const secondRequest = new URL(String(fetchMock.mock.calls[1]?.[0]));
    expect(secondRequest.searchParams.get("cursor")).toBe("cursor-seguinte");
  });
});
