import * as React from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, Play } from "lucide-react";
import { CATEGORY_COVER_GRADIENT } from "@/data/courses";
import { formatPriceFrom, getServiceById } from "@/data/services";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
function tagBadgeClass() {
  return "bg-amber-500/15 text-amber-900 ring-1 ring-amber-500/25 dark:text-amber-100";
}

export function ServiceDetailPage() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const svc = serviceId ? getServiceById(serviceId) : undefined;

  React.useEffect(() => {
    if (svc) {
      document.title = `${svc.longTitle} - AI 定制服务`;
    } else {
      document.title = "服务不存在 - AIlearn Pro";
    }
  }, [svc]);

  if (!svc) {
    return (
      <main className="mx-auto min-w-0 max-w-6xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold">服务不存在</h1>
        <p className="mt-2 text-sm text-muted-foreground">请从服务列表重新选择。</p>
        <Button className="mt-6" asChild>
          <Link to="/services">返回服务列表</Link>
        </Button>
      </main>
    );
  }

  const cover = CATEGORY_COVER_GRADIENT[svc.visualCategory];
  const consultHref = `/services/consult?service=${encodeURIComponent(svc.id)}`;

  return (
    <main className="mx-auto min-w-0 max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <nav
        className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-muted-foreground"
        aria-label="面包屑"
      >
        <Link to="/" className="shrink-0 hover:text-foreground">
          首页
        </Link>
        <span className="shrink-0 text-muted-foreground/70" aria-hidden>
          /
        </span>
        <Link to="/services" className="shrink-0 hover:text-foreground">
          AI 定制服务
        </Link>
        <span className="shrink-0 text-muted-foreground/70" aria-hidden>
          /
        </span>
        <span className="min-w-0 max-w-full break-words text-foreground">{svc.longTitle}</span>
      </nav>

      <Button variant="ghost" size="sm" className="mt-4 -ml-2 gap-1 px-2" asChild>
        <Link to="/services">
          <ChevronLeft className="h-4 w-4" />
          返回列表
        </Link>
      </Button>

      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <header>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{svc.categoryLabel}</Badge>
              {svc.isHot && (
                <Badge className="bg-orange-500 text-white hover:bg-orange-500/90">HOT</Badge>
              )}
              {svc.isNew && (
                <Badge className="bg-emerald-600 text-white hover:bg-emerald-600/90">NEW</Badge>
              )}
              {svc.tags.map((t) => (
                <Badge key={t} variant="secondary" className={tagBadgeClass()}>
                  {t}
                </Badge>
              ))}
            </div>
            <h1 className="mt-4 text-balance text-2xl font-bold tracking-tight sm:text-3xl">
              {svc.longTitle}
            </h1>
            <p className="mt-2 text-sm font-medium text-muted-foreground">{svc.headline}</p>
          </header>

          <section aria-labelledby="svc-hero-label">
            <h2 id="svc-hero-label" className="sr-only">
              服务介绍预览
            </h2>
            <div
              className="relative aspect-video overflow-hidden rounded-xl border border-border/80 shadow-md"
              style={{ background: cover }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />
              <div
                className="pointer-events-none absolute right-3 top-2 text-6xl opacity-40 drop-shadow-md sm:right-5 sm:text-7xl"
                aria-hidden
              >
                {svc.coverEmoji}
              </div>
              <div className="relative z-[1] flex h-full w-full flex-col items-center justify-center px-4 py-8 text-center text-white">
                <div
                  className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-full bg-white/30 ring-2 ring-white/50 backdrop-blur-sm sm:h-[5.25rem] sm:w-[5.25rem]"
                  aria-hidden
                >
                  <Play className="ml-1 h-11 w-11 fill-white text-white sm:h-[3.25rem] sm:w-[3.25rem]" />
                </div>
                <p className="mt-5 max-w-lg text-pretty text-sm font-medium leading-snug drop-shadow-md sm:text-base">
                  {svc.heroCaption}
                </p>
              </div>
            </div>
          </section>

          <section aria-labelledby="svc-intro">
            <h2 id="svc-intro" className="text-lg font-semibold tracking-tight">
              服务介绍
            </h2>
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {svc.intro}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {svc.pillTags.map((t) => (
                <Badge key={t} variant="secondary" className="text-xs font-normal">
                  {t}
                </Badge>
              ))}
            </div>
          </section>

          <section aria-labelledby="svc-phases">
            <h2 id="svc-phases" className="text-lg font-semibold tracking-tight">
              交付清单
            </h2>
            <ul className="mt-4 space-y-3 rounded-xl border border-border/80 bg-card p-6 text-sm">
              {svc.phases.map((p, i) => (
                <li key={p.title} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-medium text-foreground">{p.title}</p>
                    <p className="text-muted-foreground">{p.schedule}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="svc-cases">
            <h2 id="svc-cases" className="text-lg font-semibold tracking-tight">
              案例截图
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              以下为占位说明，可替换为你的助贷 SaaS、AI App、Cursor 开发过程等真实素材。
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {svc.cases.map((c) => (
                <Card key={c.title} className="overflow-hidden border-border/80">
                  <div className="aspect-video bg-gradient-to-br from-muted to-muted/40" />
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{c.title}</CardTitle>
                    <CardDescription className="text-[13px] leading-relaxed">
                      {c.body}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </section>
        </div>

        <aside className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">
            <Card className="border-border/80 shadow-md">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">获取报价</CardTitle>
                <CardDescription>根据需求评估后给出明细报价与周期</CardDescription>
                <div className="pt-2">
                  <span className="text-3xl font-bold tracking-tight">{formatPriceFrom(svc.priceFrom)}</span>
                </div>
                <p className="text-sm text-muted-foreground">{svc.priceNote}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full gap-2 bg-amber-500 text-slate-950 hover:bg-amber-400" size="lg" asChild>
                  <Link to={consultHref}>立即咨询</Link>
                </Button>
                <p className="text-center text-[11px] text-muted-foreground">
                  支持企业对公 · 可开发票
                </p>
              </CardContent>
            </Card>
          </div>
        </aside>
      </div>
    </main>
  );
}
