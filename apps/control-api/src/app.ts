import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type CookieOptions, type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { z } from "zod";
import { controlInstanceInputSchema } from "@bespoke/contracts";
import { AdminAuthService } from "@bespoke/server-auth";
import { requireControlAdmin, signedSessionCookie } from "./auth.js";
import { commaSeparated, resolveControlPaths, type ControlEnv } from "./config/env.js";
import { ControlService } from "./control.service.js";
import { FileControlStore, MySqlControlStore, type ControlStore } from "./control.store.js";
import { ApiError } from "./shared/api-error.js";
import { errorHandler, requestId } from "./shared/http.js";

type AsyncRoute = (req: Request, res: Response, next: NextFunction) => Promise<void> | void;
const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const loginSchema = z.object({ email: z.string().email().max(254), password: z.string().min(8).max(128) }).strict();
const idSchema = z.string().uuid();

export type ControlAppDependencies = {
  store?: ControlStore;
  instancesRoot?: string;
};

export async function createControlApp(env: ControlEnv, dependencies: ControlAppDependencies = {}) {
  const paths = resolveControlPaths(env, appRoot);
  const store = dependencies.store ?? createStore(env, paths.dataFile);
  await store.setup();
  const service = new ControlService(store, dependencies.instancesRoot ?? paths.instancesRoot);
  const auth = new AdminAuthService({
    instanceId: "control",
    email: env.CONTROL_ADMIN_EMAIL,
    passwordHash: env.CONTROL_ADMIN_PASSWORD_HASH,
    sessionTtlMinutes: env.CONTROL_SESSION_TTL_MINUTES,
    csrfSecret: env.CONTROL_CSRF_SECRET,
    cookieName: "bespoke_control_session",
    principalId: "00000000-0000-4000-8000-000000000100",
    role: "platform_owner",
    permissions: ["instances:read", "instances:write"],
  });
  const app = express();
  app.locals.shutdown = () => store.close();
  app.disable("x-powered-by");
  app.set("trust proxy", "loopback");
  app.use(requestId);
  app.use(pinoHttp({ level: env.LOG_LEVEL }));
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use((req, _res, next) => {
    const host = (req.hostname || "").toLowerCase();
    if (req.path.startsWith("/health/") || commaSeparated(env.CONTROL_TRUSTED_HOSTS).includes(host)) return next();
    return next(new ApiError(400, "HOST_NOT_ALLOWED", "Host nao autorizado."));
  });
  app.use(cors({
    credentials: true,
    origin(origin, callback) {
      const allowed = commaSeparated(env.CONTROL_CORS_ORIGINS);
      callback(origin && !allowed.includes(origin) ? new ApiError(403, "CORS_ORIGIN_DENIED", "Origem nao autorizada.") : null, true);
    },
  }));
  app.use(express.json({ limit: "128kb" }));
  app.use(cookieParser(env.CONTROL_SESSION_SECRET));

  app.get("/health/live", (_req, res) => res.json({ status: "ok" }));
  app.get("/health/ready", asyncRoute(async (_req, res) => {
    await store.ping();
    res.json({ status: "ready" });
  }));

  app.post("/auth/login", asyncRoute(async (req, res) => {
    const credentials = loginSchema.parse(req.body);
    const result = await auth.login(req.ip ?? "unknown", credentials.email, credentials.password);
    if (result.status === "rate_limited") {
      res.setHeader("retry-after", String(result.retryAfterSeconds));
      throw new ApiError(429, "LOGIN_RATE_LIMITED", "Muitas tentativas. Aguarde e tente novamente.");
    }
    if (result.status === "invalid") throw new ApiError(401, "INVALID_CREDENTIALS", "E-mail ou senha invalidos.");
    res.cookie(auth.sessionCookieName, result.token, cookieOptions(env));
    res.json(auth.sessionResponse(result.session));
  }));
  app.get("/auth/session", requireControlAdmin(auth), (req, res) => {
    res.json(auth.sessionResponse(req.adminSession!));
  });
  app.post("/auth/logout", requireControlAdmin(auth), (req, res) => {
    auth.revoke(signedSessionCookie(req, auth.sessionCookieName));
    res.clearCookie(auth.sessionCookieName, clearCookieOptions(env));
    res.status(204).end();
  });

  app.get("/overview", requireControlAdmin(auth, "instances:read"), asyncRoute(async (_req, res) => {
    res.json(await service.overview());
  }));
  app.get("/instances", requireControlAdmin(auth, "instances:read"), asyncRoute(async (_req, res) => {
    res.json({ items: await service.list() });
  }));
  app.post("/instances", requireControlAdmin(auth, "instances:write"), asyncRoute(async (req, res) => {
    const instance = await service.create(controlInstanceInputSchema.parse(req.body));
    res.status(201).json(instance);
  }));
  app.get("/instances/:id", requireControlAdmin(auth, "instances:read"), asyncRoute(async (req, res) => {
    res.json(await service.get(idSchema.parse(req.params.id)));
  }));
  app.post("/instances/:id/prepare", requireControlAdmin(auth, "instances:write"), asyncRoute(async (req, res) => {
    res.json(await service.prepare(idSchema.parse(req.params.id)));
  }));
  app.get("/instances/:id/readiness", requireControlAdmin(auth, "instances:read"), asyncRoute(async (req, res) => {
    res.json(await service.readiness(idSchema.parse(req.params.id)));
  }));
  app.get("/instances/:id/events", requireControlAdmin(auth, "instances:read"), asyncRoute(async (req, res) => {
    res.json({ items: await service.events(idSchema.parse(req.params.id)) });
  }));

  app.use((_req, _res, next) => next(new ApiError(404, "ROUTE_NOT_FOUND", "Rota nao encontrada.")));
  app.use(errorHandler);
  return app;
}

function createStore(env: ControlEnv, dataFile: string): ControlStore {
  if (env.CONTROL_STORAGE === "mysql") return MySqlControlStore.fromUrl(env.CONTROL_DATABASE_URL!);
  return new FileControlStore(dataFile);
}

function asyncRoute(handler: AsyncRoute) {
  return (req: Request, res: Response, next: NextFunction) => void Promise.resolve(handler(req, res, next)).catch(next);
}

function cookieOptions(env: ControlEnv): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    signed: true,
    path: "/",
    maxAge: env.CONTROL_SESSION_TTL_MINUTES * 60 * 1000,
  };
}

function clearCookieOptions(env: ControlEnv): CookieOptions {
  return { httpOnly: true, secure: env.NODE_ENV === "production", sameSite: "strict", signed: true, path: "/" };
}
