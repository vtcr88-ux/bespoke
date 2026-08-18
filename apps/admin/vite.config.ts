import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function normalizedBasePath(value: string | undefined) {
  const path = value?.trim();
  if (!path) return "/";
  return `/${path.replace(/^\/+|\/+$/g, "")}/`;
}

export default defineConfig(({ command, mode }) => {
  const adminDemo = mode === "demo";
  const base = adminDemo
    ? normalizedBasePath(process.env.VITE_ADMIN_BASE_PATH)
    : "/";

  return {
    base,
    plugins: [react()],
    build: adminDemo ? { outDir: "dist-demo" } : undefined,
    define:
      adminDemo && command === "build"
        ? {
            "import.meta.env.VITE_API_BASE_URL": JSON.stringify(
              process.env.VITE_API_BASE_URL?.trim() || "/api",
            ),
            "import.meta.env.VITE_STOREFRONT_PREVIEW_URL": JSON.stringify(""),
          }
        : undefined,
    resolve: {
      dedupe: ["react", "react-dom"],
    },
    server: {
      port: 5174,
    },
  };
});
