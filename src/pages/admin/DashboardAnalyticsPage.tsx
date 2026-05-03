import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, Minus, RefreshCw, TrendingDown, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAdminApiToken } from "@/admin/AdminAuth";
import { cn } from "@/lib/utils";

function fmtYuan(n: number) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "¥0.00";
  return `¥${x.toFixed(2)}`;
}

function fmtHoursFromSeconds(sec: number) {
  const s = Number(sec);
  if (!Number.isFinite(s) || s <= 0) return "0 小时";
  const h = s / 3600;
  if (h < 0.1) return `${Math.round(s / 60)} 分钟`;
  return `${h.toFixed(1)} 小时`;
}

/** 人均等可能小于 1 小时的时长展示 */
function formatLearningDuration(seconds: number) {
  const s = Math.max(0, Math.round(Number(seconds)));
  if (!Number.isFinite(s) || s === 0) return "0 秒";
  if (s < 60) return `${s} 秒`;
  if (s < 3600) return `${(s / 60).toFixed(0)} 分钟`;
  return `${(s / 3600).toFixed(1)} 小时`;
}

function toYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function ChangeIndicator({ value }: { value: number }) {
  const v = Number(value);
  if (!Number.isFinite(v) || Math.abs(v) < 0.05) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3.5 w-3.5 shrink-0" aria-hidden />
        持平
      </span>
    );
  }
  const up = v > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium tabular-nums",
        up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
      )}
    >
      {up ? (
        <TrendingUp className="h-3.5 w-3.5 shrink-0" aria-hidden />
      ) : (
        <TrendingDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
      )}
      {up ? "+" : ""}
      {v.toFixed(1)}%
    </span>
  );
}

type DailySale = {
  date: string;
  revenue: number;
  platform_revenue: number;
  order_count: number;
};
type TopCourse = { course_id: number; title: string; order_count: number; revenue: number };
type WithdrawalRow = { status: string; count: number; amount: number };

type HotKeywordRow = {
  keyword: string;
  search_count: number;
  unique_users: number;
  changePercent?: number;
};

function hotKeywordBarColor(changePercent: number | undefined) {
  const v = changePercent ?? 0;
  if (v > 0.05) return "#22c55e";
  if (v < -0.05) return "#ef4444";
  return "#94a3b8";
}

type HotKeywordsTooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: HotKeywordRow }>;
  label?: string;
};

function HotKeywordsTooltip({ active, payload, label }: HotKeywordsTooltipProps) {
  if (!active || !payload?.[0]?.payload) return null;
  const row = payload[0].payload;
  const ch = row.changePercent ?? 0;
  const flat = Math.abs(ch) < 0.05;
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-md dark:border-slate-700 dark:bg-slate-950">
      <p className="font-semibold text-slate-900 dark:text-slate-100">{label ?? row.keyword}</p>
      <p className="mt-1 text-muted-foreground">
        搜索次数：<span className="font-medium text-foreground">{row.search_count}</span>
      </p>
      <p className="text-muted-foreground">
        独立用户数：<span className="font-medium text-foreground">{row.unique_users}</span>
      </p>
      <p
        className={cn(
          "mt-1 font-medium",
          ch > 0.05 && "text-emerald-600 dark:text-emerald-400",
          ch < -0.05 && "text-rose-600 dark:text-rose-400",
          flat && "text-muted-foreground",
        )}
      >
        较上期：
        {flat ? (
          "持平"
        ) : (
          <>
            {ch > 0 ? "↑ " : "↓ "}
            {ch > 0 ? "+" : ""}
            {ch.toFixed(1)}%
          </>
        )}
      </p>
    </div>
  );
}

type LearningStatsPayload = {
  avgCompletionPercent: number;
  activeLearners7d: number;
  totalLearningSeconds: number;
  /** 至少有一条学习会话的去重用户数 */
  sessionLearnerCount: number;
  avgLearningSecondsPerUser: number;
  activeLearnersSessions7d: number;
};

type CompletionTrendRow = { date: string; completions: number };

