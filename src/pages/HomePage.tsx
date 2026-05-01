import * as React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { COURSES } from "@/data/courses";
import { CourseCard } from "@/components/CourseCard";
import type { CourseCategory } from "@/data/courses";

const categoryEntries: {
  emoji: string;
  title: string;
  description: string;
  href: string;
  category: CourseCategory;
  tint: string;
}[] = [
  {
    emoji: "💰",
    title: "AI赚钱项目",
    description: "副业闭环、获客与交付，把能力变成可收款的产品与服务。",
    href: "/courses?category=money",
    category: "money",
    tint: "from-amber-500/20 to-orange-600/10",
  },
  {
    emoji: "✨",
    title: "AI提示词",
    description: "系统提示词、RAG 与增长文案，让输出稳定、可评测、可上线。",
    href: "/courses?category=prompt",
    category: "prompt",
    tint: "from-violet-500/20 to-fuchsia-600/10",
  },
  {
    emoji: "🔧",
    title: "AI工具教程",
    description: "Cursor、视觉工具与自动化，把效率工具用到业务一线。",
    href: "/courses?category=tools",
    category: "tools",
    tint: "from-emerald-500/20 to-teal-600/10",
  },
];

export function HomePage() {
  React.useEffect(() => {
    document.title = "AIlearn Pro - AI商业课程平台";
  }, []);

  const courseCount = COURSES.length;

  const hotCourses = React.useMemo(() => {
    const hot = COURSES.filter((c) => c.isHot);
    const list = hot.length > 0 ? hot : COURSES;
    return list.slice(0, 6);
  }, []);

  return (
    <main className="min-w-0">
      {/* Hero：isolate + overflow-clip 避免大模糊层溢出盖住下方区块（部分浏览器叠层问题） */}
      <section className="relative isolate min-h-[80vh] overflow-clip border-b border-border/60">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-purple-950 to-slate-900" />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.22]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.07) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            maskImage:
              "radial-gradient(ellipse at 50% 35%, black 0%, transparent 72%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[28%] z-0 h-[min(22rem,50vw)] w-[min(36rem,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/45 blur-[100px]"
        />

        <div className="relative z-10 mx-auto flex min-h-[80vh] max-w-6xl flex-col justify-center px-4 py-12 sm:px-6 sm:py-16">
          <div className="relative max-w-3xl">
            <Badge
              variant="outline"
              className="animate-hero-fade-in-up border-white/20 bg-white/5 text-white/90 backdrop-blur hover:bg-white/10"
            >
              AI 商业变现 · 持续更新
            </Badge>
            <h1 className="animate-hero-fade-in-up mt-6 text-balance text-3xl font-bold tracking-tight text-white sm:text-5xl lg:text-[3.25rem] lg:leading-tight">
              用AI赚到你的第一个万元月收入
            </h1>
            <p className="animate-hero-fade-in-up hero-stagger-1 mt-5 max-w-xl text-pretty text-base leading-relaxed text-white/80 sm:text-lg">
              专注AI商业变现，28000+创业者的选择
            </p>
            <div className="animate-hero-fade-in-up hero-stagger-2 mt-8 flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                className="bg-white text-slate-900 hover:bg-white/90"
                asChild
              >
                <Link to="/courses" className="gap-2">
                  免费开始学习
                  <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                asChild
              >
                <Link to="/courses">查看全部课程</Link>
              </Button>
            </div>
            <div
              className="animate-hero-fade-in-up hero-stagger-3 mt-12 flex flex-wrap items-center gap-x-3 gap-y-3 border-t border-white/10 pt-10 text-sm text-white/90 sm:text-base"
              role="list"
            >
              <span className="inline-flex items-center gap-2 font-medium" role="listitem">
                <span aria-hidden>👥</span>
                <span>
                  28000+ <span className="text-white/75">学员</span>
                </span>
              </span>
              <span className="select-none text-white/30" aria-hidden>
                |
              </span>
              <span className="inline-flex items-center gap-2 font-medium" role="listitem">
                <span aria-hidden>📚</span>
                <span>
                  {courseCount}{" "}
                  <span className="text-white/75">门精品课</span>
                </span>
              </span>
              <span className="select-none text-white/30" aria-hidden>
                |
              </span>
              <span className="inline-flex items-center gap-2 font-medium" role="listitem">
                <span aria-hidden>⭐</span>
                <span>
                  4.8 <span className="text-white/75">平均评分</span>
                </span>
              </span>
            </div>
            <p className="animate-hero-fade-in-up hero-stagger-3 mt-4 max-w-xl text-pretty text-center text-[11px] leading-relaxed text-white/65 sm:text-left sm:text-xs">
              已有学员通过本平台课程实现月收入破万
            </p>
          </div>
        </div>
      </section>

      {/* 分类入口 */}
      <section className="relative z-[1] mx-auto max-w-6xl bg-background px-4 py-14 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            选课入口
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            按方向快速进入
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            点击卡片将打开对应分类下的课程列表。
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {categoryEntries.map((item) => (
            <Link
              key={item.category}
              to={item.href}
              className={cn(
                "group block rounded-xl no-underline outline-none transition-shadow",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              )}
            >
              <Card className="h-full overflow-hidden border-border/70 transition-shadow hover:shadow-md">
                <div
                  className={cn(
                    "h-2 w-full bg-gradient-to-r",
                    item.tint,
                  )}
                />
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className="text-4xl leading-none"
                      aria-hidden
                    >
                      {item.emoji}
                    </span>
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      进入列表
                    </Badge>
                  </div>
                  <CardTitle className="mt-3 text-lg">{item.title}</CardTitle>
                  <CardDescription className="text-[13px] leading-relaxed">
                    {item.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-6">
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                    浏览该分类
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* 热门课程 */}
      <section className="relative z-[1] border-y border-border/60 bg-muted/30 py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              热门课程
            </h2>
            <Button variant="outline" size="sm" className="shrink-0 sm:self-start" asChild>
              <Link to="/courses">
                查看全部
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            {hotCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </div>
      </section>

      {/* 底部 CTA */}
      <section className="relative z-[1] mx-auto max-w-6xl bg-background px-4 py-14 sm:px-6 sm:py-16">
        <Card className="overflow-hidden border-primary/25 bg-gradient-to-br from-primary/15 via-card to-violet-500/10 shadow-md">
          <CardContent className="flex flex-col items-center gap-6 px-6 py-12 text-center sm:flex-row sm:justify-between sm:text-left">
            <p className="max-w-xl text-balance text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              现在开始，7天赚到第一笔1000元
            </p>
            <Button size="lg" className="shrink-0 px-8" asChild>
              <Link to="/courses">
                立即免费学习
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="mt-6 overflow-hidden border-amber-500/35 bg-gradient-to-br from-slate-950 via-zinc-900 to-slate-950 shadow-lg">
          <CardContent className="px-6 py-10 sm:px-8">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 max-w-2xl flex-1 space-y-5">
                <div className="flex items-start gap-3 sm:gap-4">
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 ring-1 ring-amber-400/35"
                    aria-hidden
                  >
                    <Briefcase className="h-6 w-6 text-amber-300" />
                  </span>
                  <div className="min-w-0 space-y-4">
                    <p className="text-balance text-xl font-semibold tracking-tight text-amber-100 sm:text-2xl">
                      💼 没时间学？我们帮你做
                    </p>
                    <div className="space-y-2 text-pretty text-base leading-relaxed text-amber-100/85">
                      <p>用 Cursor + Claude + ChatGPT</p>
                      <p>3-7天交付你的网站 / 小程序 / 商业方案</p>
                    </div>
                    <p className="text-sm text-amber-200/80">
                      已有企业客户通过我们的服务上线产品
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:justify-end lg:flex-col lg:items-stretch xl:flex-row xl:justify-end">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-amber-400/55 bg-transparent text-amber-50 hover:bg-amber-500/10 hover:text-amber-50"
                  asChild
                >
                  <Link to="/services#cases">查看服务案例</Link>
                </Button>
                <Button
                  size="lg"
                  className="bg-amber-500 text-slate-950 hover:bg-amber-400"
                  asChild
                >
                  <Link to="/services/consult" className="gap-2">
                    立即咨询
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
