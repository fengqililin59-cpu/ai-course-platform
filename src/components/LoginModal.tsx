import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const inputClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

type LoginModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoginSuccess: (phone: string) => void;
};

function isValidPhone(phone: string): boolean {
  return /^1\d{10}$/.test(phone.trim());
}

export function LoginModal({
  open,
  onOpenChange,
  onLoginSuccess,
}: LoginModalProps) {
  const [phone, setPhone] = React.useState("");
  const [code, setCode] = React.useState("");
  const [countdown, setCountdown] = React.useState(0);
  const [phoneError, setPhoneError] = React.useState("");

  React.useEffect(() => {
    if (!open) {
      setPhone("");
      setCode("");
      setCountdown(0);
      setPhoneError("");
    }
  }, [open]);

  React.useEffect(() => {
    if (countdown <= 0) return;
    const t = window.setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [countdown]);

  function handleGetCode() {
    const p = phone.trim();
    if (!isValidPhone(p)) {
      setPhoneError("请输入 11 位有效手机号");
      return;
    }
    setPhoneError("");
    if (countdown > 0) return;
    setCountdown(60);
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const p = phone.trim();
    if (!isValidPhone(p)) {
      setPhoneError("请输入 11 位有效手机号");
      return;
    }
    if (!code.trim()) {
      return;
    }
    onLoginSuccess(p);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>登录</DialogTitle>
          <DialogDescription>使用手机号验证码登录（演示环境，无真实接口）</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="login-phone" className="text-sm font-medium">
              手机号
            </label>
            <input
              id="login-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              maxLength={11}
              placeholder="请输入手机号"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value.replace(/\D/g, ""));
                setPhoneError("");
              }}
              className={cn(inputClass, phoneError && "border-destructive")}
            />
            {phoneError ? (
              <p className="text-xs text-destructive">{phoneError}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <label htmlFor="login-code" className="text-sm font-medium">
              验证码
            </label>
            <div className="flex gap-2">
              <input
                id="login-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="请输入验证码"
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className={cn(inputClass, "min-w-0 flex-1")}
              />
              <Button
                type="button"
                variant="outline"
                className="shrink-0 whitespace-nowrap px-3"
                disabled={countdown > 0}
                onClick={handleGetCode}
              >
                {countdown > 0 ? `重新获取(${countdown}s)` : "获取验证码"}
              </Button>
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2 sm:gap-0">
            <Button type="submit" className="w-full sm:w-auto">
              登录
            </Button>
          </DialogFooter>
        </form>
        <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
          登录即代表同意
          <a href="#" className="text-primary underline-offset-2 hover:underline">
            用户协议
          </a>
          和
          <a href="#" className="text-primary underline-offset-2 hover:underline">
            隐私政策
          </a>
        </p>
      </DialogContent>
    </Dialog>
  );
}
