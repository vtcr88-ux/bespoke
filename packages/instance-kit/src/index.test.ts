import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  listInstanceTemplates,
  prepareInstanceTemplate,
} from "./index.js";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("instance preparation", () => {
  it("creates isolated templates atomically and reserves the next port", () => {
    const root = temporaryRoot();
    const first = prepareInstanceTemplate(root, input("primeira", "primeira.test"));
    const second = prepareInstanceTemplate(root, input("segunda", "segunda.test"));

    expect(first.port).toBe(3333);
    expect(second.port).toBe(3334);
    expect(listInstanceTemplates(root)).toHaveLength(2);
    expect(
      readFileSync(resolve(first.directory, ".env.example"), "utf8"),
    ).toContain("INSTANCE_ID=primeira");
    expect(() =>
      readFileSync(resolve(first.directory, "features.json"), "utf8"),
    ).toThrow();
  });

  it("rejects duplicate slugs, domains and ports", () => {
    const root = temporaryRoot();
    prepareInstanceTemplate(root, input("primeira", "primeira.test"));

    expect(() =>
      prepareInstanceTemplate(root, input("primeira", "outra.test")),
    ).toThrow(/already exists/i);
    expect(() =>
      prepareInstanceTemplate(root, input("outra", "primeira.test")),
    ).toThrow(/domain/i);
    expect(() =>
      prepareInstanceTemplate(root, {
        ...input("outra", "outra.test"),
        port: 3333,
      }),
    ).toThrow(/port/i);
  });
});

function temporaryRoot() {
  const root = mkdtempSync(resolve(tmpdir(), "bespoke-instance-kit-"));
  roots.push(root);
  return root;
}

function input(slug: string, publicDomain: string) {
  return {
    slug,
    name: slug === "primeira" ? "Primeira Loja" : "Segunda Loja",
    publicDomain,
    adminDomain: `admin.${publicDomain}`,
    apiDomain: `api.${publicDomain}`,
  };
}
