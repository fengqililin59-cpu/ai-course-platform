import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth, type MembershipTier } from "@/contexts/AuthContext";
import { useCourseUser } from "@/contexts/CourseUserContext";
import {
  COURSE_PROGRESS_UPDATED_EVENT,
  readCourseProgress,
} from "@/lib/courseProgress";
import { COURSES, getCourseById, type Course } from "@/data/courses";

function maskPhone(phone: string): string {
  const p = phone.trim();
  if (p.length < 11) return p;
  return `${p.slice(0, 3)}****${p.slice(-4)}`;
}

function membershipLabel(tier: MembershipTier): string {
  const map: Record<MembershipTier, string> = {
    none: "非会员",
    month: "月会员",
    year: "年会员",
    lifetime: "永久会员",
  };
  return map[tier];
}

function profileProgressStyle(pct: number) {
  const p = Math.min(100, Math.max(0, Math.round(pct)));
  if (p >= 100) {
    return {
      fill: "bg-emerald-500",
      label: "已完成",
      showCheck: true as const,
    };
  }
  if (p >= 71) {
    return {
      fill: "bg-blue-500",
      label: "即将完成",
      showCheck: false as const,
    };
  }
  if (p >= 31) {
    return {
      fill: "bg-amber-400",
      label: "学习中",
      showCheck: false as const,
    };
  }
  return {
    fill: "bg-red-500",
    label: "刚开始",
    showCheck: false as const,
  };
}

const mockOrders = [
  {
    orderNo: "38472910",
    courseName: COURSES[0]?.title ?? "课程",
    amount: "¥199",
    status: "已支付",
    date: "2026-04-02",
  },
  {
    orderNo: "92837465",
    courseName: COURSES[1]?.title ?? "课程",
    amount: "¥149",
    status: "已支付",
    date: "2026-03-18",
  },
  {
    orderNo: "10293847",
    courseName: COURSES[2]?.title ?? "课程",
    amount: "¥259",
    status: "已支付",
    date: "2026-02-26",
  },
];

type ProfileTab = "courses" | "orders";

