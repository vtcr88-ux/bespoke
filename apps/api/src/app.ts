import { dirname, resolve } from "node:path";
import { constants } from "node:fs";
import { access, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, {
  type CookieOptions,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { z } from "zod";
import {
  cartPriceRequestSchema,
  catalogQuerySchema,
  checkoutRequestSchema,
  pixCheckoutRequestSchema,
  pixSettingsSchema,
  adminPixPaymentDecisionSchema,
  adminOrderUpdateSchema,
  adminOrderArchiveInputSchema,
  adminWhatsappRevenueUpdateSchema,
  adminCategoryInputSchema,
  adminProductInputSchema,
  idSchema,
  imageDeleteRequestSchema,
  maxImageUploadBytes,
  slugSchema,
  storefrontSettingsSchema,
  whatsappRequestSchema,
} from "@bespoke/contracts";
import type { AppEnv } from "./config/env.js";
import { corsOrigins, trustedHosts } from "./config/env.js";
import { resolveUploadsRoot } from "./config/uploads.js";
import { requireAdmin, signedSessionCookie } from "./middlewares/admin-auth.js";
import { errorHandler } from "./middlewares/error-handler.js";
import { requestId } from "./middlewares/request-id.js";
import { validateBody, validateQuery } from "./middlewares/validate.js";
import { ApiError, assertFound } from "./shared/api-error.js";
import { AdminService } from "./modules/admin/admin.service.js";
import { CartService } from "./modules/cart/cart.service.js";
import { CatalogService } from "./modules/catalog/catalog.service.js";
import {
  checkoutPageUrl,
  CheckoutService,
  type MercadoPagoPreferenceCreate,
} from "./modules/checkout/checkout.service.js";
import { PixService } from "./modules/checkout/pix.service.js";
import {
  MercadoPagoWebhookService,
  type MercadoPagoPaymentLookup,
} from "./modules/checkout/mercado-pago-webhook.service.js";
import { CommerceStore } from "./modules/store/commerce.store.js";
import { MySqlCommerceStore } from "./modules/store/mysql-commerce.store.js";
import { WhatsappService } from "./modules/whatsapp/whatsapp.service.js";
import { ImageUploadService } from "./modules/media/image-upload.service.js";
import { publicStorefrontMedia } from "./modules/media/public-media-url.js";
import { StorefrontChangeService } from "./modules/storefront/storefront-change.service.js";
import { AdminAuthService } from "./modules/auth/admin-auth.service.js";

type AsyncRoute = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void> | void;
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const adminLoginSchema = z
  .object({
    email: z.string().trim().email().max(254),
    password: z.string().min(8).max(128),
  })
  .strict();
const orderReferenceSchema = z.string().trim().min(8).max(40);
const adminOrdersQuerySchema = z
  .object({ archived: z.enum(["true", "false"]).optional() })
  .strict();
const checkoutAccessTokenSchema = z.string().min(32).max(128);
const mercadoPagoWebhookSchema = z
  .object({
    id: z.union([z.string(), z.number()]).transform(String),
    live_mode: z.boolean().optional(),
    type: z.string().min(1).max(80),
    date_created: z.string().optional(),
    user_id: z.union([z.string(), z.number()]).optional(),
    api_version: z.string().optional(),
    action: z.string().min(1).max(120),
    data: z
      .object({ id: z.union([z.string(), z.number()]).transform(String) })
      .strict(),
  })
  .strict();

function sessionCookieOptions(env: AppEnv): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    signed: true,
    path: "/",
    maxAge: env.ADMIN_SESSION_TTL_MINUTES * 60 * 1000,
  };
}

function sessionClearCookieOptions(env: AppEnv): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    signed: true,
    path: "/",
  };
}

function checkoutAccessToken(req: Request) {
  const authorization = req.header("authorization") ?? "";
  const [scheme, token] = authorization.split(" ", 2);
  const parsed = checkoutAccessTokenSchema.safeParse(token);
  if (scheme?.toLowerCase() !== "bearer" || !parsed.success) {
    throw new ApiError(
      401,
      "CHECKOUT_ACCESS_REQUIRED",
      "Acesso ao checkout nao autorizado.",
    );
  }
  return parsed.data;
}

