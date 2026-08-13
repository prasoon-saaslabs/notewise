import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname), "");
  const proxyTarget =
    env.VITE_PROXY_TARGET ||
    (env.VITE_API_URL && !env.VITE_API_URL.startsWith("/")
      ? env.VITE_API_URL
      : "http://127.0.0.1:3002");

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    server: {
      host: "127.0.0.1",
      port: 5173,
      strictPort: true,
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api/, ""),
          // WebSocket proxy for PyAI Hear live path
          ws: true,
        },
      },
    },
  };
});
