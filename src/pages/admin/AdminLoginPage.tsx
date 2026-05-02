import * as React from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { adminLogin, isAdminLoggedIn, setAdminApiToken } from "@/admin/AdminAuth";

export function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/admin/dashboard";

  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");

  if (isAdminLoggedIn()) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (username === "aike2026" && password === "Aike@2026#Aie0181bdbba9e1f") {
      adminLogin();
      const bearer =
        (import.meta.env.VITE_ADMIN_API_BEARER || "Aike@2026#Ai").trim() || "Aike@2026#Ai";
      setAdminApiToken(bearer);
      navigate(from.startsWith("/admin") ? from : "/admin/dashboard", { replace: true });
      return;
    }
    setError("账号或密码错误");
  }

  const inputClass =
    "flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm shadow-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-900 dark:focus:border-violet-400";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950 px-4 py-12">
      <Card className="w-full max-w-md border-slate-200/80 bg-white/95 shadow-2xl dark:border-slate-700 dark:bg-slate-900/95">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">后台登录</CardTitle>
          <CardDescription>仅限管理员访问</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="admin-user" className="text-sm font-medium">
                用户名
              </label>
              <input
                id="admin-user"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={inputClass}
                placeholder="请输入"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="admin-pass" className="text-sm font-medium">
                密码
              </label>
              <input
                id="admin-pass"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                placeholder="••••••••"
                required
              />
            </div>
            {error ? (
              <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
            ) : null}
            <Button type="submit" className="h-11 w-full rounded-lg text-base">
              登录
            </Button>
          </form>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link to="/" className="underline-offset-2 hover:underline">
              返回前台首页
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
