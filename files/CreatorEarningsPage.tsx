import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CreatorLayout } from "./CreatorOverviewPage";

type EarningRecord = {
  id: number;
  courseName: string;
  orderAmount: number;
  creatorAmount: number;
  buyerPhone: string;
  createdAt: string;
  settledAt?: string;
  settled: boolean;
};

type MonthSummary = {
  month: string; // "2026-04"
  total: number;
  orders: number;
  settled: boolean;
};

export function CreatorEarningsPage() {
  const [records, setRecords] = React.useState<EarningRecord[]>([]);
  const [summaries, setSummaries] = React.useState<MonthSummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeMonth, setActiveMonth] = React.useState<string>("all");
  const [pendingWithdraw, setPendingWithdraw] = React.useState(0);

  React.useEffect(() => {
    document.title = "收益明细 - 创作者中心";
    fetchEarnings();
  }, []);

  async function fetchEarnings() {
    const token = localStorage.getItem("creator_token");
    try {
      const res = await fetch("/api/creator/earnings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setRecords(data.records ?? []);
        setSummaries(data.summaries ?? []);
        setPendingWithdraw(data.pendingWithdraw ?? 0);
      }
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredRecords =
    activeMonth === "all"
      ? records
      : records.filter((r) => r.createdAt.startsWith(activeMonth));

  return (
    <CreatorLayout activeKey="earnings">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">收益明细</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              每月15日结算上月收益，满100元可提现
            </p>
          </div>
          {/* 提现区 */}
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3">
            <div>
              <p className="text-xs text-muted-foreground">可提现金额</p>
              <p className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                ¥{pendingWithdraw.toFixed(2)}
              </p>
            </div>
            <Button
              size="sm"
              disabled={pendingWithdraw < 100}
              onClick={() => alert("提现功能即将上线")}
            >
              申请提现
            </Button>
          </div>
        </div>

        {/* 月度汇总 */}
        {summaries.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {summaries.slice(0, 6).map((s) => (
              <button
                key={s.month}
                onClick={() => setActiveMonth(activeMonth === s.month ? "all" : s.month)}
                className={cn(
                  "rounded-xl border px-4 py-3 text-left transition-colors",
                  activeMonth === s.month
                    ? "border-emerald-500/50 bg-emerald-500/10"
                    : "border-border/60 bg-card/60 hover:bg-muted/30"
                )}
              >
                <p className="text-xs text-muted-foreground">{s.month}</p>
                <p className="mt-0.5 text-lg font-bold tabular-nums">¥{s.total.toFixed(2)}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{s.orders} 笔订单</span>
                  {s.settled ? (
                    <span className="text-emerald-600 dark:text-emerald-400">✓ 已结算</span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400">待结算</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* 明细列表 */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">
              {activeMonth === "all" ? "全部明细" : `${activeMonth} 明细`}
            </h2>
            {activeMonth !== "all" && (
              <button
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setActiveMonth("all")}
              >
                清除筛选 ×
              </button>
            )}
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 rounded-xl border border-border/60 bg-muted/30 animate-pulse" />
              ))}
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 py-14 text-center text-sm text-muted-foreground">
              暂无收益记录
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border/60">
              <table className="w-full text-sm">
                <thead className="border-b border-border/60 bg-muted/30">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">课程</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">订单金额</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">我的收益</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">状态</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <p className="font-medium">{r.courseName}</p>
                        <p className="text-xs text-muted-foreground">{r.buyerPhone}</p>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">¥{r.orderAmount.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-emerald-600 dark:text-emerald-400">
                        +¥{r.creatorAmount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {r.settled ? (
                          <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                            已结算
                          </span>
                        ) : (
                          <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                            待结算
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{r.createdAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </CreatorLayout>
  );
}
