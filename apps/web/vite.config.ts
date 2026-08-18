import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const publicDemoApiTarget = "http://127.0.0.1:3334";
const adminDemoTarget = "http://127.0.0.1:4174";

function normalizedAdminDemoPath(value: string | undefined) {
  const path = value?.trim();
  if (!path) return "";
  return `/${path.replace(/^\/+|\/+$/g, "")}`;
}

function publicDemoGuard(adminDemoPath: string): Plugin {
  const guard = (
    request: { headers?: { accept?: string }; url?: string },
    response: {
      statusCode: number;
      setHeader(name: string, value: string): void;
      end(body?: string): void;
    },
    next: () => void,
  ) => {
    const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
    if (/^\/(?:api\/)?admin(?:\/|$)/.test(pathname)) {
      response.statusCode = 404;
      response.setHeader("Cache-Control", "no-store");
      response.setHeader("Content-Type", "text/plain; charset=utf-8");
      response.end("Not found.");
      return;
    }
    const adminDemoCandidate = /^\/painel-[A-Za-z0-9_-]{24,}(?:\/|$)/.test(
      pathname,
    );
    const activeAdminPath =
      adminDemoPath &&
      (pathname === adminDemoPath || pathname.startsWith(`${adminDemoPath}/`));
    if (adminDemoCandidate && !activeAdminPath) {
      response.statusCode = 404;
      response.setHeader("Cache-Control", "no-store");
      response.setHeader("Content-Type", "text/plain; charset=utf-8");
      response.setHeader("Referrer-Policy", "no-referrer");
      response.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
      response.end("Not found.");
      return;
    }
    if (activeAdminPath) {
      response.setHeader(
        "Cache-Control",
        "no-cache, no-store, must-revalidate",
      );
      response.setHeader("Referrer-Policy", "no-referrer");
      response.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    }
    if (request.headers?.accept?.includes("text/html")) {
      response.setHeader(
        "Cache-Control",
        "no-cache, no-store, must-revalidate",
      );
    }
    next();
  };

  return {
    name: "bespoke-public-demo-guard",
    configureServer(server) {
      server.middlewares.use(guard);
    },
    configurePreviewServer(server) {
      server.middlewares.use(guard);
    },
  };
}

function apiProxy(target: string) {
  const passthrough = {
    target,
    changeOrigin: true,
  };

  return {
    "/api": {
      ...passthrough,
      rewrite: (path: string) => path.replace(/^\/api/, ""),
    },
    "/uploads": passthrough,
    "/webhooks": passthrough,
    "/health": passthrough,
    "/checkout/return": passthrough,
  };
}

function adminDemoProxy(adminPath: string) {
  if (!adminPath) return {};
  const apiPath = `${adminPath}/api`;

  return {
    [apiPath]: {
      target: publicDemoApiTarget,
      changeOrigin: true,
      rewrite: (path: string) => path.slice(apiPath.length) || "/",
    },
    [`${adminPath}/uploads`]: {
      target: publicDemoApiTarget,
      changeOrigin: true,
      rewrite: (path: string) => path.slice(adminPath.length),
    },
    [adminPath]: {
      target: adminDemoTarget,
      changeOrigin: true,
    },
  };
}

export default defineConfig(({ command, mode }) => {
  const publicDemo = mode === "demo";
  const adminDemoPath = normalizedAdminDemoPath(
    process.env.BESPOKE_ADMIN_DEMO_PATH,
  );
  const buildApiBaseUrl = process.env.VITE_API_BASE_URL?.trim() || "/api";
  const proxy = {
    ...(publicDemo ? adminDemoProxy(adminDemoPath) : {}),
    ...apiProxy(publicDemo ? publicDemoApiTarget : "http://127.0.0.1:3333"),
  };
  return {
    plugins: [react(), ...(publicDemo ? [publicDemoGuard(adminDemoPath)] : [])],
    build: publicDemo ? { outDir: "dist-demo" } : undefined,
    define:
      command === "build"
        ? {
            "import.meta.env.VITE_API_BASE_URL":
              JSON.stringify(buildApiBaseUrl),
          }
        : undefined,
    resolve: {
      dedupe: ["react", "react-dom"],
    },
    server: {
      port: 5173,
      proxy,
      ...(publicDemo
        ? {
            allowedHosts: [".ngrok-free.dev", ".ngrok.app"],
          }
        : {}),
    },
    preview: publicDemo
      ? {
          allowedHosts: [".ngrok-free.dev", ".ngrok.app"],
          proxy,
        }
      : undefined,
  };
});
