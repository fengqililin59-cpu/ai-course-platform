import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchCreatorEarnings, type CreatorEarningsPayload } from "@/lib/creatorApi";
import { cn } from "@/lib/utils";

export function CreatorEarningsPage() {
  const [data, setData] = React.useState<CreatorEarningsPayload | null>(null);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    document.title = "收益明细 - 创作者中心";
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const payload = await fetchCreatorEarnings();
        if (!cancelled) setData(payload);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "加载失败");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          收益明细
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          GET /api/creator/earnings：结算流水与按月汇总
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}

      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
          月度汇总
        </h3>
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900/50"
              />
            ))}
          </div>
        ) : data && data.monthly.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.monthly.map((m, idx) => (
              <Card
                key={`${m.month}-${idx}`}
                className="border-slate-200 shadow-sm dark:border-slate-800"
              >
                <div className="h-1 rounded-t-xl bg-gradient-to-r from-emerald-500/40 to-teal-500/30" />
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {m.month}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                    ¥{m.amountYuan.toLocaleString("zh-CN")}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">暂无月度汇总数据</p>
        )}
      </div>

      <Card className="border-slate-200 shadow-sm dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-base">结算流水</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 sm:p-6 sm:pt-0">
          {loading ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              加载中…
            </p>
          ) : (
            <table className="w-full min-w-[560px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/50">
                  <th className="px-4 py-3 font-medium text-muted-foreground">课程</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">金额（元）</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">结算日</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">备注</th>
                </tr>
              </thead>
              <tbody>
                {!data || data.rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      {error ? "—" : "暂无流水"}
                    </td>
                  </tr>
                ) : (
                  data.rows.map((r) => (
                    <tr
                      key={r.id}
                      className={cn(
                        "border-b border-slate-100 dark:border-slate-800/80",
                      )}
                    >
                      <td className="px-4 py-3 font-medium">{r.courseTitle}</td>
                      <td className="px-4 py-3 tabular-nums text-emerald-700 dark:text-emerald-400">
                        ¥{r.amountYuan.toLocaleString("zh-CN")}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{r.settledAt}</td>
                      <td className="max-w-[220px] px-4 py-3 text-muted-foreground">
                        {r.remark ?? "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
