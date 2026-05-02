import * as React from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  isCreatorLoggedIn,
  setCreatorSession,
} from "@/creator/CreatorAuth";
import { creatorLogin, creatorSendCode } from "@/lib/creatorApi";

const inputClass =
  "flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:focus:border-emerald-400";

export function CreatorLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from =
    (location.state as { from?: string } | null)?.from ?? "/creator";

  const [phone, setPhone] = React.useState("");
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [loggingIn, setLoggingIn] = React.useState(false);
  const [cooldown, setCooldown] = React.useState(0);

  React.useEffect(() => {
    document.title = "创作者登录 - 智学 AI";
  }, []);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setInterval(() => {
      setCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [cooldown]);

  if (isCreatorLoggedIn()) {
    return <Navigate to="/creator" replace />;
  }

  async function handleSendCode() {
    setError("");
    setSending(true);
    try {
      await creatorSendCode(phone.trim());
      setCooldown(60);
    } catch (e) {
      setError(e instanceof Error ? e.message : "发送失败");
    } finally {
      setSending(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoggingIn(true);
    try {
      const { token, creator } = await creatorLogin(phone.trim(), code.trim());
      setCreatorSession(token, creator);
      const target =
        from.startsWith("/creator") && !from.includes("login") ? from : "/creator";
      navigate(target, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "登录失败");
    } finally {
      setLoggingIn(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 px-4 py-12">
      <Card className="w-full max-w-md border-slate-200/80 bg-white/95 shadow-2xl dark:border-slate-700 dark:bg-slate-900/95">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">
            创作者中心
          </CardTitle>
          <CardDescription>使用手机号 + 验证码登录</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="creator-phone" className="text-sm font-medium">
                手机号
              </label>
              <input
                id="creator-phone"
                inputMode="numeric"
                autoComplete="tel"
                maxLength={11}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                className={inputClass}
                placeholder="11 位中国大陆手机号"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="creator-code" className="text-sm font-medium">
                验证码
              </label>
              <div className="flex gap-2">
                <input
                  id="creator-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className={inputClass}
                  placeholder="6 位验证码"
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 shrink-0 px-3"
                  disabled={sending || cooldown > 0 || phone.length !== 11}
                  onClick={() => void handleSendCode()}
                >
                  {cooldown > 0 ? `${cooldown}s` : sending ? "发送中" : "获取验证码"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                开发环境可查看服务端控制台验证码，或直接使用{" "}
                <span className="font-mono text-foreground">888888</span> 登录。
              </p>
            </div>
            {error ? (
              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                {error}
              </p>
            ) : null}
            <Button
              type="submit"
              className="h-11 w-full rounded-lg bg-emerald-600 text-base hover:bg-emerald-700"
              disabled={loggingIn}
            >
              {loggingIn ? "登录中…" : "登录"}
            </Button>
          </form>
          <p className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-xs text-muted-foreground">
            <Link to="/" className="underline-offset-2 hover:underline">
              返回首页
            </Link>
            <span aria-hidden className="text-border">
              |
            </span>
            <Link to="/join" className="underline-offset-2 hover:underline">
              申请入驻
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