type CourseProgressStatRow = {
  id: number;
  title: string;
  learner_count: number;
  avg_completion: number;
  last_activity: string | null;
};

type AnalyticsData = {
  siteUsersCount: number;
  visionConsultationsCount: number;
  paidOrders: {
    count: number;
    grossRevenue: number;
    creatorPayouts: number;
    platformRevenue: number;
  };
  dailySales: DailySale[];
  topCourses: TopCourse[];
  distribution: {
    linksCount: number;
    commissionTotalYuan: number;
    withdrawalsByStatus: WithdrawalRow[];
  };
  /** 环比：用户为累计注册量较上月末；金额为自然月内已付订单对比上月；自定义 paid 时段时为 null */
  monthlyComparison: {
    siteUsers: number;
    grossRevenue: number;
    platformRevenue: number;
    creatorPayouts: number;
  } | null;
  ordersDateRange?: { from: string; to: string } | null;
  generatedAt: string;
};

export function DashboardAnalyticsPage() {
  const defaultHotKwRange = React.useMemo(() => {
    const e = new Date();
    const s = new Date(e);
    s.setDate(e.getDate() - 6);
    return { from: toYmd(s), to: toYmd(e) };
  }, []);

  const [data, setData] = React.useState<AnalyticsData | null>(null);
  const [hotKeywords, setHotKeywords] = React.useState<HotKeywordRow[]>([]);
  const [hotKwFrom, setHotKwFrom] = React.useState(defaultHotKwRange.from);
  const [hotKwTo, setHotKwTo] = React.useState(defaultHotKwRange.to);
  const [draftHotKwFrom, setDraftHotKwFrom] = React.useState(defaultHotKwRange.from);
  const [draftHotKwTo, setDraftHotKwTo] = React.useState(defaultHotKwRange.to);
  const [hotKwLoading, setHotKwLoading] = React.useState(false);
  const [hotKwError, setHotKwError] = React.useState("");
  const [learningStats, setLearningStats] = React.useState<LearningStatsPayload | null>(null);
  const [completionTrend, setCompletionTrend] = React.useState<CompletionTrendRow[]>([]);
  const [courseProgressRows, setCourseProgressRows] = React.useState<CourseProgressStatRow[]>([]);
  /** 已应用于请求的 paid_at 区间（与 draft 分离，避免输入时频繁请求） */
  const [paidFrom, setPaidFrom] = React.useState("");
  const [paidTo, setPaidTo] = React.useState("");
  const [draftPaidFrom, setDraftPaidFrom] = React.useState("");
  const [draftPaidTo, setDraftPaidTo] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const setPaidDateRange = React.useCallback((from: string, to: string) => {
    setDraftPaidFrom(from);
    setDraftPaidTo(to);
    setPaidFrom(from);
    setPaidTo(to);
  }, []);

  const setHotKwDateRange = React.useCallback((from: string, to: string) => {
    setDraftHotKwFrom(from);
    setDraftHotKwTo(to);
    setHotKwFrom(from);
    setHotKwTo(to);
  }, []);

  const fetchHotKeywords = React.useCallback(async () => {
    const token = getAdminApiToken();
    if (!token) {
      setHotKeywords([]);
      return;
    }
    setHotKwLoading(true);
    setHotKwError("");
    try {
      const q = new URLSearchParams({
        startDate: hotKwFrom,
        endDate: hotKwTo,
        compare: "true",
      });
      const res = await fetch(`/api/admin/dashboard/hot-keywords?${q.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json()) as {
        success?: boolean;
        data?: { current?: HotKeywordRow[]; previous?: Record<string, number> };
        message?: string;
      };
      if (!res.ok || json.success === false) {
        setHotKwError(json.message || `热门词加载失败（${res.status}）`);
        setHotKeywords([]);
        return;
      }
      const prev = json.data?.previous ?? {};
      const cur = Array.isArray(json.data?.current) ? json.data!.current! : [];
      const withChange: HotKeywordRow[] = cur.map((item) => {
        const prevCount = prev[item.keyword] ?? 0;
        const changePercent =
          prevCount === 0 ? (item.search_count === 0 ? 0 : 100) : ((item.search_count - prevCount) / prevCount) * 100;
        return { ...item, changePercent };
      });
      setHotKeywords(withChange);
    } catch {
      setHotKwError("网络错误");
      setHotKeywords([]);
    } finally {
      setHotKwLoading(false);
    }
  }, [hotKwFrom, hotKwTo]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    const token = getAdminApiToken();
    if (!token) {
      setError("未配置 admin_token：请重新登录后台。");
      setData(null);
      setHotKeywords([]);
      setLearningStats(null);
      setCompletionTrend([]);
      setCourseProgressRows([]);
      setLoading(false);
      return;
    }
    try {
      const params = new URLSearchParams();
      if (paidFrom.trim() && paidTo.trim()) {
        params.set("paidFrom", paidFrom.trim());
        params.set("paidTo", paidTo.trim());
      }
      const aq = params.toString();
      const analyticsUrl = `/api/admin/dashboard/analytics${aq ? `?${aq}` : ""}`;

      const [analyticsRes, learningRes, progressRes, completionRes] = await Promise.all([
        fetch(analyticsUrl, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/admin/dashboard/learning-stats", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/admin/dashboard/course-progress-stats", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/admin/dashboard/completion-trend", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const json = (await analyticsRes.json()) as { success?: boolean; data?: AnalyticsData; message?: string };
      const learningJson = (await learningRes.json()) as {
        success?: boolean;
        data?: LearningStatsPayload;
        message?: string;
      };
      const progressJson = (await progressRes.json()) as {
        success?: boolean;
        data?: CourseProgressStatRow[];
        message?: string;
      };
      const completionJson = (await completionRes.json()) as {
        success?: boolean;
        data?: CompletionTrendRow[];
        message?: string;
      };

      if (learningRes.ok && learningJson.success && learningJson.data) {
        const d = learningJson.data;
        setLearningStats({
          avgCompletionPercent: Number(d.avgCompletionPercent) || 0,
          activeLearners7d: Number(d.activeLearners7d) || 0,
          totalLearningSeconds: Number(d.totalLearningSeconds) || 0,
          sessionLearnerCount: Number(d.sessionLearnerCount) || 0,
          avgLearningSecondsPerUser: Number(d.avgLearningSecondsPerUser) || 0,
          activeLearnersSessions7d: Number(d.activeLearnersSessions7d) || 0,
        });
      } else {
        setLearningStats({
          avgCompletionPercent: 0,
          activeLearners7d: 0,
          totalLearningSeconds: 0,
          sessionLearnerCount: 0,
          avgLearningSecondsPerUser: 0,
          activeLearnersSessions7d: 0,
        });
      }

      if (completionRes.ok && completionJson.success && Array.isArray(completionJson.data)) {
        setCompletionTrend(completionJson.data);
      } else {
        setCompletionTrend([]);
      }

      if (progressRes.ok && progressJson.success && Array.isArray(progressJson.data)) {
        setCourseProgressRows(progressJson.data);
      } else {
        setCourseProgressRows([]);
      }

      if (!analyticsRes.ok || json.success === false) {
        setError(json.message || `加载失败（${analyticsRes.status}）`);
        setData(null);
        return;
      }
      const raw = json.data;
      if (raw) {
        setData({
          ...raw,
          monthlyComparison: raw.monthlyComparison ?? null,
          ordersDateRange: raw.ordersDateRange ?? null,
        });
      } else {
        setData(null);
      }
    } catch {
      setError("网络错误");
      setData(null);
      setHotKeywords([]);
      setLearningStats(null);
      setCompletionTrend([]);
      setCourseProgressRows([]);
    } finally {
      setLoading(false);
    }
  }, [paidFrom, paidTo]);

  React.useEffect(() => {
    document.title = "数据分析 - 后台";
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    void fetchHotKeywords();
  }, [fetchHotKeywords]);

  const chartTopCourses = React.useMemo(() => {
    if (!data?.topCourses?.length) return [];
    return data.topCourses.map((c) => ({
      ...c,
      label: c.title.length > 14 ? `${c.title.slice(0, 14)}…` : c.title,
    }));
  }, [data?.topCourses]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-violet-600 dark:text-violet-400" aria-hidden />
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              数据分析看板
            </h2>
            <p className="text-sm text-muted-foreground">
              用户、订单、分销与销售趋势（金额单位：元）；可按 paid_at 筛选订单类指标
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 gap-2 self-start sm:self-auto"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} aria-hidden />
          刷新
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm dark:border-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">订单支付日期（paid_at）筛选</CardTitle>
          <p className="text-xs text-muted-foreground">
            留空并应用为全量；筛选时订单（paid_at）、分销与视觉咨询（created_at）随区间变化，不展示环比。
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">开始</span>
            <input
              type="date"
              value={draftPaidFrom}
              onChange={(e) => setDraftPaidFrom(e.target.value)}
              className="h-9 w-[11.5rem] rounded-md border border-input bg-background px-2 text-sm shadow-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">结束</span>
            <input
              type="date"
              value={draftPaidTo}
              onChange={(e) => setDraftPaidTo(e.target.value)}
              className="h-9 w-[11.5rem] rounded-md border border-input bg-background px-2 text-sm shadow-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                const end = new Date();
                const start = new Date(end);
                start.setDate(end.getDate() - 6);
                setPaidDateRange(toYmd(start), toYmd(end));
              }}
            >
              近 7 天
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                const end = new Date();
                const start = new Date(end);
                start.setDate(end.getDate() - 29);
                setPaidDateRange(toYmd(start), toYmd(end));
              }}
            >
              近 30 天
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                const now = new Date();
                const start = new Date(now.getFullYear(), now.getMonth(), 1);
                setPaidDateRange(toYmd(start), toYmd(now));
              }}
            >
              本月
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                const now = new Date();
                const firstThis = new Date(now.getFullYear(), now.getMonth(), 1);
                const lastPrev = new Date(firstThis);
                lastPrev.setDate(0);
                const firstPrev = new Date(lastPrev.getFullYear(), lastPrev.getMonth(), 1);
                setPaidDateRange(toYmd(firstPrev), toYmd(lastPrev));
              }}
            >
              上月
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (draftPaidFrom && draftPaidTo && draftPaidFrom > draftPaidTo) {
                  setError("开始日期不能晚于结束日期");
                  return;
                }
                setError("");
                const f = draftPaidFrom.trim();
                const t = draftPaidTo.trim();
                if ((f && !t) || (!f && t)) {
                  setError("请同时填写开始与结束日期，或全部留空后应用。");
                  return;
                }
                setPaidFrom(f);
                setPaidTo(t);
              }}
            >
              应用筛选
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setError("");
                setDraftPaidFrom("");
                setDraftPaidTo("");
                setPaidFrom("");
                setPaidTo("");
              }}
            >
              清除
            </Button>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
          {error}
        </p>
      ) : null}

      {loading && !data ? (
        <p className="py-16 text-center text-sm text-muted-foreground">加载中…</p>
      ) : null}

      {data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="border-slate-200 shadow-sm dark:border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Users className="h-4 w-4" aria-hidden />
                  前台注册用户
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tabular-nums text-slate-900 dark:text-white">
                  {data.siteUsersCount}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">site_users 累计</p>
                {data.monthlyComparison != null ? (
                  <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>较上月末</span>
                    <ChangeIndicator value={data.monthlyComparison.siteUsers} />
                  </p>
                ) : data.ordersDateRange ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    订单按日筛选时，用户数仍为全量累计。
                  </p>
                ) : null}
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm dark:border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  已支付订单数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tabular-nums text-slate-900 dark:text-white">
                  {data.paidOrders.count}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {data.ordersDateRange
                    ? `所选时段 paid_at（${data.ordersDateRange.from}～${data.ordersDateRange.to}）`
                    : "orders.status = paid（全量）"}
                </p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm dark:border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  订单实收总额
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                  {fmtYuan(data.paidOrders.grossRevenue)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {data.ordersDateRange
                    ? `所选时段 paid_at（${data.ordersDateRange.from}～${data.ordersDateRange.to}）`
                    : "SUM(total_amount) 累计"}
                </p>
                {data.monthlyComparison != null ? (
                  <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>本月已付环比上月</span>
                    <ChangeIndicator value={data.monthlyComparison.grossRevenue} />
                  </p>
                ) : null}
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm dark:border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  平台分成（20%）
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tabular-nums text-violet-700 dark:text-violet-400">
                  {fmtYuan(data.paidOrders.platformRevenue)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {data.ordersDateRange
                    ? `所选时段 paid_at（${data.ordersDateRange.from}～${data.ordersDateRange.to}）`
                    : "SUM(platform_amount) 累计"}
                </p>
                {data.monthlyComparison != null ? (
                  <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>本月已付环比上月</span>
                    <ChangeIndicator value={data.monthlyComparison.platformRevenue} />
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="border-slate-200 shadow-sm dark:border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  创作者分成（约 80%）
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                  {fmtYuan(data.paidOrders.creatorPayouts)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {data.ordersDateRange
                    ? `所选时段 paid_at（${data.ordersDateRange.from}～${data.ordersDateRange.to}）`
                    : "SUM(creator_amount) 累计"}
                </p>
                {data.monthlyComparison != null ? (
                  <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>本月已付环比上月</span>
                    <ChangeIndicator value={data.monthlyComparison.creatorPayouts} />
                  </p>
                ) : null}
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm dark:border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  分销佣金累计
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-400">
                  {fmtYuan(data.distribution.commissionTotalYuan)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {data.ordersDateRange
                    ? `所选时段 created_at（${data.ordersDateRange.from}～${data.ordersDateRange.to}）`
                    : "非 cancelled 的 commission_amount（全量）"}
                </p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm dark:border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  推广链接数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                  {data.distribution.linksCount}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {data.ordersDateRange
                    ? `所选时段 created_at（${data.ordersDateRange.from}～${data.ordersDateRange.to}）`
                    : "distribution_links 全量"}
                </p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm dark:border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  AI 视觉咨询条数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                  {data.visionConsultationsCount}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {data.ordersDateRange
                    ? `所选时段 created_at（${data.ordersDateRange.from}～${data.ordersDateRange.to}）`
                    : "vision_consultations 全量"}
                </p>
              </CardContent>
            </Card>
          </div>

          {learningStats ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Card className="border-slate-200 shadow-sm dark:border-slate-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      平均课程完成率
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold tabular-nums text-slate-900 dark:text-white">
                      {learningStats.avgCompletionPercent.toFixed(1)}%
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">全库 AVG(progress_percent)</p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm dark:border-slate-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      近 7 日进度上报用户
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold tabular-nums text-sky-700 dark:text-sky-400">
                      {learningStats.activeLearners7d}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">user_course_progress.updated_at</p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm dark:border-slate-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      累计学习时长
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold tabular-nums text-violet-700 dark:text-violet-400">
                      {fmtHoursFromSeconds(learningStats.totalLearningSeconds)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      SUM(duration_seconds) · 会话上报（约{" "}
                      {learningStats.totalLearningSeconds.toLocaleString("zh-CN")} 秒）
                    </p>
                    <p className="mt-3 text-sm font-medium text-slate-800 dark:text-slate-100">
                      人均学习时长：{" "}
                      <span className="tabular-nums text-violet-700 dark:text-violet-400">
                        {formatLearningDuration(learningStats.avgLearningSecondsPerUser)}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      有过会话的用户 {learningStats.sessionLearnerCount} 人 · 总秒数 / 人数
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm dark:border-slate-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      近 7 日会话活跃用户
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                      {learningStats.activeLearnersSessions7d}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">user_learning_sessions.start_at</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-slate-200 shadow-sm dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="text-base">近 30 日课程完成人数</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    进度 ≥80% 且首次写入 completed_at 的当日去重用户数（按 completed_at 日期）
                  </p>
                </CardHeader>
                <CardContent className="h-[280px] w-full min-h-[240px]">
                  {completionTrend.length === 0 ? (
                    <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      暂无完成记录
                    </p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={completionTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 11 }} width={36} allowDecimals={false} />
                        <Tooltip
                          formatter={(v: number) => [v, "完成人数"]}
                          labelFormatter={(l) => `日期 ${l}`}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="completions"
                          name="完成人数"
                          stroke="#7c3aed"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </>
          ) : null}

          <Card className="border-slate-200 shadow-sm dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-base">课程学习进度排行</CardTitle>
              <p className="text-xs text-muted-foreground">已上架课程 · 学习人数与平均完成率（TOP 10）</p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/80">
                      <th className="px-3 py-2 font-semibold">课程</th>
                      <th className="px-3 py-2 font-semibold">学习人数</th>
                      <th className="px-3 py-2 font-semibold">平均完成率</th>
                      <th className="px-3 py-2 font-semibold">最近上报</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courseProgressRows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                          暂无进度数据
                        </td>
                      </tr>
                    ) : (
                      courseProgressRows.map((row) => (
                        <tr
                          key={row.id}
                          className="border-b border-slate-100 last:border-0 dark:border-slate-800/80"
                        >
                          <td className="max-w-[14rem] px-3 py-2 font-medium">
                            <span className="line-clamp-2">{row.title}</span>
                          </td>
                          <td className="px-3 py-2 tabular-nums text-muted-foreground">{row.learner_count}</td>
                          <td className="px-3 py-2 tabular-nums">{Number(row.avg_completion).toFixed(1)}%</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">
                            {row.last_activity
                              ? new Date(row.last_activity.replace(" ", "T")).toLocaleString("zh-CN")
                              : "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-slate-200 shadow-sm dark:border-slate-800">
              <CardHeader>
                <CardTitle className="text-base">
                  {data.ordersDateRange
                    ? `销售趋势（${data.ordersDateRange.from}～${data.ordersDateRange.to}）`
                    : "近 30 日销售趋势"}
                </CardTitle>
                <p className="text-xs text-muted-foreground">按 paid_at 日期汇总</p>
              </CardHeader>
              <CardContent className="h-[300px] w-full min-h-[280px]">
                {data.dailySales.length === 0 ? (
                  <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    暂无带支付日期的已付订单
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.dailySales} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 11 }} width={44} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} width={36} />
                      <Tooltip
                        formatter={(value: number, name: string) => {
                          if (name === "订单数") return [value, name];
                          return [fmtYuan(value), name];
                        }}
                        labelFormatter={(l) => `日期 ${l}`}
                      />
                      <Legend />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="revenue"
                        name="销售额(元)"
                        stroke="#7c3aed"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="platform_revenue"
                        name="平台收入(元)"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="order_count"
                        name="订单数"
                        stroke="#0284c7"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm dark:border-slate-800">
              <CardHeader>
                <CardTitle className="text-base">
                  {data.ordersDateRange ? "课程销售额 Top 5（所选时段）" : "课程销售额 Top 5"}
                </CardTitle>
                <p className="text-xs text-muted-foreground">已支付订单汇总</p>
              </CardHeader>
              <CardContent className="h-[300px] w-full min-h-[280px]">
                {chartTopCourses.length === 0 ? (
                  <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    暂无已付订单
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartTopCourses}
                      layout="vertical"
                      margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `¥${v}`} />
                      <YAxis
                        type="category"
                        dataKey="label"
                        width={100}
                        tick={{ fontSize: 10 }}
                      />
                      <Tooltip formatter={(v: number) => fmtYuan(v)} labelFormatter={() => "销售额"} />
                      <Bar dataKey="revenue" name="销售额" fill="#7c3aed" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-200 shadow-sm dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-base">分销提现汇总</CardTitle>
              <p className="text-xs text-muted-foreground">
                按提现申请状态分组
                {data.ordersDateRange
                  ? ` · created_at ${data.ordersDateRange.from}～${data.ordersDateRange.to}`
                  : ""}
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                <table className="w-full min-w-[400px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/80">
                      <th className="px-3 py-2 font-semibold">状态</th>
                      <th className="px-3 py-2 font-semibold">笔数</th>
                      <th className="px-3 py-2 font-semibold">金额（元）</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.distribution.withdrawalsByStatus.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">
                          暂无提现记录
                        </td>
                      </tr>
                    ) : (
                      data.distribution.withdrawalsByStatus.map((row) => (
                        <tr
                          key={row.status}
                          className="border-b border-slate-100 last:border-0 dark:border-slate-800/80"
                        >
                          <td className="px-3 py-2 font-medium">{row.status}</td>
                          <td className="px-3 py-2 tabular-nums text-muted-foreground">{row.count}</td>
                          <td className="px-3 py-2 tabular-nums">{fmtYuan(row.amount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-base">热门搜索关键词</CardTitle>
              <p className="text-xs text-muted-foreground">
                就业雷达 /jobs 日志 · TOP10 · 环比为与本期等长、紧邻上一时段的搜索次数对比
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">开始</span>
                  <input
                    type="date"
                    value={draftHotKwFrom}
                    onChange={(e) => setDraftHotKwFrom(e.target.value)}
                    className="h-9 w-[11.5rem] rounded-md border border-input bg-background px-2 text-sm shadow-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">结束</span>
                  <input
                    type="date"
                    value={draftHotKwTo}
                    onChange={(e) => setDraftHotKwTo(e.target.value)}
                    className="h-9 w-[11.5rem] rounded-md border border-input bg-background px-2 text-sm shadow-sm"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      const e = new Date();
                      const s = new Date(e);
                      s.setDate(e.getDate() - 6);
                      setHotKwDateRange(toYmd(s), toYmd(e));
                    }}
                  >
                    近 7 天
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      const e = new Date();
                      const s = new Date(e);
                      s.setDate(e.getDate() - 29);
                      setHotKwDateRange(toYmd(s), toYmd(e));
                    }}
                  >
                    近 30 天
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      if (draftHotKwFrom && draftHotKwTo && draftHotKwFrom > draftHotKwTo) {
                        setHotKwError("开始日期不能晚于结束日期");
                        return;
                      }
                      setHotKwError("");
                      const f = draftHotKwFrom.trim();
                      const t = draftHotKwTo.trim();
                      if (!f || !t) {
                        setHotKwError("请填写开始与结束日期。");
                        return;
                      }
                      setDraftHotKwFrom(f);
                      setDraftHotKwTo(t);
                      setHotKwFrom(f);
                      setHotKwTo(t);
                    }}
                  >
                    应用
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void fetchHotKeywords()}
                    disabled={hotKwLoading}
                  >
                    刷新
                  </Button>
                </div>
              </div>
              {hotKwError ? (
                <p className="text-sm text-rose-600 dark:text-rose-400">{hotKwError}</p>
              ) : null}
              {hotKwLoading && hotKeywords.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">加载中…</p>
              ) : hotKeywords.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">暂无搜索数据</p>
              ) : (
                <div className="h-[400px] w-full min-h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={hotKeywords}
                      layout="vertical"
                      margin={{ top: 8, right: 24, left: 4, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                      <YAxis
                        type="category"
                        dataKey="keyword"
                        width={112}
                        tick={{ fontSize: 10 }}
                        interval={0}
                      />
                      <Tooltip content={HotKeywordsTooltip} cursor={{ fill: "hsl(var(--muted) / 0.35)" }} />
                      <Legend />
                      <Bar dataKey="search_count" name="搜索次数" barSize={20} radius={[0, 4, 4, 0]}>
                        {hotKeywords.map((entry, index) => (
                          <Cell key={`kw-${entry.keyword}-${index}`} fill={hotKeywordBarColor(entry.changePercent)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground">
            数据生成时间：{data.generatedAt ? new Date(data.generatedAt).toLocaleString("zh-CN") : "—"}
          </p>
        </>
      ) : null}
    </div>
  );
}
