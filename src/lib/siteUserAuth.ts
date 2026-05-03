/** 与邮箱 / 微信站点登录返回的 JWT 一致，供 /api/user/* 等请求携带 */
export const SITE_USER_TOKEN_KEY = "site_user_token";

export function getSiteUserToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const t = window.localStorage.getItem(SITE_USER_TOKEN_KEY)?.trim();
    return t || null;
  } catch {
    return null;
  }
}

export function setSiteUserToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SITE_USER_TOKEN_KEY, token.trim());
}

export function clearSiteUserToken(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SITE_USER_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}
