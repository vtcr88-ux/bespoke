import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: { dedupe: ["react", "react-dom"] },
  server: {
    port: 5175,
    proxy: {
      "/control-api": {
        target: "http://127.0.0.1:3340",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/control-api/, ""),
      },
    },
  },
});
