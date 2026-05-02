import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/contexts/ToastContext";
import { cn } from "@/lib/utils";

const inputClass =
  "flex min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export function CreatorLoginPage() {
  const { showToast } = useToast();
  const [phone, setPhone] = React.useState("");
  const [code, setCode] = React.useState("");
  const [countdown, setCountdown] = React.useState(0);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    document.title = "创作者登录 - 智学 AI";
  }, []);

  React.useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  async function handleSendCode() {
    if (!phone.trim() || phone.trim().length !== 11) {
      showToast("请输入正确的手机号", "error");
      return;
    }
    setCountdown(60);
    try {
      const res = await fetch("/api/creator/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("验证码已发送", "success");
      } else {
        showToast(data.message || "发送失败，请重试", "error");
        setCountdown(0);
      }
    } catch {
      showToast("网络错误，请重试", "error");
      setCountdown(0);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim() || !code.trim()) {
      showToast("请填写手机号和验证码", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/creator/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), code: code.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("登录成功", "success");
        // 存储 token
        localStorage.setItem("creator_token", data.token);
        localStorage.setItem("creator_info", JSON.stringify(data.creator));
        window.location.href = "/creator";
      } else {
        showToast(data.message || "验证码错误", "error");
      }
    } catch {
      showToast("网络错误，请重试", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      {/* 背景装饰 */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-br from-emerald-950/40 via-background to-teal-950/20" />
      <div
        aria-hidden
        className="pointer-events-none fixed left-1/2 top-1/3 -z-10 h-[30rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-[120px]"
      />

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <a href="/" className="inline-flex items-center gap-2 text-xl font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white text-sm font-bold">智</span>
            智学 AI
          </a>
          <p className="mt-2 text-sm text-muted-foreground">创作者中心</p>
        </div>

        <Card className="border-border/80 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">登录 / 注册</CardTitle>
            <CardDescription>手机号验证码登录，没有账号会自动注册</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleLogin}>
              <div>
                <label htmlFor="creator-phone" className="text-sm font-medium">
                  手机号
                </label>
                <input
                  id="creator-phone"
                  type="tel"
                  inputMode="numeric"
                  maxLength={11}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={cn(inputClass, "mt-1.5")}
                  placeholder="请输入手机号"
                />
              </div>
              <div>
                <label htmlFor="creator-code" className="text-sm font-medium">
                  验证码
                </label>
                <div className="mt-1.5 flex gap-2">
                  <input
                    id="creator-code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className={cn(inputClass, "flex-1")}
                    placeholder="6位验证码"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0 w-28"
                    disabled={countdown > 0}
                    onClick={handleSendCode}
                  >
                    {countdown > 0 ? `${countdown}s 后重发` : "获取验证码"}
                  </Button>
                </div>
              </div>
              <Button type="submit" className="w-full mt-2" disabled={loading}>
                {loading ? "登录中..." : "登录 / 注册"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          登录即代表同意{" "}
          <a href="/terms" className="underline underline-offset-2 hover:text-foreground">
            服务条款
          </a>{" "}
          和{" "}
          <a href="/privacy" className="underline underline-offset-2 hover:text-foreground">
            隐私政策
          </a>
        </p>
      </div>
    </main>
  );
}
