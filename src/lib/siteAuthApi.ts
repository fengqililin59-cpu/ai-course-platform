import { resolveApiUrl } from "@/lib/apiBase";
import { getSiteUserToken } from "@/lib/siteUserAuth";

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    const trimmed = text.trim();
    const looksHtml = /^\s*</i.test(trimmed);
    const looksProxyPlain =
      trimmed === "Internal Server Error" ||
      /ECONNREFUSED|socket hang up|502 Bad Gateway/i.test(trimmed.slice(0, 400));
    if (res.status >= 502 || (res.status === 500 && (looksHtml || looksProxyPlain))) {
      throw new Error(
        "无法连接后端 API。请在仓库根目录另开终端执行「npm run dev:server」（默认监听 8787），与当前页面的 Vite 开发服务同时运行后再试。",
      );
    }
    if (res.status === 404 && /Cannot (GET|POST|PUT|PATCH|DELETE) \/api\//i.test(trimmed)) {
      throw new Error(
        "API 返回 404：该路径在当前访问的域名上不存在。开发环境请确认已运行后端（如 8787）且 Vite 已将 /api 代理到后端；生产构建请检查 VITE_PAY_API_BASE 是否指向完整 API 域名。",
      );
    }
    throw new Error(trimmed.slice(0, 300) || res.statusText || "请求失败");
  }
}

function errMessage(body: unknown, fallback: string): string {
  if (
    body &&
    typeof body === "object" &&
    "message" in body &&
    typeof (body as { message: unknown }).message === "string"
  ) {
    return (body as { message: string }).message;
  }
  return fallback;
}

/** 将异常转为用户可读文案，避免展示环境变量、英文堆栈等技术细节 */
export function friendlyAuthErrorMessage(err: unknown, fallback = "操作失败，请稍后重试"): string {
  const raw = (err instanceof Error ? err.message : String(err ?? "")).trim();
  if (!raw) return fallback;
  if (
    /ECONNREFUSED|无法连接后端|502 Bad Gateway|502|504|hang up|Internal Server Error|socket/i.test(raw)
  ) {
    return "网络异常，请检查网络或稍后再试";
  }
  if (
    /未配置|WECHAT_|WECHAT|APP_SECRET|REDIRECT_URI|SMTP|nodemailer|DATABASE|sqlite|UNIQUE constraint/i.test(
      raw,
    )
  ) {
    return fallback;
  }
  if (raw.length > 160) return fallback;
  return raw;
}

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  message?: string;
};

/** 校验前台登录短信（与创作者共用 /api/creator/send-code 下发的验证码），成功时返回站点 JWT */
export async function verifyPhoneForSiteLogin(
  phone: string,
  code: string,
): Promise<{ phone: string; token?: string }> {
  const res = await fetch(resolveApiUrl("/api/auth/verify-phone"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, code }),
  });
  const data = await parseJson<ApiEnvelope<{ phone?: string; token?: string }>>(res);
  if (!res.ok || data.success === false) {
    throw new Error(errMessage(data, `验证失败 (${res.status})`));
  }
  const p = data.data?.phone ?? phone.trim();
  return { phone: p, token: data.data?.token };
}

export async function sendSitePhoneCode(
  phone: string,
  type?: "register" | "login",
): Promise<void> {
  const res = await fetch(resolveApiUrl("/api/auth/send-phone-code"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: phone.trim(), ...(type ? { type } : {}) }),
  });
  const data = await parseJson<ApiEnvelope<{ type?: string } | null>>(res);
  if (!res.ok || data.success === false) {
    throw new Error(errMessage(data, `发送失败 (${res.status})`));
  }
}

export async function registerSitePhone(body: {
  phone: string;
  code: string;
  password: string;
  confirmPassword: string;
}): Promise<{ phone: string; token?: string }> {
  const res = await fetch(resolveApiUrl("/api/auth/phone-register"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone: body.phone.trim(),
      code: body.code.trim(),
      password: body.password,
      confirmPassword: body.confirmPassword,
    }),
  });
  const data = await parseJson<ApiEnvelope<{ token?: string; user?: { phone?: string } }>>(res);
  if (!res.ok || data.success === false) {
    throw new Error(errMessage(data, `注册失败 (${res.status})`));
  }
  const phone = data.data?.user?.phone ?? body.phone.trim();
  return { phone, token: data.data?.token };
}

export async function loginSitePhonePassword(
  phone: string,
  password: string,
): Promise<{ phone: string; token?: string }> {
  const res = await fetch(resolveApiUrl("/api/auth/phone-password-login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: phone.trim(), password }),
  });
  const data = await parseJson<ApiEnvelope<{ token?: string; user?: { phone?: string } }>>(res);
  if (!res.ok || data.success === false) {
    throw new Error(errMessage(data, `登录失败 (${res.status})`));
  }
  const p = data.data?.user?.phone ?? phone.trim();
  return { phone: p, token: data.data?.token };
}

