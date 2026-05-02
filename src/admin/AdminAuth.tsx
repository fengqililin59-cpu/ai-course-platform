import { Navigate, Outlet, useLocation } from "react-router-dom";

export const ADMIN_AUTH_KEY = "admin_logged_in";
export const ADMIN_AUTH_VALUE = "1";

export function isAdminLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(ADMIN_AUTH_KEY) === ADMIN_AUTH_VALUE;
}

export function adminLogin(): void {
  window.localStorage.setItem(ADMIN_AUTH_KEY, ADMIN_AUTH_VALUE);
}

export function adminLogout(): void {
  window.localStorage.removeItem(ADMIN_AUTH_KEY);
}

/** 未登录访问 /admin/*（除 login）时跳转登录 */
export function AdminRequireAuth() {
  const location = useLocation();
  if (!isAdminLoggedIn()) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
