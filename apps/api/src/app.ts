import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { z } from "zod";
import {
  cartPriceRequestSchema,
  catalogQuerySchema,
  checkoutRequestSchema,
  adminProductInputSchema,
  idSchema,
  slugSchema,
  storefrontSettingsSchema,
  whatsappRequestSchema
} from "@bespoke/contracts";
import type { AppEnv } from "./config/env.js";
import { corsOrigins } from "./config/env.js";
import { requireAdmin } from "./middlewares/admin-auth.js";
import { errorHandler } from "./middlewares/error-handler.js";
import { requestId } from "./middlewares/request-id.js";
import { validateBody, validateQuery } from "./middlewares/validate.js";
import { ApiError, assertFound } from "./shared/api-error.js";
import { AdminService } from "./modules/admin/admin.service.js";
import { CartService } from "./modules/cart/cart.service.js";
import { CatalogService } from "./modules/catalog/catalog.service.js";
import { CheckoutService } from "./modules/checkout/checkout.service.js";
import { ShippingService } from "./modules/shipping/shipping.service.js";
import { CommerceStore } from "./modules/store/commerce.store.js";
import { MySqlCommerceStore } from "./modules/store/mysql-commerce.store.js";
import { WhatsappService } from "./modules/whatsapp/whatsapp.service.js";

type AsyncRoute = (req: Request, res: Response, next: NextFunction) => Promise<void> | void;
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function asyncRoute(handler: AsyncRoute) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function createStore(env: AppEnv) {
  if (env.NODE_ENV === "test") {
    return CommerceStore.memory();
  }

  if (env.NODE_ENV === "development" && env.DATABASE_URL.includes("replace_me")) {
    return CommerceStore.fromFile(resolve(repoRoot, "database/dev-commerce-store.json"));
  }

  return MySqlCommerceStore.fromUrl(env.DATABASE_URL);
}

export function createApp(env: AppEnv) {
  const app = express();
  const store = createStore(env);
  const catalog = new CatalogService(store);
  const shipping = new ShippingService(env);
  const cart = new CartService(catalog, shipping);
  const checkout = new CheckoutService(cart, store, env);
  const whatsapp = new WhatsappService(cart, store, env);
  const admin = new AdminService(store);

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      credentials: true,
      origin(origin, callback) {
        if (!origin || corsOrigins(env).includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new ApiError(403, "CORS_ORIGIN_DENIED", "Origin is not allowed."));
      }
    })
  );
  app.use(express.json({ limit: "256kb" }));
  app.use(cookieParser(env.SESSION_SECRET));
  app.use(requestId);
  app.use(
    pinoHttp({
      redact: ["req.headers.authorization", "req.headers.cookie", "res.headers.set-cookie"],
      customProps: (req: Request) => ({ requestId: req.requestId })
    })
  );

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get(
    "/catalog/categories",
    asyncRoute(async (_req, res) => {
      res.json({ items: await store.categories() });
    })
  );

  app.get(
    "/storefront/settings",
    asyncRoute(async (_req, res) => {
      res.json(await admin.storefront());
    })
  );

  app.get("/support/whatsapp", (_req, res) => {
    const url = new URL(`https://wa.me/${env.WHATSAPP_STORE_PHONE}`);
    url.searchParams.set("text", "Ola, Bespoke. Preciso de suporte com produto, entrega ou pedido.");
    res.json({ url: url.toString() });
  });

  app.get(
    "/catalog/products",
    validateQuery(catalogQuerySchema),
    asyncRoute(async (req, res) => {
      res.json(await catalog.list(req.query as unknown as z.infer<typeof catalogQuerySchema>));
    })
  );

  app.get(
    "/catalog/products/:slug",
    asyncRoute(async (req, res) => {
      const slug = slugSchema.parse(req.params.slug);
      res.json(assertFound(await catalog.findBySlug(slug), "PRODUCT_NOT_FOUND", "Product not found."));
    })
  );

  app.post("/cart/price", validateBody(cartPriceRequestSchema), async (req, res, next) => {
    try {
      res.json(await cart.price(req.body.items, req.body.destinationPostalCode));
    } catch (error) {
      next(error);
    }
  });

  app.post("/checkout/mercado-pago", validateBody(checkoutRequestSchema), async (req, res, next) => {
    try {
      res.status(201).json(await checkout.createPreference(req.body));
    } catch (error) {
      next(error);
    }
  });

  app.post("/whatsapp/requests", validateBody(whatsappRequestSchema), async (req, res, next) => {
    try {
      res.status(201).json(await whatsapp.createRequest(req.body));
    } catch (error) {
      next(error);
    }
  });

  app.get(
    "/admin/overview",
    requireAdmin("reports:read"),
    asyncRoute(async (_req, res) => {
      res.json(await admin.overview());
    })
  );

  app.get(
    "/admin/products",
    requireAdmin("products:write"),
    asyncRoute(async (_req, res) => {
      res.json({ items: await admin.products() });
    })
  );

  app.post(
    "/admin/products",
    requireAdmin("products:write"),
    validateBody(adminProductInputSchema),
    asyncRoute(async (req, res) => {
      res.status(201).json(await admin.createProduct(req.body));
    })
  );

  app.put(
    "/admin/products/:id",
    requireAdmin("products:write"),
    validateBody(adminProductInputSchema),
    asyncRoute(async (req, res) => {
      const id = idSchema.parse(req.params.id);
      res.json(await admin.updateProduct(id, req.body));
    })
  );

  app.delete(
    "/admin/products/:id",
    requireAdmin("products:write"),
    asyncRoute(async (req, res) => {
      const id = idSchema.parse(req.params.id);
      await admin.deleteProduct(id);
      res.status(204).send();
    })
  );

  app.get(
    "/admin/orders",
    requireAdmin("orders:read"),
    asyncRoute(async (_req, res) => {
      res.json({ items: await admin.orders() });
    })
  );

  app.get(
    "/admin/storefront",
    requireAdmin("settings:write"),
    asyncRoute(async (_req, res) => {
      res.json(await admin.storefront());
    })
  );

  app.patch(
    "/admin/storefront",
    requireAdmin("settings:write"),
    validateBody(storefrontSettingsSchema),
    asyncRoute(async (req, res) => {
      res.json(await admin.updateStorefront(req.body));
    })
  );

  app.use((_req, _res, next) => {
    next(new ApiError(404, "ROUTE_NOT_FOUND", "Route not found."));
  });

  app.use(errorHandler);
  return app;
}