export async function sendSiteEmailCode(email: string): Promise<void> {
  const res = await fetch(resolveApiUrl("/api/auth/send-email-code"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim() }),
  });
  const data = await parseJson<ApiEnvelope<null>>(res);
  if (!res.ok || data.success === false) {
    throw new Error(errMessage(data, `发送失败 (${res.status})`));
  }
}

export async function registerSiteEmail(body: {
  email: string;
  password: string;
  code: string;
}): Promise<{ email: string; token?: string }> {
  const res = await fetch(resolveApiUrl("/api/auth/email-register"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: body.email.trim(),
      password: body.password,
      code: body.code.trim(),
    }),
  });
  const data = await parseJson<ApiEnvelope<{ email?: string; token?: string }>>(res);
  if (!res.ok || data.success === false) {
    throw new Error(errMessage(data, `注册失败 (${res.status})`));
  }
  const email = data.data?.email ?? body.email.trim();
  return { email, token: data.data?.token };
}

/** 用站点 JWT 解析前台展示用登录标识（与 LoginModal 传入 login() 的格式一致） */
export async function fetchSiteIdentityFromToken(token: string): Promise<string | null> {
  const raw = token.trim();
  if (!raw) return null;
  const res = await fetch(resolveApiUrl(`/api/auth/site-token?token=${encodeURIComponent(raw)}`));
  const data = await parseJson<
    ApiEnvelope<{
      sub?: string;
      phone?: string;
      email?: string;
      openid?: string;
      github_id?: string | number;
      google_sub?: string;
    }>
  >(res);
  if (!res.ok || data.success === false || !data.data) {
    return null;
  }
  const d = data.data;
  if (d.phone) return String(d.phone).trim();
  if (d.email) return `mail:${String(d.email).trim()}`;
  if (d.openid) return `wx:${String(d.openid).trim()}`;
  if (d.github_id != null && String(d.github_id).trim()) return `gh:${String(d.github_id).trim()}`;
  if (d.google_sub != null && String(d.google_sub).trim()) return `google:${String(d.google_sub).trim()}`;
  return null;
}

export async function requestPasswordResetCode(account: string): Promise<void> {
  const res = await fetch(resolveApiUrl("/api/auth/request-reset-code"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ account: account.trim() }),
  });
  const data = await parseJson<ApiEnvelope<null>>(res);
  if (res.status === 429) {
    throw new Error(errMessage(data, "操作过于频繁，请 1 小时后再试"));
  }
  if (!res.ok || data.success === false) {
    throw new Error(errMessage(data, `发送失败 (${res.status})`));
  }
}

export async function resetSitePassword(body: {
  account: string;
  code: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<void> {
  const res = await fetch(resolveApiUrl("/api/auth/reset-password"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      account: body.account.trim(),
      code: body.code.trim(),
      newPassword: body.newPassword,
      confirmPassword: body.confirmPassword,
    }),
  });
  const data = await parseJson<ApiEnvelope<null>>(res);
  if (!res.ok || data.success === false) {
    throw new Error(errMessage(data, `重置失败 (${res.status})`));
  }
}

export async function fetchOauthConfig(): Promise<{ github: boolean; google: boolean }> {
  const res = await fetch(resolveApiUrl("/api/auth/oauth-config"));
  const data = await parseJson<ApiEnvelope<{ github?: boolean; google?: boolean }>>(res);
  if (!res.ok || data.success === false || !data.data) {
    return { github: false, google: false };
  }
  return {
    github: Boolean(data.data.github),
    google: Boolean(data.data.google),
  };
}

export async function fetchOAuthLinks(): Promise<{
  github: boolean;
  google: boolean;
  wechat: boolean;
}> {
  const tok = getSiteUserToken();
  if (!tok) {
    throw new Error("未登录");
  }
  const res = await fetch(resolveApiUrl("/api/auth/oauth-links"), {
    headers: { Authorization: `Bearer ${tok}` },
  });
  const data = await parseJson<ApiEnvelope<{ github?: boolean; google?: boolean; wechat?: boolean }>>(res);
  if (!res.ok || data.success === false || !data.data) {
    throw new Error(errMessage(data, "无法获取绑定状态"));
  }
  return {
    github: Boolean(data.data.github),
    google: Boolean(data.data.google),
    wechat: Boolean(data.data.wechat),
  };
}

export async function fetchGithubOAuthUrl(opts?: { mode?: "login" | "link" }): Promise<string> {
  const mode = opts?.mode === "link" ? "link" : "login";
  const q = mode === "link" ? "?mode=link" : "";
  const headers: HeadersInit = {};
  if (mode === "link") {
    const tok = getSiteUserToken();
    if (tok) headers.Authorization = `Bearer ${tok}`;
  }
  const res = await fetch(resolveApiUrl(`/api/auth/github/url${q}`), { headers });
  const data = await parseJson<ApiEnvelope<{ url?: string }>>(res);
  if (!res.ok || data.success === false || !data.data?.url) {
    throw new Error(errMessage(data, "无法获取 GitHub 授权地址"));
  }
  return data.data.url;
}

