import { describe, expect, it } from "vitest";
import {
  resolveAdminApiBaseUrl,
  resolveAdminMediaUrl,
} from "./api-base-url";

describe("resolveAdminApiBaseUrl", () => {
  it("uses the same loopback hostname as the admin page", () => {
    expect(
      resolveAdminApiBaseUrl(
        "http://127.0.0.1:3333",
        "http://localhost:5174/produtos",
      ),
    ).toBe("http://localhost:3333");
    expect(
      resolveAdminApiBaseUrl(
        "http://localhost:3333",
        "http://127.0.0.1:5174/",
      ),
    ).toBe("http://127.0.0.1:3333");
  });

  it("does not rewrite production hostnames", () => {
    expect(
      resolveAdminApiBaseUrl(
        "https://api.loja.example",
        "https://admin.loja.example/configuracoes",
      ),
    ).toBe("https://api.loja.example");
  });

  it("resolves a same-origin API path used by the production proxy", () => {
    expect(
      resolveAdminApiBaseUrl(
        "/api",
        "https://admin.loja.example/configuracoes",
      ),
    ).toBe("https://admin.loja.example/api");
  });

  it("defaults to localhost for local development", () => {
    expect(resolveAdminApiBaseUrl(undefined, "http://localhost:5174/"))
      .toBe("http://localhost:3333");
  });
});

describe("resolveAdminMediaUrl", () => {
  const uploadId = "30db2133-b2e0-4bd3-a684-c3d2642311c3";

  it("rebaseia uploads gerenciados para a API usada pelo admin", () => {
    expect(
      resolveAdminMediaUrl(
        `http://127.0.0.1:3333/uploads/images/${uploadId}.png`,
        "http://localhost:3333",
      ),
    ).toBe(`http://localhost:3333/uploads/images/${uploadId}.png`);
  });

  it("remove o prefixo /api ao formar a rota publica de uploads", () => {
    expect(
      resolveAdminMediaUrl(
        `http://127.0.0.1:3333/uploads/images/${uploadId}.webp`,
        "https://admin.loja.example/api",
      ),
    ).toBe(
      `https://admin.loja.example/uploads/images/${uploadId}.webp`,
    );
  });

  it("preserva imagens externas que nao pertencem ao armazenamento", () => {
    const external = "https://cdn.example.com/instagram.png";
    expect(resolveAdminMediaUrl(external, "http://localhost:3333")).toBe(
      external,
    );
  });
});
