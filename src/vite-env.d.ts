/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 支付 API 根地址，留空则使用当前站点同源（开发环境由 Vite 代理到 server） */
  readonly VITE_PAY_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
