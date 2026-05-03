import * as React from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  Share2,
  Shield,
  Users,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ShareModal, buildAbsoluteShareUrl } from "@/components/ShareModal";

const FEATURES = [
  {
    Icon: BarChart3,
    title: "智能决策看板",
    desc: "经营总览、过程管理、风险视图，实时掌握业务健康度。",
    iconClass: "text-violet-500",
  },
  {
    Icon: Users,
    title: "团队作战单元",
    desc: "成员绩效、放款趋势、转化漏斗，用数据驱动管理动作。",
    iconClass: "text-pink-500",
  },
  {
    Icon: Zap,
    title: "自动化工作流",
    desc: "线索分配、进件审批、回款催办，减少重复沟通与漏跟。",
    iconClass: "text-amber-500",
  },
  {
    Icon: Shield,
    title: "合规与审计",
    desc: "操作留痕、导出报表与权限分级，便于内控与对外说明。",
    iconClass: "text-sky-500",
  },
] as const;

const HIGHLIGHTS = [
  "线索—进件—审批—放款—回款全链路在同一套系统中闭环。",
  "看板与报表可按角色裁剪，适配店长、风控与管理层。",
  "支持与常见通讯、文档工具衔接，降低一线使用门槛。",
] as const;

export function SaaSCrmServicePage() {
  const [shareOpen, setShareOpen] = React.useState(false);
  const [shareUrl, setShareUrl] = React.useState("");
  const [screenshotSrc, setScreenshotSrc] = React.useState("/images/crm-demo.png");

  React.useEffect(() => {
    document.title = "中数云AI助贷CRM - AIlearn Pro";
  }, []);

  React.useEffect(() => {
    if (shareOpen) {
      setShareUrl(buildAbsoluteShareUrl("/services/saas-crm"));
    }
  }, [shareOpen]);

  return (
    <main className="min-w-0">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <nav
          className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-muted-foreground"
          aria-label="面包屑"
        >
          <Link to="/" className="shrink-0 hover:text-foreground">
            首页
          </Link>
          <span className="text-muted-foreground/70" aria-hidden>
            /
          </span>
          <Link to="/services" className="shrink-0 hover:text-foreground">
            AI 定制服务
          </Link>
          <span className="text-muted-foreground/70" aria-hidden>
            /
          </span>
          <span className="text-foreground">中数云AI助贷CRM</span>
        </nav>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" size="sm" className="-ml-2 gap-1 px-2" asChild>
            <Link to="/services">
              <ChevronLeft className="h-4 w-4" />
              返回服务列表
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 border-violet-500/30 text-violet-700 hover:bg-violet-500/10 dark:text-violet-300"
            onClick={() => setShareOpen(true)}
          >
            <Share2 className="h-4 w-4" aria-hidden />
            分享此案例
          </Button>
        </div>

        <header className="mt-10 text-center">
          <Badge variant="outline" className="border-violet-500/40 text-violet-700 dark:text-violet-300">
            成功案例 · 中数云AI助贷CRM
          </Badge>
          <h1 className="mt-4 text-balance bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
            助贷行业全流程 SaaS 系统
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-pretty text-sm text-muted-foreground sm:text-base">
            贷款中介全流程管理 · 智能决策看板 · 流程与权限可配置
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            已上线稳定运行；以下指标为合作方授权展示的脱敏量级，非承诺效果。
          </p>
        </header>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          <Card className="border-border/80 text-center shadow-md">
            <CardContent className="pt-6">
              <p className="text-2xl font-bold tabular-nums text-violet-600 dark:text-violet-400 sm:text-3xl">
                ¥2200万+
              </p>
              <p className="mt-1 text-sm text-muted-foreground">累计放款（样例展示）</p>
            </CardContent>
          </Card>
          <Card className="border-border/80 text-center shadow-md">
            <CardContent className="pt-6">
              <p className="text-2xl font-bold tabular-nums text-violet-600 dark:text-violet-400 sm:text-3xl">
                100%
              </p>
              <p className="mt-1 text-sm text-muted-foreground">进件转化率（试点阶段口径）</p>
            </CardContent>
          </Card>
          <Card className="border-border/80 text-center shadow-md">
            <CardContent className="pt-6">
              <p className="text-2xl font-bold tabular-nums text-violet-600 dark:text-violet-400 sm:text-3xl">
                0%
              </p>
              <p className="mt-1 text-sm text-muted-foreground">30+ 逾期率（样例看板）</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-12 overflow-hidden border-border/80 shadow-xl">
          <div className="border-b border-border/60 bg-muted/30 px-4 py-2 text-center text-xs text-muted-foreground">
            将真实系统截图保存为 <code className="rounded bg-muted px-1">public/images/crm-demo.png</code>{" "}
            后将自动替换下方示意；当前未检测到 PNG 时使用矢量示意。
          </div>
          <img
            src={screenshotSrc}
            alt="中数云AI助贷CRM 看板示意"
            className="w-full bg-slate-950 object-cover object-top"
            onError={() => {
              if (screenshotSrc.endsWith(".png")) {
                setScreenshotSrc("/images/crm-demo.svg");
              }
            }}
          />
          <CardContent className="p-4 text-center text-xs text-muted-foreground">
            演示界面与数据均为样例，最终以实际部署环境为准。
          </CardContent>
        </Card>

        <section aria-labelledby="crm-features" className="mt-14">
          <h2 id="crm-features" className="sr-only">
            核心能力
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ Icon, title, desc, iconClass }) => (
              <Card key={title} className="border-border/70 bg-card/90 shadow-md">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Icon className={cn("h-6 w-6 shrink-0", iconClass)} aria-hidden />
                    <span className="font-semibold text-foreground">{title}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Card className="mt-12 border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-card to-pink-500/10 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">落地亮点</CardTitle>
            <CardDescription>适合希望「先跑起来、再迭代」的助贷与金融服务团队</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pb-6">
            {HIGHLIGHTS.map((line) => (
              <div key={line} className="flex gap-2 text-sm text-foreground/90">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                <span>{line}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="mt-10 border-border/80 bg-card/95 shadow-inner">
          <CardContent className="p-6 text-center sm:p-8">
            <p className="text-balance text-base font-medium leading-relaxed text-foreground sm:text-lg">
              「使用中数云AI助贷CRM 后，客户跟进节奏更清晰，审批与回款节点可追踪，团队协同成本明显下降。」
            </p>
            <p className="mt-3 text-sm text-muted-foreground">—— 某助贷机构运营总监（脱敏引用）</p>
          </CardContent>
        </Card>

        <div className="mt-12 flex flex-col items-center gap-3 text-center">
          <Button
            size="lg"
            className="bg-gradient-to-r from-violet-600 to-pink-600 px-8 text-white shadow-md hover:from-violet-500 hover:to-pink-500"
            asChild
          >
            <Link to="/services/consult" className="gap-2">
              立即咨询 · 获取专属 SaaS 方案
            </Link>
          </Button>
          <a
            href="https://crm.syzs.top"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-violet-600 underline-offset-2 hover:underline dark:text-violet-400"
          >
            打开在线演示 →
          </a>
          <p className="max-w-md text-xs text-muted-foreground">
            支持私有化部署、定制开发、与现有工具/API 对接；亦可先浏览{" "}
            <Link to="/services/saas-system" className="font-medium text-primary underline-offset-2 hover:underline">
              通用 SaaS 与工作流服务页
            </Link>
            。
          </p>
        </div>

        <ShareModal
          open={shareOpen}
          onOpenChange={setShareOpen}
          title="中数云AI助贷CRM"
          url={shareUrl}
        />
      </div>
    </main>
  );
}
