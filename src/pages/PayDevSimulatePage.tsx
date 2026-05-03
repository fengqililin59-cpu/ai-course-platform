import * as React from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { resolveApiUrl } from "@/lib/apiBase";
import { useToast } from "@/contexts/ToastContext";

/**
 * PAY_DEV_SIMULATE=1 时：create-order 不落支付宝，跳转本页再调用 /api/pay/test-simulate-paid 完成入账与分销。
 */
export function PayDevSimulatePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [busy, setBusy] = React.useState(false);

  const outTradeNo = searchParams.get("outTradeNo") ?? "";
  const courseId = searchParams.get("courseId") ?? "";
  const amount = searchParams.get("amount") ?? "";
  const courseName = searchParams.get("courseName") ?? "";

  const valid = Boolean(outTradeNo && courseId);

  async function simulatePaid() {
    if (!outTradeNo) return;
    setBusy(true);
    try {
      const res = await fetch(resolveApiUrl("/api/pay/test-simulate-paid"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outTradeNo }),
      });
      const data: { message?: string } = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || `模拟支付失败（${res.status}）`);
      }
      showToast("已模拟支付成功", "success");
      const q = new URLSearchParams();
      q.set("orderId", outTradeNo);
      q.set("courseId", courseId);
      if (amount) q.set("amount", amount);
      if (courseName) q.set("courseName", courseName);
      navigate(`/pay/success?${q.toString()}`, { replace: true });
    } catch (e) {
      showToast(e instanceof Error ? e.message : "模拟支付失败", "error");
    } finally {
      setBusy(false);
    }
  }

  React.useEffect(() => {
    document.title = "模拟支付 - AIlearn Pro";
  }, []);

  return (
    <main className="mx-auto min-w-0 max-w-lg px-4 py-16 sm:px-6 sm:py-20">
      <Card className="border-border/80 shadow-md">
        <CardHeader>
          <CardTitle>开发环境 · 模拟支付</CardTitle>
          <CardDescription>
            服务端需设置 PAY_DEV_SIMULATE=1。点击下方按钮将订单标为已支付并触发分销佣金入账（与支付宝回调逻辑一致）。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!valid ? (
            <p className="text-sm text-destructive">缺少 outTradeNo 或 courseId，请从课程页重新下单。</p>
          ) : (
            <>
              <dl className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">订单号</dt>
                  <dd className="mt-0.5 break-all font-mono text-xs">{outTradeNo}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">课程</dt>
                  <dd className="mt-0.5 font-medium">{courseName || courseId}</dd>
                </div>
                {amount ? (
                  <div>
                    <dt className="text-muted-foreground">金额</dt>
                    <dd className="mt-0.5">¥{amount}</dd>
                  </div>
                ) : null}
              </dl>
              <Button
                type="button"
                className="w-full"
                disabled={busy}
                onClick={() => void simulatePaid()}
              >
                {busy ? "处理中…" : "确认模拟支付（写入佣金）"}
              </Button>
            </>
          )}
          <Button variant="outline" className="w-full" asChild>
            <Link to={courseId ? `/courses/${courseId}` : "/courses"}>返回课程</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
