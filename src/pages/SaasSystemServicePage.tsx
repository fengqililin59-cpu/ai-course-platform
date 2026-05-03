import * as React from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  ChevronLeft,
  Cog,
  Database,
  Share2,
  Shield,
  Sparkles,
  Workflow,
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
import { resolveApiUrl } from "@/lib/apiBase";
import { useToast } from "@/contexts/ToastContext";
import { ShareModal, buildAbsoluteShareUrl } from "@/components/ShareModal";

const formFieldClass =
  "flex min-h-10 w-full rounded-lg border border-border/80 bg-background/80 px-3.5 py-2.5 text-sm shadow-sm transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20";

const FEATURES = [
  {
    Icon: Database,
    title: "业务中台与 CRM",
    desc: "线索、跟进、合同与回款在同一套界面中闭环，可按行业模板裁剪。",
    iconClass: "text-sky-500",
  },
  {
    Icon: Workflow,
    title: "自动化工作流",
    desc: "审批、通知、数据同步与定时任务可配置，减少人工复制粘贴。",
    iconClass: "text-emerald-500",
  },
  {
    Icon: BarChart3,
    title: "数据看板",
    desc: "核心指标一屏掌握，支持导出与权限分级，方便管理层周会复盘。",
    iconClass: "text-amber-500",
  },
  {
    Icon: Shield,
    title: "上线与运维",
    desc: "环境隔离、备份策略与变更记录，交付文档 + 培训便于客户自有团队接手。",
    iconClass: "text-violet-500",
  },
] as const;

const CASE_ITEMS = [
  {
    badge: "教育",
    title: "教培机构教务与排课",
    desc: "学员、班级、课消与续费提醒打通，运营人力节省约 40%（客户脱敏反馈）。",
  },
  {
    badge: "零售",
    title: "连锁门店轻量 CRM",
    desc: "会员标签 + 导购任务 + 总部看板，3 周内完成试点门店上线。",
  },
  {
    badge: "制造",
    title: "订单与库存联动看板",
    desc: "对接现有 ERP 导出数据，日维度产销存可视化，例会准备时间明显缩短。",
  },
] as const;

const FAQ_ITEMS = [
  {
    q: "与「模板建站」有什么区别？",
    a: "本方案侧重业务流程与数据：权限、状态机、报表与对接占主要工作量；若仅需展示型官网，可选用列表中的「企业官网」套餐。",
  },
  {
    q: "交付后谁可以改需求？",
    a: "首版上线后通常约定 1–2 个迭代窗口；后续大改按人天或阶段合同另计，并在文档中冻结验收范围。",
  },
  {
    q: "是否支持私有化或指定云？",
    a: "支持按客户合规要求部署；涉及等保或专有云时需提前评估周期与资质，我们会写入技术附件。",
  },
] as const;

