import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  base: "/",
  build: {
    outDir: "dist",
  },
  server: {
    // 默认 5174：本机常有其它项目在 5173 占用；若仍冲突 Vite 会自动换端口，请以终端里 Local 为准打开
    port: Number(process.env.VITE_DEV_PORT || 5174),
    strictPort: false,
    // /api 转发到 Express；需与 server 的 PORT（默认 8787）一致，并单独运行「npm run dev:server」
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
