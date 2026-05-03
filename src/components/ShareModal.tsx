import * as React from "react";
import QRCode from "react-qr-code";
import { Check, Copy, Link2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/contexts/ToastContext";
import { createShareShortLink, friendlyAuthErrorMessage } from "@/lib/siteAuthApi";

export type ShareModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** 完整可分享 URL；为空时展示占位 */
  url: string;
  /** 是否展示「生成推广短链」（走 API 域名 /s/:code，带点击统计） */
  enableShortLink?: boolean;
};

const inputReadonlyClass =
  "min-h-10 w-full flex-1 rounded-md border border-border/80 bg-muted/40 px-3 py-2 font-mono text-xs text-foreground shadow-sm sm:text-sm";

export function ShareModal({ open, onOpenChange, title, url, enableShortLink = true }: ShareModalProps) {
  const { showToast } = useToast();
  const [copied, setCopied] = React.useState(false);
  const [shortUrl, setShortUrl] = React.useState("");
  const [shortGenerating, setShortGenerating] = React.useState(false);
  const [shortCopied, setShortCopied] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setCopied(false);
      setShortUrl("");
      setShortGenerating(false);
      setShortCopied(false);
    }
  }, [open]);

  async function handleCopyLong() {
    if (!url.trim()) {
      showToast("暂无可复制链接", "info");
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      showToast("链接已复制", "success");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("复制失败，请手动选中链接复制", "error");
    }
  }

  async function handleCopyShort() {
    if (!shortUrl.trim()) return;
    try {
      await navigator.clipboard.writeText(shortUrl);
      setShortCopied(true);
      showToast("短链已复制", "success");
      window.setTimeout(() => setShortCopied(false), 2000);
    } catch {
      showToast("复制失败", "error");
    }
  }

  async function handleGenerateShort() {
    if (!url.trim()) {
      showToast("请先有可分享的原链接", "info");
      return;
    }
    setShortGenerating(true);
    try {
      const r = await createShareShortLink(url, title);
      setShortUrl(r.shortUrl);
      showToast("短链已生成（扫码打开会先经 API 再跳转）", "success");
    } catch (e) {
      showToast(friendlyAuthErrorMessage(e, "生成短链失败"), "error");
    } finally {
      setShortGenerating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md gap-4 overflow-y-auto border-border/80 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">分享「{title}」</DialogTitle>
          <DialogDescription>扫码或复制链接；短链带点击统计，需使用 API 域名访问。</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-6 py-1">
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">原链接</p>
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-xl border border-border/60 bg-white p-3 shadow-sm">
                {url ? (
                  <QRCode value={url} size={168} level="M" />
                ) : (
                  <div className="flex h-[168px] w-[168px] items-center justify-center text-xs text-muted-foreground">
                    加载中…
                  </div>
                )}
              </div>
              <div className="flex w-full items-stretch gap-2">
                <input readOnly className={inputReadonlyClass} value={url} aria-label="原分享链接" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0 border-border/80"
                  onClick={() => void handleCopyLong()}
                  aria-label={copied ? "已复制" : "复制原链接"}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-600" aria-hidden />
                  ) : (
                    <Copy className="h-4 w-4" aria-hidden />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {enableShortLink ? (
            <div className="border-t border-border/60 pt-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-medium text-muted-foreground">推广短链（统计点击）</p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="gap-1.5"
                  disabled={shortGenerating || !url.trim()}
                  onClick={() => void handleGenerateShort()}
                >
                  <Link2 className="h-3.5 w-3.5" aria-hidden />
                  {shortGenerating ? "生成中…" : shortUrl ? "重新生成" : "生成短链"}
                </Button>
              </div>
              {shortUrl ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="rounded-xl border border-border/60 bg-white p-3 shadow-sm">
                    <QRCode value={shortUrl} size={168} level="M" />
                  </div>
                  <div className="flex w-full items-stretch gap-2">
                    <input readOnly className={inputReadonlyClass} value={shortUrl} aria-label="短链接" />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 shrink-0 border-border/80"
                      onClick={() => void handleCopyShort()}
                      aria-label={shortCopied ? "已复制" : "复制短链"}
                    >
                      {shortCopied ? (
                        <Check className="h-4 w-4 text-emerald-600" aria-hidden />
                      ) : (
                        <Copy className="h-4 w-4" aria-hidden />
                      )}
                    </Button>
                  </div>
                  <p className="text-center text-[11px] leading-snug text-muted-foreground">
                    短链指向后端 <span className="font-mono">/s/…</span>，打开后跳转原页并计入后台「分享短链统计」。
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">生成后可将短链发到微信等渠道，便于统计访问量。</p>
              )}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** 在浏览器中拼出某路径的完整 URL */
export function buildAbsoluteShareUrl(pathOrHref: string): string {
  if (typeof window === "undefined") return "";
  try {
    return new URL(pathOrHref, window.location.origin).href;
  } catch {
    return pathOrHref.startsWith("http") ? pathOrHref : `${window.location.origin}${pathOrHref}`;
  }
}