export function SaasSystemServicePage() {
  const { showToast } = useToast();
  const [formData, setFormData] = React.useState({
    name: "",
    contact: "",
    industry: "",
    budgetRange: "",
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [submitSuccessMessage, setSubmitSuccessMessage] = React.useState("");
  const submittedHideTimerRef = React.useRef<number>(0);
  const [shareOpen, setShareOpen] = React.useState(false);
  const [shareUrl, setShareUrl] = React.useState("");

  React.useEffect(() => {
    document.title = "商业方案与SaaS系统 - AIlearn Pro";
  }, []);

  React.useEffect(() => {
    if (shareOpen) {
      setShareUrl(buildAbsoluteShareUrl("/services/saas-system"));
    }
  }, [shareOpen]);

  React.useEffect(
    () => () => window.clearTimeout(submittedHideTimerRef.current),
    [],
  );

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(resolveApiUrl("/api/contact/ai-vision"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          contact: formData.contact.trim(),
          serviceType: `SaaS/工作流 · ${formData.industry.trim() || "未选行业"}`,
          budgetRange: formData.budgetRange.trim() || undefined,
          description: `[SaaS 详情页咨询]\n行业/场景：${formData.industry.trim() || "—"}\n\n${formData.description.trim()}`,
        }),
      });
      const text = await res.text();
      let data: { success?: boolean; message?: string } = {};
      try {
        data = text ? (JSON.parse(text) as { success?: boolean; message?: string }) : {};
      } catch {
        showToast(text.slice(0, 120) || `提交失败（${res.status}）`, "error");
        return;
      }
      if (!res.ok || data.success === false) {
        showToast(data.message || `提交失败（${res.status}）`, "error");
        return;
      }
      setFormData({ name: "", contact: "", industry: "", budgetRange: "", description: "" });
      const msg = data.message || "提交成功！我们会尽快联系您。";
      setSubmitSuccessMessage(msg);
      setSubmitted(true);
      showToast(msg, "success");
      window.clearTimeout(submittedHideTimerRef.current);
      submittedHideTimerRef.current = window.setTimeout(() => {
        setSubmitted(false);
        setSubmitSuccessMessage("");
      }, 4000);
    } catch (err) {
      console.error("[saas-system submit]", err);
      showToast("网络错误，请确认后端已启动且 /api 代理可用", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

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
          <span className="text-foreground">商业方案与SaaS系统</span>
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
            className="gap-2 border-emerald-500/30 text-emerald-800 hover:bg-emerald-500/10 dark:text-emerald-200"
            onClick={() => setShareOpen(true)}
          >
            <Share2 className="h-4 w-4" aria-hidden />
            分享本页
          </Button>
        </div>

        <header className="mt-8 text-center">
          <Badge variant="outline" className="border-emerald-500/40 text-emerald-800 dark:text-emerald-200">
            SaaS · Workflow
          </Badge>
          <h1 className="mt-4 text-balance bg-gradient-to-r from-sky-600 via-emerald-600 to-teal-600 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
            商业方案与 SaaS 系统
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-pretty text-sm text-muted-foreground sm:text-base">
            从方案梳理到系统落地：CRM、教务、审批流与数据看板，上手快、可迭代，适合希望用数字化「先跑起来」的团队。
          </p>
          <p className="mx-auto mt-5 max-w-2xl text-center text-sm">
            <Link
              to="/services/saas-crm"
              className="inline-flex items-center gap-1.5 font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-300"
            >
              旗舰案例：中数云 AI 助贷 CRM（含分享与示意截图）→
            </Link>
          </p>
        </header>

        <section aria-labelledby="saas-features" className="mt-14">
          <h2 id="saas-features" className="sr-only">
            服务能力
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ Icon, title, desc, iconClass }) => (
              <Card
                key={title}
                className="border-border/70 bg-card/90 shadow-md transition-shadow hover:shadow-lg"
              >
                <CardContent className="pt-6 text-center">
                  <div className="flex justify-center">
                    <Icon className={cn("h-7 w-7", iconClass)} aria-hidden />
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-foreground">{title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section aria-labelledby="saas-cases" className="mt-16">
          <h2
            id="saas-cases"
            className="text-center text-2xl font-bold tracking-tight text-foreground"
          >
            真实案例（节选）
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-center text-sm text-muted-foreground">
            行业与数据已脱敏，仅用于说明交付形态与效果量级
          </p>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {CASE_ITEMS.map((item) => (
              <Card
                key={item.title}
                className="overflow-hidden border-border/70 bg-card/90 shadow-md"
              >
                <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-sky-500/15 to-emerald-500/15 text-xs text-muted-foreground">
                  <Cog className="h-10 w-10 opacity-40" aria-hidden />
                </div>
                <CardContent className="space-y-2 p-4 text-left">
                  <Badge variant="secondary">{item.badge}</Badge>
                  <p className="font-medium text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section aria-labelledby="saas-faq" className="mx-auto mt-16 max-w-3xl">
          <h2
            id="saas-faq"
            className="text-center text-2xl font-bold tracking-tight text-foreground"
          >
            常见问题
          </h2>
          <div className="mt-8 space-y-3">
            {FAQ_ITEMS.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-border/70 bg-card/90 px-4 py-1 shadow-sm open:shadow-md"
              >
                <summary className="cursor-pointer list-none py-3 font-semibold text-foreground outline-none marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-2">
                    {item.q}
                    <span className="text-muted-foreground transition group-open:rotate-180" aria-hidden>
                      ▼
                    </span>
                  </span>
                </summary>
                <p className="border-t border-border/60 pb-4 pt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section id="request-form" className="mx-auto mt-16 max-w-lg scroll-mt-24">
          <Card className="relative overflow-hidden border-border/70 bg-card/95 shadow-xl">
            <div
              aria-hidden
              className="h-1 w-full bg-gradient-to-r from-sky-600 via-emerald-500 to-teal-500"
            />
            <CardHeader className="space-y-1 pb-2 pt-8 text-center">
              <div className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-800 dark:text-emerald-200">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                方案沟通
              </div>
              <CardTitle className="text-xl sm:text-2xl">预约需求梳理 · 获取报价</CardTitle>
              <CardDescription>我们将在 24 小时内回复，复杂项目可先安排 30 分钟电话沟通</CardDescription>
            </CardHeader>
            <CardContent className="pb-8">
              {submitted && submitSuccessMessage ? (
                <div
                  role="status"
                  className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-3 text-center text-sm text-emerald-900 dark:text-emerald-100"
                >
                  {submitSuccessMessage}
                </div>
              ) : null}
              <form className="space-y-5" onSubmit={(ev) => void handleSubmit(ev)}>
                <div className="space-y-2">
                  <label htmlFor="saas-name" className="text-sm font-medium text-foreground/90">
                    姓名 <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="saas-name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={formFieldClass}
                    placeholder="如何称呼您"
                    required
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="saas-contact" className="text-sm font-medium text-foreground/90">
                    微信 / 手机号 <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="saas-contact"
                    name="contact"
                    value={formData.contact}
                    onChange={handleInputChange}
                    className={formFieldClass}
                    placeholder="便于我们与您沟通"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="saas-industry" className="text-sm font-medium text-foreground/90">
                    行业 / 场景
                  </label>
                  <input
                    id="saas-industry"
                    name="industry"
                    value={formData.industry}
                    onChange={handleInputChange}
                    className={formFieldClass}
                    placeholder="如：教培、零售、制造业…"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="saas-budget" className="text-sm font-medium text-foreground/90">
                    预算范围
                  </label>
                  <select
                    id="saas-budget"
                    name="budgetRange"
                    value={formData.budgetRange}
                    onChange={(e) => setFormData((p) => ({ ...p, budgetRange: e.target.value }))}
                    className={cn(
                      formFieldClass,
                      "h-10 cursor-pointer appearance-none bg-[length:1rem] bg-[right_0.65rem_center] bg-no-repeat pr-10",
                    )}
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                    }}
                  >
                    <option value="">请选择</option>
                    <option value="1万-3万">1 万 – 3 万</option>
                    <option value="3万-10万">3 万 – 10 万</option>
                    <option value="10万+">10 万以上</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="saas-desc" className="text-sm font-medium text-foreground/90">
                    需求描述 <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    id="saas-desc"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    className={cn(formFieldClass, "min-h-[120px] resize-y py-3 leading-relaxed")}
                    placeholder="希望解决什么问题、现有系统、期望上线时间等"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  size="lg"
                  className="w-full bg-gradient-to-r from-sky-600 to-emerald-600 text-white shadow-md hover:from-sky-500 hover:to-emerald-500"
                >
                  {isSubmitting ? "提交中…" : "提交需求"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>

        <p className="mt-10 text-center">
          <Link
            to="/services"
            className="text-sm font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
          >
            ← 返回服务列表
          </Link>
        </p>

        <ShareModal
          open={shareOpen}
          onOpenChange={setShareOpen}
          title="商业方案与SaaS系统"
          url={shareUrl}
        />
      </div>
    </main>
  );
}