export function ProfilePage() {
  const { phone, membership, setLoginOpen, logout } = useAuth();
  const { purchasedIds } = useCourseUser();

  React.useEffect(() => {
    document.title = "个人中心 - AIlearn Pro";
  }, []);
  const navigate = useNavigate();
  const [tab, setTab] = React.useState<ProfileTab>("courses");
  const [progressRev, setProgressRev] = React.useState(0);

  React.useEffect(() => {
    const bump = () => setProgressRev((n) => n + 1);
    window.addEventListener(COURSE_PROGRESS_UPDATED_EVENT, bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener(COURSE_PROGRESS_UPDATED_EVENT, bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  const myCourses = React.useMemo(
    () =>
      purchasedIds
        .map((id) => getCourseById(id))
        .filter((c): c is Course => Boolean(c)),
    [purchasedIds],
  );

  const learningStats = React.useMemo(() => {
    const count = purchasedIds.length;
    if (count === 0) return { count: 0, avg: 0 };
    let sum = 0;
    for (const id of purchasedIds) {
      sum += readCourseProgress(id);
    }
    return { count, avg: Math.round(sum / count) };
  }, [purchasedIds, progressRev]);

  if (!phone) {
    return (
      <main className="mx-auto min-w-0 max-w-lg px-4 py-16 sm:px-6 sm:py-20">
        <Card className="border-dashed">
          <CardHeader className="text-center">
            <CardTitle>个人中心</CardTitle>
            <CardDescription>请先登录后查看课程与订单</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-2 pb-8">
            <p className="text-sm text-muted-foreground">请先登录</p>
            <Button type="button" size="lg" onClick={() => setLoginOpen(true)}>
              登录
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const avatarDigits = phone.length >= 2 ? phone.slice(-2) : "—";

  return (
    <main className="mx-auto min-w-0 max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="text-2xl font-bold tracking-tight">个人中心</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        已学习 {learningStats.count} 门课程 · 累计 {learningStats.avg}% 平均进度
      </p>

      <Card className="mt-8 border-border/80">
        <CardContent className="flex flex-col items-center gap-4 p-6 sm:flex-row sm:items-center sm:gap-6 sm:p-8">
          <div
            className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-primary text-3xl font-bold text-primary-foreground shadow-inner"
            aria-hidden
          >
            {avatarDigits}
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="text-lg font-semibold tracking-tight text-foreground">
              {maskPhone(phone)}
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              <Badge variant="secondary" className="text-sm">
                {membershipLabel(membership)}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div
        className="mt-8 flex gap-1 rounded-lg border border-border/80 bg-muted/30 p-1"
        role="tablist"
        aria-label="个人中心内容"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "courses"}
          className={cn(
            "min-h-10 flex-1 rounded-md px-4 py-2.5 text-sm font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            tab === "courses"
              ? "bg-background text-foreground shadow-sm ring-1 ring-border"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setTab("courses")}
        >
          我的课程
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "orders"}
          className={cn(
            "min-h-10 flex-1 rounded-md px-4 py-2.5 text-sm font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            tab === "orders"
              ? "bg-background text-foreground shadow-sm ring-1 ring-border"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setTab("orders")}
        >
          我的订单
        </button>
      </div>

      {tab === "courses" ? (
        myCourses.length === 0 ? (
          <Card className="mt-6 border-dashed border-border/80">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              暂无已购课程，去课程页购买后即可在此查看学习进度。
            </CardContent>
          </Card>
        ) : (
          <ul className="mt-6 space-y-4">
            {myCourses.map((course) => {
              const pct = readCourseProgress(course.id);
              const seg = profileProgressStyle(pct);
              return (
                <li key={course.id}>
                  <Card className="overflow-hidden border-border/80">
                    <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-5">
                      <div
                        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/40 text-3xl"
                        aria-hidden
                      >
                        {course.coverEmoji}
                      </div>
                      <div className="min-w-0 flex-1 space-y-2">
                        <p className="font-semibold leading-snug text-foreground">
                          {course.title}
                        </p>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs text-muted-foreground">
                            <span>学习进度</span>
                            <span className="inline-flex items-center gap-1 font-medium text-foreground">
                              {seg.showCheck && (
                                <Check
                                  className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400"
                                  aria-hidden
                                />
                              )}
                              <span>{seg.label}</span>
                              <span className="tabular-nums text-muted-foreground">
                                {pct}%
                              </span>
                            </span>
                          </div>
                          <div
                            className="h-2 overflow-hidden rounded-full bg-muted"
                            role="progressbar"
                            aria-valuenow={pct}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${course.title} 进度 ${pct}%`}
                          >
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                seg.fill,
                              )}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <Button className="w-full shrink-0 sm:w-auto" asChild>
                        <Link to={`/courses/${course.id}`}>继续学习</Link>
                      </Button>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )
      ) : (
        <ul className="mt-6 space-y-3">
          {mockOrders.map((o) => (
            <li key={o.orderNo}>
              <Card className="border-border/80">
                <CardContent className="space-y-2 p-4 text-sm sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      订单号 {o.orderNo}
                    </span>
                    <Badge variant="outline" className="font-normal">
                      {o.status}
                    </Badge>
                  </div>
                  <p className="font-medium text-foreground">{o.courseName}</p>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-muted-foreground">
                    <span className="text-base font-semibold text-foreground">
                      {o.amount}
                    </span>
                    <span className="text-xs">{o.date}</span>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-10 border-t border-border/80 pt-8">
        <Button
          type="button"
          variant="outline"
          className="w-full sm:max-w-xs"
          onClick={() => {
            logout();
            navigate("/");
          }}
        >
          退出登录
        </Button>
      </div>
    </main>
  );
}
