import { Navigate, Outlet, useLocation } from "react-router-dom";

export const ADMIN_AUTH_KEY = "admin_logged_in";
export const ADMIN_AUTH_VALUE = "1";

/** 与 server/routes/admin.js 的 Bearer 校验一致（localStorage，供 /api/admin 请求） */
export const ADMIN_API_TOKEN_KEY = "admin_token";

export function getAdminApiToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ADMIN_API_TOKEN_KEY);
}

/** 登录成功后写入；需与服务器环境变量 ADMIN_PASSWORD 一致 */
export function setAdminApiToken(token: string): void {
  window.localStorage.setItem(ADMIN_API_TOKEN_KEY, token);
}

export function clearAdminApiToken(): void {
  window.localStorage.removeItem(ADMIN_API_TOKEN_KEY);
}

export function isAdminLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(ADMIN_AUTH_KEY) === ADMIN_AUTH_VALUE;
}

export function adminLogin(): void {
  window.localStorage.setItem(ADMIN_AUTH_KEY, ADMIN_AUTH_VALUE);
}

export function adminLogout(): void {
  window.localStorage.removeItem(ADMIN_AUTH_KEY);
  clearAdminApiToken();
}

/** 未登录访问 /admin/*（除 login）时跳转登录 */
export function AdminRequireAuth() {
  const location = useLocation();
  if (!isAdminLoggedIn()) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
