import * as React from "react";
import { BookOpen, Star, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCoursesCatalog } from "@/contexts/CoursesCatalogContext";
import { cn } from "@/lib/utils";

export function AdminDashboardPage() {
  const { courses } = useCoursesCatalog();

  React.useEffect(() => {
    document.title = "数据总览 - 后台";
  }, []);

  const totalStudents = React.useMemo(
    () => courses.reduce((s, c) => s + (c.studentCount || 0), 0),
    [courses],
  );

  const { avgRating, goodRatePct } = React.useMemo(() => {
    if (courses.length === 0) return { avgRating: 0, goodRatePct: 0 };
    const avg = courses.reduce((s, c) => s + c.rating, 0) / courses.length;
    return {
      avgRating: avg,
      goodRatePct: Math.round((avg / 5) * 1000) / 10,
    };
  }, [courses]);

  const cards = [
    {
      title: "课程总数",
      value: String(courses.length),
      sub: "门在售/维护课程",
      icon: BookOpen,
      tint: "from-violet-500/15 to-fuchsia-500/10",
    },
    {
      title: "总学员数",
      value: totalStudents.toLocaleString("zh-CN"),
      sub: "各课学员数合计",
      icon: Users,
      tint: "from-sky-500/15 to-cyan-500/10",
    },
    {
      title: "总收入",
      value: "¥0",
      sub: "暂未接入订单统计",
      icon: TrendingUp,
      tint: "from-amber-500/15 to-orange-500/10",
    },
    {
      title: "好评率",
      value: `${goodRatePct}%`,
      sub: `平均评分 ${avgRating.toFixed(2)} / 5.0`,
      icon: Star,
      tint: "from-emerald-500/15 to-teal-500/10",
    },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          数据总览
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          指标基于当前课程目录（含后台已保存至本地的数据）
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((item) => (
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
              <p className="text-2xl font-bold tabular-nums tracking-tight">{item.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
