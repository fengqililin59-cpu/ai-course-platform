/**
 * 解析前端要请求的 API 地址。
 * - **开发（`import.meta.env.DEV`）**：始终使用相对路径，走 Vite `proxy`，不受 `VITE_PAY_API_BASE` 影响
 *   （避免 .env / 其它 mode 里残留的生产变量把请求打到线上导致 404）。
 * - **生产**：使用 `VITE_PAY_API_BASE`（须为跑完整 `server/index.js` 的域名）；未配置时仍用相对路径（同域部署）。
 */
export function resolveApiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (import.meta.env.DEV) {
    return p;
  }
  const raw = String(import.meta.env.VITE_PAY_API_BASE ?? "").trim();
  const base = raw.replace(/\/$/, "");
  if (!base) return p;
  return `${base}${p}`;
}
