import { afterEach, describe, expect, it, vi } from "vitest";
import { maxCatalogPageSize } from "@bespoke/contracts";
import {
  listFeaturedProducts,
  listProducts,
  resolveApiBaseUrl,
} from "./api";

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

  it("remove parametros internos antes de consultar o catalogo", async () => {
    const fetchMock = vi.fn().mockResolvedValue(catalogPage([], null));
    vi.stubGlobal("fetch", fetchMock);

    await listProducts(
      new URLSearchParams({
        category: "encapsulados",
        search: "vitamina",
        "storefront-preview": "admin",
      }),
    );

    const request = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(request.searchParams.get("category")).toBe("encapsulados");
    expect(request.searchParams.get("search")).toBe("vitamina");
    expect(request.searchParams.get("limit")).toBe("8");
    expect(request.searchParams.has("storefront-preview")).toBe(false);
  });
});

describe("resolveApiBaseUrl", () => {
  it("usa a API da mesma origem em builds publicados sem configuracao", () => {
    expect(resolveApiBaseUrl(undefined)).toBe("/api");
  });

  it("prioriza e normaliza a URL configurada", () => {
    expect(resolveApiBaseUrl("  https://loja.example/api/  ")).toBe(
      "https://loja.example/api",
    );
  });
});
