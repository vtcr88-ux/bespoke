import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveUploadsRoot } from "./uploads.js";

const repoRoot = resolve("C:/workspace/bespoke");

describe("resolveUploadsRoot", () => {
  it("uses persistent instance storage for native Windows development", () => {
    expect(
      resolveUploadsRoot(
        {
          NODE_ENV: "development",
          INSTANCE_ID: "bespoke-local",
          UPLOADS_DIR: "/var/lib/catalog-platform/divinas/uploads",
        },
        repoRoot,
        "win32",
      ),
    ).toBe(resolve(repoRoot, "storage/bespoke-local/uploads"));
  });

  it("preserves the configured production mount", () => {
    expect(
      resolveUploadsRoot(
        {
          NODE_ENV: "production",
          INSTANCE_ID: "divinas",
          UPLOADS_DIR: "/var/lib/catalog-platform/divinas/uploads",
        },
        "/srv/bespoke",
        "linux",
      ),
    ).toBe("/var/lib/catalog-platform/divinas/uploads");
  });

  it("resolves a portable relative upload directory", () => {
    expect(
      resolveUploadsRoot(
        {
          NODE_ENV: "development",
          INSTANCE_ID: "divinas",
          UPLOADS_DIR: "storage/divinas/uploads",
        },
        repoRoot,
        "win32",
      ),
    ).toBe(resolve(repoRoot, "storage/divinas/uploads"));
  });
});
