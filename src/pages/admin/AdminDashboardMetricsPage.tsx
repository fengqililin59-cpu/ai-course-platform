import * as React from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAdminApiToken } from "@/admin/AdminAuth";

function fmtYuan(n: number) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "¥0.00";
  return `¥${x.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type DashboardPayload = {
  yesterday: {
    newUsers: number;
    orderCount: number;
    orderRevenue: number;
    platformRevenue: number;
    commissionPaid: number;
    visionCount: number;
    jobsSearchCount: number;
  };
  total: { users: number; orders: number; revenue: number };
  last7Days: { courseCompleters: number };
  weeklyTrend: { dates: string[]; orders: number[]; users: number[]; searches: number[] };
  meta?: { yesterdayDate?: string };
};

export function AdminDashboardMetricsPage() {
  const [data, setData] = React.useState<DashboardPayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setErr("");
    const token = getAdminApiToken();
    if (!token) {
      setErr("未登录后台");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/admin/dashboard-metrics", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = (await res.json()) as { success?: boolean; data?: DashboardPayload; message?: string };
      if (!res.ok || j.success === false) {
        setErr(j.message || `加载失败（${res.status}）`);
        setData(null);
        return;
      }
      setData(j.data ?? null);
    } catch {
      setErr("网络错误");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    document.title = "核心指标 - 后台";
    void load();
  }, [load]);

  const chartRows = React.useMemo(() => {
    if (!data?.weeklyTrend?.dates?.length) return [];
    const { dates, orders, users, searches } = data.weeklyTrend;
    return dates.map((d, i) => ({
      date: d.slice(5),
      orders: orders[i] ?? 0,
      users: users[i] ?? 0,
      searches: searches[i] ?? 0,
    }));
  }, [data]);

  const y = data?.yesterday;
  const t = data?.total;
  const ymd = data?.meta?.yesterdayDate;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">核心指标仪表盘</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            昨日口径按服务器本地日历日
            {ymd ? `（当前「昨日」= ${ymd}）` : ""}；订单仅统计已支付。
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={loading ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
          刷新
        </Button>
      </div>

      {err ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
          {err}
        </p>
      ) : null}

      {loading && !data ? (
        <p className="text-sm text-muted-foreground">加载中…</p>
      ) : null}

      {data && y && t ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">昨日新增用户</CardTitle>
                <CardDescription>总注册用户</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tabular-nums">{y.newUsers}</p>
                <p className="mt-1 text-sm text-muted-foreground">总用户 {t.users}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">昨日订单</CardTitle>
                <CardDescription>已支付订单数 / 订单总额（GMV）</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tabular-nums">{y.orderCount}</p>
                <p className="mt-1 text-sm text-muted-foreground">{fmtYuan(y.orderRevenue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">昨日平台收入</CardTitle>
                <CardDescription>订单维度 platform_amount 合计</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tabular-nums">{fmtYuan(y.platformRevenue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">昨日分销佣金</CardTitle>
                <CardDescription>佣金记录创建日（非取消）</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tabular-nums">{fmtYuan(y.commissionPaid)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">定制服务昨日咨询</CardTitle>
                <CardDescription>vision_consultations</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tabular-nums">{y.visionCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">就业雷达昨日搜索</CardTitle>
                <CardDescription>jobs_search_logs</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tabular-nums">{y.jobsSearchCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4" aria-hidden />
                  近7天完课人数
                </CardTitle>
                <CardDescription>有 completed_at 的去重学员</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tabular-nums">{data.last7Days.courseCompleters}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">累计订单 / GMV</CardTitle>
                <CardDescription>全部已支付订单</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tabular-nums">{t.orders}</p>
                <p className="mt-1 text-sm text-muted-foreground">{fmtYuan(t.revenue)}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">近7天趋势</CardTitle>
              <CardDescription>订单数、新增用户、就业雷达搜索次数（按日）</CardDescription>
            </CardHeader>
            <CardContent className="h-[320px] w-full min-w-0 pt-2">
              {chartRows.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        fontSize: 12,
                        border: "1px solid rgb(226 232 240)",
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="orders" name="订单" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="users" name="新用户" stroke="#10b981" strokeWidth={2} dot={false} />
                    <Line
                      type="monotone"
                      dataKey="searches"
                      name="搜索"
                      stroke="#f97316"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground">暂无趋势数据</p>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
