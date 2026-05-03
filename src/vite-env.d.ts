/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API 根地址（支付/短信/创作者等同源接口）；留空则当前站点同源，开发环境由 Vite 代理到 server */
  readonly VITE_PAY_API_BASE?: string;
  /** 与 server 环境变量 ADMIN_PASSWORD 一致，用于 /api/admin Bearer；不设则开发默认 Aike@2026#Ai */
  readonly VITE_ADMIN_API_BEARER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
