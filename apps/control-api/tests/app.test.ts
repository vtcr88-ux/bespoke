import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import request from "supertest";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { createAdminPasswordHash } from "@bespoke/server-auth";
import { prepareInstanceTemplate } from "@bespoke/instance-kit";
import { createControlApp } from "../src/app.js";
import type { ControlEnv } from "../src/config/env.js";
import { FileControlStore } from "../src/control.store.js";

let passwordHash = "";
const roots: string[] = [];

beforeAll(async () => {
  passwordHash = await createAdminPasswordHash("Senha-forte-123");
});

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("control API", () => {
  it("protects metadata and prepares an isolated instance", async () => {
    const root = temporaryRoot();
    const store = new FileControlStore(resolve(root, "control.json"));
    const app = await createControlApp(testEnv(), { store, instancesRoot: root });
    const agent = request.agent(app);

    expect((await agent.get("/instances")).status).toBe(401);
    const login = await agent.post("/auth/login").send({
      email: "platform@example.test",
      password: "Senha-forte-123",
    });
    expect(login.status).toBe(200);
    const csrf = login.body.csrfToken as string;
    const created = await agent
      .post("/instances")
      .set("x-csrf-token", csrf)
      .send({
        slug: "loja-nova",
        name: "Loja Nova",
        publicDomain: "loja.example.test",
        adminDomain: "admin.loja.example.test",
        apiDomain: "api.loja.example.test",
        ownerEmail: "owner@example.test",
      });
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    expect(created.body).not.toHaveProperty("password");
    expect(created.body.apiPort).toBe(3333);

    const duplicate = await agent
      .post("/instances")
      .set("x-csrf-token", csrf)
      .send({
        slug: "loja-nova",
        name: "Outra Loja",
        publicDomain: "outra.example.test",
        adminDomain: "admin.outra.example.test",
        apiDomain: "api.outra.example.test",
        ownerEmail: "owner@example.test",
      });
    expect(duplicate.status).toBe(409);

    const prepared = await agent
      .post(`/instances/${created.body.id}/prepare`)
      .set("x-csrf-token", csrf);
    expect(prepared.status).toBe(200);
    expect(prepared.body.status).toBe("prepared");

    const readiness = await agent.get(`/instances/${created.body.id}/readiness`);
    expect(readiness.body.readyToProvision).toBe(true);
    expect(readiness.body.items).toHaveLength(5);
    await app.locals.shutdown();
  });

  it("links an existing prepared instance without recreating its templates", async () => {
    const root = temporaryRoot();
    prepareInstanceTemplate(root, {
      slug: "divinas",
      name: "Divinas",
      publicDomain: "divinas.example.test",
      adminDomain: "admin.divinas.example.test",
      apiDomain: "api.divinas.example.test",
    });
    const store = new FileControlStore(resolve(root, "control.json"));
    const app = await createControlApp(testEnv(), { store, instancesRoot: root });
    const agent = request.agent(app);
    const login = await agent.post("/auth/login").send({
      email: "platform@example.test",
      password: "Senha-forte-123",
    });
    const created = await agent
      .post("/instances")
      .set("x-csrf-token", login.body.csrfToken)
      .send({
        slug: "divinas",
        name: "Divinas",
        publicDomain: "divinas.example.test",
        adminDomain: "admin.divinas.example.test",
        apiDomain: "api.divinas.example.test",
        ownerEmail: "owner@example.test",
      });

    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      slug: "divinas",
      status: "prepared",
      apiPort: 3333,
    });
    expect(await store.listEvents(created.body.id)).toEqual([
      expect.objectContaining({
        message: "Instancia existente vinculada ao Control.",
      }),
    ]);
    await app.locals.shutdown();
  });
});

function temporaryRoot() {
  const root = mkdtempSync(resolve(tmpdir(), "bespoke-control-api-"));
  roots.push(root);
  return root;
}

function testEnv(): ControlEnv {
  return {
    NODE_ENV: "test",
    CONTROL_PORT: 3340,
    CONTROL_STORAGE: "file",
    CONTROL_DATA_FILE: "control.json",
    CONTROL_INSTANCES_ROOT: ".",
    CONTROL_SESSION_SECRET: "session-secret-with-more-than-32-characters",
    CONTROL_CSRF_SECRET: "csrf-secret-with-more-than-32-characters---",
    CONTROL_ADMIN_EMAIL: "platform@example.test",
    CONTROL_ADMIN_PASSWORD_HASH: passwordHash,
    CONTROL_SESSION_TTL_MINUTES: 480,
    CONTROL_CORS_ORIGINS: "http://localhost:5175",
    CONTROL_PUBLIC_URL: "http://localhost:5175",
    CONTROL_TRUSTED_HOSTS: "localhost,127.0.0.1",
    LOG_LEVEL: "silent",
  };
}
