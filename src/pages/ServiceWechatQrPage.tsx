import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import { Check, Copy, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/contexts/ToastContext";
import { copyToClipboard } from "@/lib/copyToClipboard";

function wechatIdFromEnv(): string {
  const v = (import.meta.env.VITE_WECHAT_ID as string | undefined)?.trim();
  return v && v.length > 0 ? v : "你的微信号";
}

function qrUrlFromEnv(): string | undefined {
  const u = (import.meta.env.VITE_WECHAT_QR_URL as string | undefined)?.trim();
  return u && u.length > 0 ? u : undefined;
}

export function ServiceWechatQrPage() {
  const location = useLocation();
  const { showToast } = useToast();
  const fromForm = Boolean((location.state as { fromForm?: boolean } | null)?.fromForm);
  const wechatId = wechatIdFromEnv();
  const qrUrl = qrUrlFromEnv();

  React.useEffect(() => {
    document.title = "添加微信 - AI 定制服务";
  }, []);

  async function handleCopy() {
    const ok = await copyToClipboard(wechatId);
    showToast(ok ? "微信号已复制" : "复制失败，请手动长按复制", ok ? "success" : "error");
  }

  return (
    <main className="mx-auto min-w-0 max-w-lg px-4 py-12 sm:px-6 sm:py-16">
      <Card className="overflow-hidden border-border/80 shadow-lg">
        <CardHeader className="space-y-2 border-b border-border/60 bg-muted/30 pb-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <MessageCircle className="h-6 w-6" aria-hidden />
          </div>
          <CardTitle className="text-xl sm:text-2xl">
            {fromForm ? "需求已收到" : "微信联系"}
          </CardTitle>
          <div className="space-y-2 text-base leading-relaxed text-foreground/90">
            <p>已收到您的需求！请添加微信获取报价方案：</p>
            <p className="text-lg font-semibold tracking-tight text-violet-600 dark:text-violet-400">
              {wechatId}
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-8">
          {qrUrl ? (
            <div className="overflow-hidden rounded-xl border border-border/80 bg-background p-2 shadow-inner">
              <img
                src={qrUrl}
                alt="微信联系二维码"
                className="mx-auto max-h-[min(70vh,22rem)] w-full max-w-xs object-contain"
              />
            </div>
          ) : (
            <div className="flex aspect-square max-h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/40 p-6 text-center">
              <p className="text-sm font-medium text-muted-foreground">二维码占位</p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                在环境变量中设置{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-[11px]">VITE_WECHAT_QR_URL</code>{" "}
                为你的二维码图片地址，或把图片放到 <code className="rounded bg-muted px-1 py-0.5 text-[11px]">public/wechat-qr.png</code>{" "}
                后把地址写为 <code className="rounded bg-muted px-1 py-0.5 text-[11px]">/wechat-qr.png</code>
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button type="button" className="gap-2" onClick={() => void handleCopy()}>
              <Copy className="h-4 w-4" />
              复制微信号
            </Button>
            <Button variant="outline" asChild>
              <Link to="/services#request-form">返回服务页</Link>
            </Button>
          </div>

          <p className="flex items-start justify-center gap-2 text-center text-xs text-muted-foreground">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
            添加时请备注「官网报价」，便于优先通过
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