function asyncRoute(handler: AsyncRoute) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function createStore(env: AppEnv) {
  if (env.NODE_ENV === "test") {
    return CommerceStore.memory();
  }

  if (env.COMMERCE_STORAGE === "file") {
    return CommerceStore.fromFile(
      resolve(repoRoot, "database/dev-commerce-store.json"),
    );
  }

  return MySqlCommerceStore.fromUrl(env.DATABASE_URL, {
    autoSetup: env.NODE_ENV !== "production",
  });
}

export function createApp(
  env: AppEnv,
  dependencies: {
    mercadoPagoPaymentLookup?: MercadoPagoPaymentLookup;
    mercadoPagoPreferenceCreate?: MercadoPagoPreferenceCreate;
  } = {},
) {
  const app = express();
  const uploadsRoot = resolveUploadsRoot(env, repoRoot);
  const store = createStore(env);
  const catalog = new CatalogService(store, env.PUBLIC_API_URL);
  const cart = new CartService(catalog);
  const whatsapp = new WhatsappService(cart, store, env);
  const checkout = new CheckoutService(
    cart,
    store,
    env,
    whatsapp,
    dependencies.mercadoPagoPreferenceCreate,
  );
  const pix = new PixService(cart, store, env, whatsapp);
  const mercadoPagoWebhook = new MercadoPagoWebhookService(
    store,
    env,
    dependencies.mercadoPagoPaymentLookup,
  );
  const admin = new AdminService(store);
  const imageUploads = new ImageUploadService(uploadsRoot, env.PUBLIC_API_URL);
  const storefrontChanges = new StorefrontChangeService();
  const adminAuth = new AdminAuthService({
    instanceId: env.INSTANCE_ID,
    email: env.ADMIN_EMAIL,
    passwordHash: env.ADMIN_PASSWORD_HASH,
    sessionTtlMinutes: env.ADMIN_SESSION_TTL_MINUTES,
    csrfSecret: env.CSRF_SECRET,
  });
  app.locals.shutdown = () => store.close();

  async function cleanupUnusedImages(
    urls: Array<string | null | undefined>,
    req: Request,
  ) {
    const uniqueUrls = [
      ...new Set(urls.filter((url): url is string => Boolean(url))),
    ];
    const results = await Promise.allSettled(
      uniqueUrls.map((url) =>
        imageUploads.remove(url, (candidate) =>
          admin.isImageReferenced(candidate),
        ),
      ),
    );
    for (const result of results) {
      if (result.status === "rejected") {
        req.log.warn(
          { err: result.reason, requestId: req.requestId },
          "image_cleanup_failed",
        );
      }
    }
  }

  app.disable("x-powered-by");
  app.set("trust proxy", "loopback");
  app.use((req, _res, next) => {
    const allowedHosts = trustedHosts(env);
    if (
      req.path === "/health" ||
      req.path.startsWith("/health/") ||
      allowedHosts.length === 0 ||
      allowedHosts.includes(req.hostname.toLowerCase())
    ) {
      next();
      return;
    }
    next(new ApiError(400, "HOST_NOT_ALLOWED", "Host is not allowed."));
  });
  app.use(helmet());
  app.use(
    cors({
      credentials: true,
      origin(origin, callback) {
        if (!origin || corsOrigins(env).includes(origin)) {
          callback(null, true);
          return;
        }

        callback(
          new ApiError(403, "CORS_ORIGIN_DENIED", "Origin is not allowed."),
        );
      },
    }),
  );
  app.use(
    "/uploads/images/:fileName",
    asyncRoute(async (req, res, next) => {
      if (req.query.variant !== "logo") {
        next();
        return;
      }

      const fileName = req.params.fileName;
      if (!fileName) {
        throw new ApiError(404, "IMAGE_NOT_FOUND", "Imagem nao encontrada.");
      }
      const variant = await imageUploads.logoVariant(fileName);
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.type(variant.contentType).send(variant.data);
    }),
  );
  app.use(
    "/uploads",
    express.static(uploadsRoot, {
      immutable: true,
      maxAge: "1y",
      setHeaders(response) {
        response.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      },
    }),
  );
  app.use(express.json({ limit: "256kb" }));
  app.use(cookieParser(env.SESSION_SECRET));
  app.use(requestId);
  app.use(
    pinoHttp({
      level: env.LOG_LEVEL,
      redact: [
        "req.headers.authorization",
        "req.headers.cookie",
        'req.headers["x-csrf-token"]',
        "req.query.token",
        "res.headers.set-cookie",
      ],
      serializers: {
        req(request) {
          const serialized = request as typeof request & {
            url?: string;
            query?: Record<string, unknown>;
          };
          let sanitizedUrl = serialized.url;
          if (sanitizedUrl) {
            try {
              const url = new URL(sanitizedUrl, "http://internal");
              if (url.searchParams.has("token")) {
                url.searchParams.set("token", "[Redacted]");
                sanitizedUrl = `${url.pathname}${url.search}`;
              }
            } catch {
              if (/([?&])token=/i.test(sanitizedUrl)) {
                sanitizedUrl = `${sanitizedUrl.split("?", 1)[0] ?? "/"}?[Redacted]`;
              }
            }
          }
          return {
            ...serialized,
            url: sanitizedUrl,
            query: serialized.query?.token
              ? { ...serialized.query, token: "[Redacted]" }
              : serialized.query,
          };
        },
      },
      customProps: (req: Request) => ({
        requestId: req.requestId,
        instanceId: env.INSTANCE_ID,
      }),
    }),
  );

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/health/live", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/health/ready", async (_req, res) => {
    try {
      await store.healthCheck();
      await mkdir(uploadsRoot, { recursive: true });
      await access(uploadsRoot, constants.R_OK | constants.W_OK);
      res.json({ status: "ready" });
    } catch {
      res.status(503).json({ status: "unavailable" });
    }
  });

  app.post(
    "/admin/auth/login",
    validateBody(adminLoginSchema),
    asyncRoute(async (req, res) => {
      res.setHeader("Cache-Control", "no-store");
      const result = await adminAuth.login(
        req.ip || req.socket.remoteAddress || "unknown",
        req.body.email,
        req.body.password,
      );
      if (result.status === "rate_limited") {
        res.setHeader("Retry-After", String(result.retryAfterSeconds));
        throw new ApiError(
          429,
          "LOGIN_RATE_LIMITED",
          "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.",
        );
      }
      if (result.status === "invalid") {
        throw new ApiError(
          401,
          "INVALID_CREDENTIALS",
          "Nao foi possivel autenticar com os dados informados.",
        );
      }

      res.cookie(
        adminAuth.sessionCookieName,
        result.token,
        sessionCookieOptions(env),
      );
      res.json(adminAuth.sessionResponse(result.session));
    }),
  );

  app.get("/admin/auth/session", requireAdmin(adminAuth), (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json(adminAuth.sessionResponse(req.adminSession!));
  });

  app.get("/admin/runtime", requireAdmin(adminAuth), (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json({
      instanceId: env.INSTANCE_ID,
      publicApiUrl: env.PUBLIC_API_URL,
      publicWebUrl: env.PUBLIC_WEB_URL,
    });
  });

  app.post("/admin/auth/logout", requireAdmin(adminAuth), (req, res) => {
    adminAuth.revoke(signedSessionCookie(req, adminAuth.sessionCookieName));
    res.clearCookie(
      adminAuth.sessionCookieName,
      sessionClearCookieOptions(env),
    );
    res.status(204).send();
  });

  app.get(
    "/catalog/categories",
    asyncRoute(async (_req, res) => {
      res.setHeader("Cache-Control", "no-store");
      res.json({ items: await store.categories() });
    }),
  );

  app.get("/storefront/events", (req, res) => {
    res.status(200);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    res.write(`data: ${JSON.stringify({ scope: "ready" })}\n\n`);

    const unsubscribe = storefrontChanges.subscribe((scope) => {
      res.write(`data: ${JSON.stringify({ scope })}\n\n`);
    });
    const heartbeat = setInterval(() => res.write(": keep-alive\n\n"), 25_000);

    req.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  });

  app.get(
    "/storefront/settings",
    asyncRoute(async (_req, res) => {
      res.setHeader("Cache-Control", "no-store");
      res.json(
        publicStorefrontMedia(await admin.storefront(), env.PUBLIC_API_URL),
      );
    }),
  );

  app.get(
    "/support/whatsapp",
    asyncRoute(async (_req, res) => {
      const settings = await admin.storefront();
      const phone = settings.whatsappNumber || env.WHATSAPP_STORE_PHONE;
      const url = new URL(`https://wa.me/${phone}`);
      url.searchParams.set(
        "text",
        `Ola, ${settings.brandName}. Preciso de suporte com produto, entrega ou pedido.`,
      );
      res.json({ url: url.toString() });
    }),
  );

  app.get(
    "/catalog/products",
    validateQuery(catalogQuerySchema),
    asyncRoute(async (req, res) => {
      res.setHeader("Cache-Control", "no-store");
      res.json(
        await catalog.list(
          req.query as unknown as z.infer<typeof catalogQuerySchema>,
        ),
      );
    }),
  );

  app.get(
    "/catalog/products/:slug",
    asyncRoute(async (req, res) => {
      const slug = slugSchema.parse(req.params.slug);
      res.json(
        assertFound(
          await catalog.findBySlug(slug),
          "PRODUCT_NOT_FOUND",
          "Product not found.",
        ),
      );
    }),
  );

  app.post(
    "/cart/price",
    validateBody(cartPriceRequestSchema),
    async (req, res, next) => {
      try {
        res.json(await cart.price(req.body.items));
      } catch (error) {
        next(error);
      }
    },
  );

  app.post(
    "/checkout/mercado-pago",
    validateBody(checkoutRequestSchema),
    async (req, res, next) => {
      try {
        res.status(201).json(await checkout.createPreference(req.body));
      } catch (error) {
        next(error);
      }
    },
  );

  app.get(
    "/checkout/payment-methods",
    asyncRoute(async (_req, res) => {
      res.setHeader("Cache-Control", "no-store");
      res.json(await pix.paymentMethods());
    }),
  );

  app.post(
    "/checkout/pix",
    validateBody(pixCheckoutRequestSchema),
    asyncRoute(async (req, res) => {
      const result = await pix.create(req.body);
      res.status(result.reused ? 200 : 201).json(result);
    }),
  );

  app.get(
    "/checkout/orders/:reference/pix",
    asyncRoute(async (req, res) => {
      res.setHeader("Cache-Control", "no-store");
      const reference = orderReferenceSchema.parse(req.params.reference);
      res.json(await pix.details(reference, checkoutAccessToken(req)));
    }),
  );

  app.post(
    "/checkout/orders/:reference/pix/whatsapp-open",
    asyncRoute(async (req, res) => {
      const reference = orderReferenceSchema.parse(req.params.reference);
      await pix.recordWhatsappOpen(reference, checkoutAccessToken(req));
      res.status(204).send();
    }),
  );

  app.get(
    "/checkout/return",
    asyncRoute((req, res) => {
      const reference = orderReferenceSchema.parse(req.query.order);
      res.setHeader("Cache-Control", "no-store");
      res.redirect(302, checkoutPageUrl(env.PUBLIC_WEB_URL, reference));
    }),
  );

  app.get(
    "/checkout/orders/:reference",
    asyncRoute(async (req, res) => {
      res.setHeader("Cache-Control", "no-store");
      const reference = orderReferenceSchema.parse(req.params.reference);
      res.json(await checkout.status(reference, checkoutAccessToken(req)));
    }),
  );

  app.post(
    "/checkout/orders/:reference/whatsapp-open",
    asyncRoute(async (req, res) => {
      const reference = orderReferenceSchema.parse(req.params.reference);
      await checkout.recordWhatsappOpen(reference, checkoutAccessToken(req));
      res.status(204).send();
    }),
  );

  app.post(
    "/webhooks/mercado-pago",
    validateBody(mercadoPagoWebhookSchema),
    asyncRoute(async (req, res) => {
      const queryDataId = req.query["data.id"];
      const dataId =
        typeof queryDataId === "string" ? queryDataId : req.body.data.id;
      if (dataId !== req.body.data.id) {
        throw new ApiError(
          400,
          "WEBHOOK_DATA_ID_MISMATCH",
          "Identificador do webhook inconsistente.",
        );
      }
      const result = await mercadoPagoWebhook.process({
        notificationId: req.body.id,
        action: req.body.action,
        type: req.body.type,
        dataId,
        xSignature: req.header("x-signature") ?? "",
        xRequestId: req.header("x-request-id") ?? "",
      });
      req.log.info(
        { result, eventType: req.body.action },
        "mercado_pago_webhook",
      );
      res.status(200).json({ received: true, result });
    }),
  );

  app.post(
    "/whatsapp/requests",
    validateBody(whatsappRequestSchema),
    async (req, res, next) => {
      try {
        res.status(201).json(await whatsapp.createRequest(req.body));
      } catch (error) {
        next(error);
      }
    },
  );

  app.get(
    "/admin/overview",
    requireAdmin(adminAuth, "reports:read"),
    asyncRoute(async (_req, res) => {
      res.json(await admin.overview());
    }),
  );

  app.get(
    "/admin/products",
    requireAdmin(adminAuth, "products:write"),
    asyncRoute(async (_req, res) => {
      res.json({ items: await admin.products() });
    }),
  );

  app.post(
    "/admin/uploads/images",
    requireAdmin(adminAuth, ["products:write", "settings:write"]),
    express.raw({ type: () => true, limit: maxImageUploadBytes }),
    asyncRoute(async (req, res) => {
      if (!Buffer.isBuffer(req.body)) {
        throw new ApiError(
          400,
          "IMAGE_BODY_INVALID",
          "Envie o arquivo de imagem diretamente no corpo da requisicao.",
        );
      }
      res
        .status(201)
        .json(await imageUploads.save(req.body, req.header("content-type")));
    }),
  );

  app.delete(
    "/admin/uploads/images",
    requireAdmin(adminAuth, ["products:write", "settings:write"]),
    validateBody(imageDeleteRequestSchema),
    asyncRoute(async (req, res) => {
      const deleted = await imageUploads.remove(req.body.url, (candidate) =>
        admin.isImageReferenced(candidate),
      );
      res.json({ deleted });
    }),
  );

  app.post(
    "/admin/categories",
    requireAdmin(adminAuth, "products:write"),
    validateBody(adminCategoryInputSchema),
    asyncRoute(async (req, res) => {
      const category = await admin.createCategory(req.body);
      storefrontChanges.publish("categories");
      res.status(201).json(category);
    }),
  );

  app.post(
    "/admin/products",
    requireAdmin(adminAuth, "products:write"),
    validateBody(adminProductInputSchema),
    asyncRoute(async (req, res) => {
      const product = await admin.createProduct(req.body);
      storefrontChanges.publish("products");
      res.status(201).json(product);
    }),
  );

  app.put(
    "/admin/products/:id",
    requireAdmin(adminAuth, "products:write"),
    validateBody(adminProductInputSchema),
    asyncRoute(async (req, res) => {
      const id = idSchema.parse(req.params.id);
      const previous = assertFound(
        await admin.product(id),
        "PRODUCT_NOT_FOUND",
        "Product not found.",
      );
      const product = await admin.updateProduct(id, req.body);
      storefrontChanges.publish("products");
      if (previous.imageUrl !== req.body.imageUrl)
        await cleanupUnusedImages([previous.imageUrl], req);
      res.json(product);
    }),
  );

  app.delete(
    "/admin/products/:id",
    requireAdmin(adminAuth, "products:write"),
    asyncRoute(async (req, res) => {
      const id = idSchema.parse(req.params.id);
      const previous = assertFound(
        await admin.product(id),
        "PRODUCT_NOT_FOUND",
        "Product not found.",
      );
      await admin.deleteProduct(id);
      storefrontChanges.publish("products");
      await cleanupUnusedImages([previous.imageUrl], req);
      res.status(204).send();
    }),
  );

  app.get(
    "/admin/orders",
    requireAdmin(adminAuth, "orders:read"),
    validateQuery(adminOrdersQuerySchema),
    asyncRoute(async (req, res) => {
      res.json({ items: await admin.orders(req.query.archived === "true") });
    }),
  );

  app.patch(
    "/admin/orders/archive",
    requireAdmin(adminAuth, "orders:write"),
    validateBody(adminOrderArchiveInputSchema),
    asyncRoute(async (req, res) => {
      res.json({ changed: await admin.setOrdersArchived(req.body) });
    }),
  );

  app.patch(
    "/admin/orders/:reference/whatsapp-revenue",
    requireAdmin(adminAuth, "orders:write"),
    validateBody(adminWhatsappRevenueUpdateSchema),
    asyncRoute(async (req, res) => {
      const reference = orderReferenceSchema.parse(req.params.reference);
      res.json(
        await admin.setWhatsappRevenueConfirmed(
          reference,
          req.body.confirmed,
        ),
      );
    }),
  );

  app.patch(
    "/admin/orders/:reference/pix-payment",
    requireAdmin(adminAuth, "orders:write"),
    validateBody(adminPixPaymentDecisionSchema),
    asyncRoute(async (req, res) => {
      const reference = orderReferenceSchema.parse(req.params.reference);
      res.json(await admin.setPixPaymentStatus(reference, req.body));
    }),
  );

  app.patch(
    "/admin/orders/:reference",
    requireAdmin(adminAuth, "orders:write"),
    validateBody(adminOrderUpdateSchema),
    asyncRoute(async (req, res) => {
      const reference = orderReferenceSchema.parse(req.params.reference);
      res.json(await admin.updateOrder(reference, req.body));
    }),
  );

  app.get(
    "/admin/storefront",
    requireAdmin(adminAuth, "settings:write"),
    asyncRoute(async (_req, res) => {
      res.setHeader("Cache-Control", "no-store");
      res.json(
        publicStorefrontMedia(await admin.storefront(), env.PUBLIC_API_URL),
      );
    }),
  );

  app.get(
    "/admin/payments/pix",
    requireAdmin(adminAuth, "settings:write"),
    asyncRoute(async (_req, res) => {
      res.setHeader("Cache-Control", "no-store");
      res.json(await admin.pixSettings());
    }),
  );

  app.patch(
    "/admin/payments/pix",
    requireAdmin(adminAuth, "settings:write"),
    validateBody(pixSettingsSchema),
    asyncRoute(async (req, res) => {
      res.json(await admin.updatePixSettings(req.body));
    }),
  );

  app.patch(
    "/admin/storefront",
    requireAdmin(adminAuth, "settings:write"),
    validateBody(storefrontSettingsSchema),
    asyncRoute(async (req, res) => {
      const previous = await admin.storefront();
      const settings = await admin.updateStorefront(req.body);
      storefrontChanges.publish("settings");
      await cleanupUnusedImages(
        [
          previous.logoUrl,
          previous.logoOnDarkUrl,
          previous.faviconUrl,
          previous.socialImageUrl,
          previous.heroImageUrl,
          ...previous.footerLinks.map((link) => link.iconUrl),
        ],
        req,
      );
      res.json(publicStorefrontMedia(settings, env.PUBLIC_API_URL));
    }),
  );

  app.use((_req, _res, next) => {
    next(new ApiError(404, "ROUTE_NOT_FOUND", "Route not found."));
  });

  app.use(errorHandler);
  return app;
}