export async function fetchGoogleOAuthUrl(opts?: { mode?: "login" | "link" }): Promise<string> {
  const mode = opts?.mode === "link" ? "link" : "login";
  const q = mode === "link" ? "?mode=link" : "";
  const headers: HeadersInit = {};
  if (mode === "link") {
    const tok = getSiteUserToken();
    if (tok) headers.Authorization = `Bearer ${tok}`;
  }
  const res = await fetch(resolveApiUrl(`/api/auth/google/url${q}`), { headers });
  const data = await parseJson<ApiEnvelope<{ url?: string }>>(res);
  if (!res.ok || data.success === false || !data.data?.url) {
    throw new Error(errMessage(data, "无法获取 Google 授权地址"));
  }
  return data.data.url;
}

export async function unlinkOAuth(provider: "github" | "google" | "wechat"): Promise<string> {
  const tok = getSiteUserToken();
  if (!tok) {
    throw new Error("未登录");
  }
  const res = await fetch(resolveApiUrl("/api/auth/unlink-oauth"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` },
    body: JSON.stringify({ provider }),
  });
  const data = await parseJson<ApiEnvelope<unknown>>(res);
  if (!res.ok || data.success === false) {
    throw new Error(errMessage(data, `解绑失败 (${res.status})`));
  }
  if (data.message && typeof data.message === "string") return data.message;
  return "已解绑";
}

/** 短链指向 API 域名 `/s/:code`，点击后 302 到 targetUrl 并累计 click_count */
export async function createShareShortLink(
  targetUrl: string,
  title?: string,
): Promise<{ shortUrl: string; shortCode: string }> {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  const tok = getSiteUserToken();
  if (tok) {
    headers.Authorization = `Bearer ${tok}`;
  }
  const res = await fetch(resolveApiUrl("/api/share/create"), {
    method: "POST",
    headers,
    body: JSON.stringify({
      targetUrl: targetUrl.trim(),
      ...(title != null && title.trim() ? { title: title.trim() } : {}),
    }),
  });
  const data = await parseJson<ApiEnvelope<{ shortUrl?: string; shortCode?: string }>>(res);
  if (!res.ok || data.success === false || !data.data?.shortUrl || !data.data.shortCode) {
    throw new Error(errMessage(data, "生成短链失败"));
  }
  return { shortUrl: data.data.shortUrl, shortCode: data.data.shortCode };
}

export async function loginSiteEmail(
  email: string,
  password: string,
): Promise<{ email: string; token?: string }> {
  const res = await fetch(resolveApiUrl("/api/auth/email-login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim(), password }),
  });
  const data = await parseJson<
    ApiEnvelope<{ email?: string; emailVerified?: boolean; token?: string }>
  >(res);
  if (!res.ok || data.success === false || !data.data?.email) {
    throw new Error(errMessage(data, `登录失败 (${res.status})`));
  }
  return {
    email: data.data.email,
    token: data.data.token,
  };
}

/** 后端根据 WECHAT_WEB_APP_ID 等是否齐全判定，不返回敏感信息 */
export async function fetchWechatLoginStatus(): Promise<{ available: boolean }> {
  const res = await fetch(resolveApiUrl("/api/auth/wechat-login-status"));
  const data = await parseJson<ApiEnvelope<{ available?: boolean }>>(res);
  if (!res.ok || data.success === false || !data.data) {
    return { available: false };
  }
  return { available: Boolean(data.data.available) };
}

export type WechatQrPayload = {
  configured: boolean;
  qrUrl: string | null;
  state: string | null;
  message?: string;
};

export async function fetchWechatQrUrl(): Promise<WechatQrPayload> {
  const res = await fetch(resolveApiUrl("/api/auth/wechat-qr-url"));
  const data = await parseJson<ApiEnvelope<WechatQrPayload>>(res);
  if (!res.ok || data.success === false || !data.data) {
    throw new Error(errMessage(data, "获取微信登录地址失败"));
  }
  return data.data;
}

export async function pollWechatScan(state: string): Promise<{
  status: "waiting" | "done";
  wechatOpenId?: string;
  token?: string;
}> {
  const q = new URLSearchParams({ state });
  const res = await fetch(resolveApiUrl(`/api/auth/wechat-scan?${q.toString()}`));
  const data = await parseJson<
    ApiEnvelope<{ status?: string; wechatOpenId?: string; token?: string }>
  >(res);
  if (!res.ok || data.success === false) {
    throw new Error(errMessage(data, `查询失败 (${res.status})`));
  }
  const st = data.data?.status === "done" ? "done" : "waiting";
  return {
    status: st,
    wechatOpenId: data.data?.wechatOpenId,
    token: data.data?.token,
  };
}
