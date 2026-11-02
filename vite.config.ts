import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// In development the API is proxied, so the browser talks to one origin and CORS is never an issue.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, "..", "");
  const api = env.VITE_PROXY_TARGET || "http://127.0.0.1:8020";
  return {
    envDir: "..",
    plugins: [react()],
    server: { port: 3000, strictPort: true, proxy: { "/api": { target: api, changeOrigin: true, ws: true } } },
  };
});
