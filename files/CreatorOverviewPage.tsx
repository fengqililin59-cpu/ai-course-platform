import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── 类型 ───────────────────────────────────────────────
export type CreatorInfo = {
  id: number;
  name: string;
  phone: string;
  avatar?: string;
  status: "pending" | "approved" | "rejected";
  joinedAt: string;
};

type NavItem = {
  key: string;
  label: string;
  emoji: string;
  href: string;
};

const NAV_ITEMS: NavItem[] = [
  { key: "overview", label: "数据概览", emoji: "📊", href: "/creator" },
  { key: "courses", label: "课程管理", emoji: "📚", href: "/creator/courses" },
  { key: "earnings", label: "收益明细", emoji: "💰", href: "/creator/earnings" },
  { key: "profile", label: "个人设置", emoji: "⚙️", href: "/creator/profile" },
];

// ─── 侧边栏 ──────────────────────────────────────────────
function Sidebar({
  activeKey,
  creator,
  onLogout,
}: {
  activeKey: string;
  creator: CreatorInfo;
  onLogout: () => void;
}) {
  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-border/60 bg-card/50 px-3 py-4">
      {/* Logo */}
      <a href="/" className="flex items-center gap-2 px-2 pb-6 text-base font-bold">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-white text-xs font-bold">
          智
        </span>
        智学 AI
      </a>

      {/* 用户信息 */}
      <div className="mb-4 rounded-xl bg-muted/40 px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold">
            {creator.name?.[0] ?? "?"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{creator.name}</p>
            <p className="text-xs text-muted-foreground">{creator.phone}</p>
          </div>
        </div>
        {creator.status === "pending" && (
          <div className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
            审核中
          </div>
        )}
        {creator.status === "approved" && (
          <div className="mt-2 rounded-md bg-emerald-50 px-2 py-1 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
            ✓ 已认证创作者
          </div>
        )}
      </div>

      {/* 导航 */}
      <nav className="flex-1 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <a
            key={item.key}
            href={item.href}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
              activeKey === item.key
                ? "bg-emerald-500/10 text-emerald-700 font-medium dark:text-emerald-400"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <span aria-hidden>{item.emoji}</span>
            {item.label}
          </a>
        ))}
      </nav>

      {/* 退出 */}
      <button
        onClick={onLogout}
        className="mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <span aria-hidden>🚪</span>
        退出登录
      </button>
    </aside>
  );
}

// ─── 布局包装器 ───────────────────────────────────────────
export function CreatorLayout({
  activeKey,
  children,
}: {
  activeKey: string;
  children: React.ReactNode;
}) {
  const [creator, setCreator] = React.useState<CreatorInfo | null>(null);

  React.useEffect(() => {
    const raw = localStorage.getItem("creator_info");
    if (!raw) {
      window.location.href = "/creator/login";
      return;
    }
    try {
      setCreator(JSON.parse(raw));
    } catch {
      window.location.href = "/creator/login";
    }
  }, []);

  function handleLogout() {
    localStorage.removeItem("creator_token");
    localStorage.removeItem("creator_info");
    window.location.href = "/creator/login";
  }

  if (!creator) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        加载中...
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar activeKey={activeKey} creator={creator} onLogout={handleLogout} />
      <main className="flex-1 overflow-y-auto bg-background px-6 py-6">
        {children}
      </main>
    </div>
  );
}

// ─── 概览页 ───────────────────────────────────────────────
type StatsData = {
  totalEarnings: number;
  thisMonthEarnings: number;
  totalStudents: number;
  totalCourses: number;
  totalOrders: number;
  pendingWithdraw: number;
};

type RecentOrder = {
  id: number;
  courseName: string;
  amount: number;
  buyerPhone: string;
  createdAt: string;
};

export function CreatorOverviewPage() {
  const [stats, setStats] = React.useState<StatsData | null>(null);
  const [recentOrders, setRecentOrders] = React.useState<RecentOrder[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    document.title = "数据概览 - 创作者中心";
    fetchData();
  }, []);

  async function fetchData() {
    const token = localStorage.getItem("creator_token");
    try {
      const [statsRes, ordersRes] = await Promise.all([
        fetch("/api/creator/stats", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/creator/orders?limit=5", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const statsData = await statsRes.json();
      const ordersData = await ordersRes.json();
      if (statsData.success) setStats(statsData.data);
      if (ordersData.success) setRecentOrders(ordersData.data);
    } catch {
      // 用mock数据展示
      setStats({
        totalEarnings: 0,
        thisMonthEarnings: 0,
        totalStudents: 0,
        totalCourses: 0,
        totalOrders: 0,
        pendingWithdraw: 0,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <CreatorLayout activeKey="overview">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight">数据概览</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            实时查看你的课程销售和收益数据
          </p>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 rounded-xl border border-border/60 bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* 核心数据 */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard
                label="累计收益"
                value={`¥${(stats?.totalEarnings ?? 0).toFixed(2)}`}
                emoji="💰"
                highlight
              />
              <StatCard
                label="本月收益"
                value={`¥${(stats?.thisMonthEarnings ?? 0).toFixed(2)}`}
                emoji="📈"
              />
              <StatCard
                label="待提现"
                value={`¥${(stats?.pendingWithdraw ?? 0).toFixed(2)}`}
                emoji="🏦"
                action={
                  <Button size="sm" variant="outline" className="mt-2 h-7 text-xs">
                    申请提现
                  </Button>
                }
              />
              <StatCard
                label="课程数量"
                value={`${stats?.totalCourses ?? 0} 门`}
                emoji="📚"
              />
              <StatCard
                label="累计学员"
                value={`${stats?.totalStudents ?? 0} 人`}
                emoji="👥"
              />
              <StatCard
                label="累计订单"
                value={`${stats?.totalOrders ?? 0} 笔`}
                emoji="📋"
              />
            </div>

            {/* 最近订单 */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold">最近订单</h2>
                <a
                  href="/creator/earnings"
                  className="text-sm text-emerald-600 hover:underline dark:text-emerald-400"
                >
                  查看全部 →
                </a>
              </div>
              {recentOrders.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/60 py-12 text-center text-sm text-muted-foreground">
                  暂无订单，去推广你的课程吧 🚀
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-border/60">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border/60 bg-muted/30">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">课程</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">金额</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">时间</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {recentOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-muted/20">
                          <td className="px-4 py-3 font-medium">{order.courseName}</td>
                          <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400">
                            +¥{order.amount.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground">
                            {order.createdAt}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </CreatorLayout>
  );
}

function StatCard({
  label,
  value,
  emoji,
  highlight,
  action,
}: {
  label: string;
  value: string;
  emoji: string;
  highlight?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <Card
      className={cn(
        "border-border/80 shadow-sm",
        highlight && "border-emerald-500/30 bg-emerald-500/5"
      )}
    >
      <CardHeader className="pb-1 pt-4">
        <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <span aria-hidden>{emoji}</span>
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <p className={cn("text-2xl font-bold tabular-nums", highlight && "text-emerald-600 dark:text-emerald-400")}>
          {value}
        </p>
        {action}
      </CardContent>
    </Card>
  );
}
