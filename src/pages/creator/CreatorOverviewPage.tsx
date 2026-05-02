import * as React from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BarChart3,
  BookOpen,
  Coins,
  LayoutGrid,
  LogOut,
  ShoppingBag,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { clearCreatorSession, getCreatorProfile } from "@/creator/CreatorAuth";
import { cn } from "@/lib/utils";
import {
  fetchCreatorOrders,
  fetchCreatorStats,
  type CreatorOrderRow,
  type CreatorStats,
} from "@/lib/creatorApi";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
    isActive
      ? "bg-emerald-500/15 text-emerald-100 ring-1 ring-emerald-400/30"
      : "text-slate-300 hover:bg-white/5 hover:text-white",
  );

export function CreatorLayout() {
  const navigate = useNavigate();
  const profile = getCreatorProfile();

  function handleLogout() {
    clearCreatorSession();
    navigate("/creator/login", { replace: true });
  }

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-slate-800 bg-slate-900 text-slate-100 md:flex">
        <div className="border-b border-slate-800 px-4 py-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Creator
          </p>
          <p className="mt-1 text-sm font-semibold text-white">创作者中心</p>
          {profile?.phone ? (
            <p className="mt-1 truncate text-xs text-slate-400">{profile.phone}</p>
          ) : null}
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-3" aria-label="创作者导航">
          <NavLink to="/creator" end className={navLinkClass}>
            <LayoutGrid className="h-4 w-4 shrink-0 opacity-80" />
            数据概览
          </NavLink>
          <NavLink to="/creator/courses" className={navLinkClass}>
            <BookOpen className="h-4 w-4 shrink-0 opacity-80" />
            课程管理
          </NavLink>
          <NavLink to="/creator/earnings" className={navLinkClass}>
            <Coins className="h-4 w-4 shrink-0 opacity-80" />
            收益明细
          </NavLink>
        </nav>
        <div className="border-t border-slate-800 p-3">
          <Link
            to="/"
            className="block rounded-lg px-3 py-2 text-xs text-slate-400 transition hover:bg-white/5 hover:text-white"
          >
            返回前台
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <nav
          className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50 px-2 py-2 md:hidden dark:border-slate-800 dark:bg-slate-900"
          aria-label="创作者快捷导航"
        >
          <NavLink
            to="/creator"
            end
            className={({ isActive }) =>
              cn(
                "shrink-0 rounded-md px-3 py-2 text-xs font-medium",
                isActive
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                  : "text-slate-600 dark:text-slate-400",
              )
            }
          >
            概览
          </NavLink>
          <NavLink
            to="/creator/courses"
            className={({ isActive }) =>
              cn(
                "shrink-0 rounded-md px-3 py-2 text-xs font-medium",
                isActive
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                  : "text-slate-600 dark:text-slate-400",
              )
            }
          >
            课程
          </NavLink>
          <NavLink
            to="/creator/earnings"
            className={({ isActive }) =>
              cn(
                "shrink-0 rounded-md px-3 py-2 text-xs font-medium",
                isActive
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                  : "text-slate-600 dark:text-slate-400",
              )
            }
          >
            收益
          </NavLink>
        </nav>
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/creator"
              className="font-semibold text-slate-900 dark:text-white md:hidden"
            >
              创作者
            </Link>
            <h1 className="truncate text-base font-semibold text-slate-900 dark:text-white">
              工作台
            </h1>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            <LogOut className="h-4 w-4" />
            退出
          </button>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function statCards(stats: CreatorStats) {
  return [
    {
      title: "累计收益（元）",
      value: stats.totalRevenueYuan.toLocaleString("zh-CN", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }),
      sub: `本月 ¥${stats.monthRevenueYuan.toLocaleString("zh-CN")}`,
      icon: BarChart3,
      tint: "from-emerald-500/20 to-teal-500/10",
    },
    {
      title: "订单数",
      value: String(stats.totalOrders),
      sub: "含历史全部订单",
      icon: ShoppingBag,
      tint: "from-sky-500/20 to-cyan-500/10",
    },
    {
      title: "学员数",
      value: String(stats.totalStudents),
      sub: "按成交订单估算",
      icon: Users,
      tint: "from-violet-500/20 to-fuchsia-500/10",
    },
    {
      title: "课程",
      value: `${stats.publishedCourses} 上架`,
      sub: `${stats.draftCourses} 草稿`,
      icon: BookOpen,
      tint: "from-amber-500/20 to-orange-500/10",
    },
  ] as const;
}

export function CreatorOverviewPage() {
  const [stats, setStats] = React.useState<CreatorStats | null>(null);
  const [orders, setOrders] = React.useState<CreatorOrderRow[]>([]);
  const [loadError, setLoadError] = React.useState("");

  React.useEffect(() => {
    document.title = "数据概览 - 创作者中心";
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, o] = await Promise.all([fetchCreatorStats(), fetchCreatorOrders()]);
        if (!cancelled) {
          setStats(s);
          setOrders(o);
          setLoadError("");
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "加载失败");
        }
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
          数据概览
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          数据来自服务端接口；本地开发请同时启动 API（端口 8787）。
        </p>
      </div>

      {loadError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {loadError}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats
          ? statCards(stats).map((item) => (
              <Card
                key={item.title}
                className="overflow-hidden border-slate-200/80 shadow-sm dark:border-slate-800"
              >
                <div className={cn("h-1.5 bg-gradient-to-r", item.tint)} />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {item.title}
                  </CardTitle>
                  <item.icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold tabular-nums">{item.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.sub}</p>
                </CardContent>
              </Card>
            ))
          : !loadError
            ? Array.from({ length: 4 }).map((_, i) => (
                <Card
                  key={i}
                  className="h-32 animate-pulse border-slate-200/80 bg-slate-100 dark:border-slate-800 dark:bg-slate-900/50"
                />
              ))
            : null}
      </div>

      <Card className="border-slate-200 shadow-sm dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-base">最近订单</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 sm:p-6 sm:pt-0">
          <table className="w-full min-w-[520px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/50">
                <th className="px-4 py-3 font-medium text-muted-foreground">课程</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">金额</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">买家</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">时间</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    {loadError ? "—" : "暂无订单"}
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr
                    key={o.id}
                    className="border-b border-slate-100 dark:border-slate-800/80"
                  >
                    <td className="px-4 py-3 font-medium">{o.courseTitle}</td>
                    <td className="px-4 py-3 tabular-nums">¥{o.amountYuan}</td>
                    <td className="px-4 py-3 text-muted-foreground">{o.buyerMask}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(o.createdAt).toLocaleString("zh-CN")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
