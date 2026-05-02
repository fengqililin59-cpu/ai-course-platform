import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, Phone, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/contexts/ToastContext";
import { SUCCESS_CASES } from "@/data/successCases";
import { cn } from "@/lib/utils";

const NEED_TYPE_OPTIONS = [
  { value: "网站", label: "网站" },
  { value: "小程序", label: "小程序" },
  { value: "AI系统", label: "AI系统" },
] as const;

const BUDGET_OPTIONS = [
  { value: "1000-3000", label: "1000-3000" },
  { value: "3000-1万", label: "3000-1万" },
  { value: "1万+", label: "1万+" },
] as const;

const PACKAGES = [
  {
    id: "pkg-web",
    name: "快速建站",
    price: "¥2999",
    priceNote: "",
    delivery: "5 个工作日",
    includes: [
      "5 页响应式网站",
      "SEO 基础",
      "手机端适配",
      "1 个月免费维护",
    ],
    fit: "个人品牌、小微企业、自由职业者",
    cta: "立即咨询",
    ctaHref: "#request-form",
    featured: false,
  },
  {
    id: "pkg-ai",
    name: "AI 工具定制",
    price: "¥5999",
    priceNote: "起",
    delivery: "7–14 个工作日",
    includes: [
      "需求分析",
      "UI 设计",
      "功能开发",
      "上线部署",
      "操作培训",
    ],
    fit: "有特定业务流程需要 AI 化的团队",
    cta: "立即咨询",
    ctaHref: "#request-form",
    featured: true,
  },
  {
    id: "pkg-enterprise",
    name: "企业 AI 解决方案",
    price: "¥19999",
    priceNote: "起",
    delivery: "按项目约定",
    includes: [
      "全流程咨询",
      "系统开发",
      "员工培训",
      "长期维护",
    ],
    fit: "中小企业数字化转型",
    cta: "预约电话沟通",
    ctaHref: "#request-form",
    featured: false,
  },
] as const;

const FLOW_STEPS = [
  { title: "填写需求表单", detail: "约 5 分钟" },
  { title: "48 小时内回复方案和报价", detail: "" },
  { title: "确认后开始开发", detail: "" },
  { title: "交付验收，不满意免费修改", detail: "" },
] as const;

function shortOutcome(text: string): string {
  const t = text.trim();
  if (t.length <= 36) return t;
  return `${t.slice(0, 35)}…`;
}

/** 展示与复制用；可在 .env / .env.production 中设置 VITE_WECHAT_ID */
function wechatIdFromEnv(): string {
  const v = (import.meta.env.VITE_WECHAT_ID as string | undefined)?.trim();
  return v && v.length > 0 ? v : "你的微信号";
}

export function ServicesListPage() {
  const { showToast } = useToast();
  const navigate = useNavigate();

  React.useEffect(() => {
    document.title = "AI 定制服务 - AIlearn Pro";
  }, []);

  const [reqName, setReqName] = React.useState("");
  const [reqContact, setReqContact] = React.useState("");
  const [reqType, setReqType] = React.useState<string>(NEED_TYPE_OPTIONS[0].value);
  const [reqBudget, setReqBudget] = React.useState<string>(BUDGET_OPTIONS[0].value);
  const [reqDesc, setReqDesc] = React.useState("");

  const formFieldClass =
    "flex min-h-10 w-full rounded-lg border border-border/80 bg-background/80 px-3.5 py-2.5 text-sm shadow-sm transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20";

  function handleRequirementSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      姓名: reqName.trim(),
      微信或手机号: reqContact.trim(),
      需求类型: reqType,
      预算范围: reqBudget,
      需求描述: reqDesc.trim(),
      submittedAt: new Date().toISOString(),
    };
    console.log("[需求提交表单]", payload);
    const wx = wechatIdFromEnv();
    showToast(`已收到您的需求！请添加微信：${wx} 获取报价方案`, "success");
    setReqName("");
    setReqContact("");
    setReqType(NEED_TYPE_OPTIONS[0].value);
    setReqBudget(BUDGET_OPTIONS[0].value);
    setReqDesc("");
    navigate("/services/wechat", { state: { fromForm: true }, replace: true });
  }

  const showcaseCases = SUCCESS_CASES.slice(0, 3);

  return (
    <main className="min-w-0">
      {/* Hero */}
      <section className="relative isolate overflow-hidden border-b border-border/60 bg-gradient-to-b from-slate-950 via-violet-950/90 to-slate-950 text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse at 50% 0%, black 0%, transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <Badge
            variant="outline"
            className="border-amber-400/40 bg-amber-500/10 text-amber-100"
          >
            费用透明 · 可开发票
          </Badge>
          <h1 className="mt-6 max-w-3xl text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.65rem] lg:leading-tight">
            不想学？让我们帮你做
          </h1>
          <p className="mt-5 max-w-2xl text-pretty text-base leading-relaxed text-white/80 sm:text-lg">
            用 AI 工具 3–7 天交付，费用透明，可开发票
          </p>
          <div
            className="mt-10 flex max-w-2xl flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-5 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-8"
            role="list"
          >
            <div className="text-center sm:text-left" role="listitem">
              <p className="text-2xl font-bold tabular-nums text-white sm:text-3xl">20+</p>
              <p className="mt-1 text-sm text-white/70">已服务客户</p>
            </div>
            <div className="hidden h-10 w-px bg-white/15 sm:block" aria-hidden />
            <div className="text-center sm:text-left" role="listitem">
              <p className="text-2xl font-bold tabular-nums text-white sm:text-3xl">5 天</p>
              <p className="mt-1 text-sm text-white/70">平均交付</p>
            </div>
            <div className="hidden h-10 w-px bg-white/15 sm:block" aria-hidden />
            <div className="text-center sm:text-left" role="listitem">
              <p className="text-2xl font-bold tabular-nums text-amber-300 sm:text-3xl">98%</p>
              <p className="mt-1 text-sm text-white/70">好评率</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        {/* 标准套餐 */}
        <section aria-labelledby="packages-heading" className="scroll-mt-24">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Pricing
            </p>
            <h2
              id="packages-heading"
              className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl"
            >
              标准套餐 · 价格与交付一目了然
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
              选定档位后下滑填写需求，我们将在 48 小时内给出方案与报价
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {PACKAGES.map((pkg) => (
              <Card
                key={pkg.id}
                className={cn(
                  "relative flex h-full flex-col overflow-hidden border-border/70 shadow-md transition-shadow hover:shadow-lg",
                  pkg.featured &&
                    "border-amber-500/50 ring-2 ring-amber-500/30 lg:scale-[1.02]",
                )}
              >
                {pkg.featured ? (
                  <div className="absolute right-4 top-4">
                    <Badge className="bg-amber-500 text-slate-950 hover:bg-amber-500/90">
                      推荐
                    </Badge>
                  </div>
                ) : null}
                <CardHeader className="pb-3 pt-8">
                  <CardTitle className="text-xl font-semibold">{pkg.name}</CardTitle>
                  <div className="mt-4 flex flex-wrap items-baseline gap-1">
                    <span className="text-3xl font-bold tracking-tight text-foreground">
                      {pkg.price}
                    </span>
                    {pkg.priceNote ? (
                      <span className="text-lg font-semibold text-muted-foreground">
                        {pkg.priceNote}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm font-medium text-violet-600 dark:text-violet-400">
                    交付：{pkg.delivery}
                  </p>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-4 pb-8">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      包含
                    </p>
                    <ul className="mt-2 space-y-2">
                      {pkg.includes.map((line) => (
                        <li key={line} className="flex gap-2 text-sm text-foreground/90">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-lg bg-muted/50 px-3 py-2.5 text-sm">
                    <span className="font-medium text-foreground">适合：</span>
                    <span className="text-muted-foreground">{pkg.fit}</span>
                  </div>
                  <div className="mt-auto pt-2">
                    {pkg.cta === "预约电话沟通" ? (
                      <Button
                        className="w-full gap-2 bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-white/90"
                        size="lg"
                        asChild
                      >
                        <a href={pkg.ctaHref}>
                          <Phone className="h-4 w-4" />
                          {pkg.cta}
                        </a>
                      </Button>
                    ) : (
                      <Button
                        className="w-full gap-2 bg-amber-500 text-slate-950 hover:bg-amber-400"
                        size="lg"
                        asChild
                      >
                        <a href={pkg.ctaHref}>{pkg.cta}</a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* 服务流程 */}
        <section
          aria-labelledby="flow-heading"
          className="mt-16 scroll-mt-24 rounded-2xl border border-border/70 bg-muted/20 px-4 py-10 sm:px-8 sm:py-12"
        >
          <h2
            id="flow-heading"
            className="text-center text-xl font-bold tracking-tight sm:text-2xl"
          >
            服务流程
          </h2>
          <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FLOW_STEPS.map((step, i) => (
              <li
                key={step.title}
                className="relative flex flex-col rounded-xl border border-border/60 bg-card/90 p-5 shadow-sm"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 text-sm font-bold text-white">
                  {i + 1}
                </span>
                <p className="mt-3 font-semibold leading-snug text-foreground">{step.title}</p>
                {step.detail ? (
                  <p className="mt-1 text-sm text-muted-foreground">{step.detail}</p>
                ) : null}
              </li>
            ))}
          </ol>
        </section>

        {/* 成功案例（3 条精简） */}
        <section
          id="cases"
          aria-labelledby="success-heading"
          className="mt-16 scroll-mt-24 border-t border-border/50 pt-16"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Cases
              </p>
              <h2 id="success-heading" className="mt-2 text-2xl font-bold tracking-tight">
                成功案例
              </h2>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" aria-hidden />
              真实项目节选
            </span>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {showcaseCases.map((item) => (
              <Card
                key={item.id}
                className="border-border/70 bg-card/90 shadow-sm"
              >
                <CardContent className="space-y-2 p-5 text-sm leading-relaxed">
                  <p className="text-xs font-medium text-muted-foreground">项目类型</p>
                  <p className="font-semibold text-foreground">{item.deliverable}</p>
                  <p className="text-xs font-medium text-muted-foreground">客户类型</p>
                  <p className="font-medium text-foreground">{item.clientType}</p>
                  <p className="text-xs font-medium text-muted-foreground">核心成果</p>
                  <p className="text-foreground/90">{shortOutcome(item.outcome)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* 需求表单 */}
        <section
          id="request-form"
          aria-labelledby="quote-title"
          className="mt-16 scroll-mt-24 border-t border-border/50 pt-16"
        >
          <div className="mx-auto flex max-w-lg flex-col items-center">
            <p className="text-center text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Contact
            </p>
            <h2
              id="quote-title"
              className="mt-2 text-center text-2xl font-semibold tracking-tight text-foreground sm:text-[1.65rem]"
            >
              免费获取报价
            </h2>
            <p className="mt-2 max-w-md text-center text-sm leading-relaxed text-muted-foreground">
              填写后 48 小时内有专人回复
            </p>
            <p className="mt-1 max-w-md text-center text-xs text-muted-foreground">
              信息仅用于需求沟通，不会用于其他用途
            </p>

            <div className="relative mt-10 w-full">
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-br from-violet-500/25 via-transparent to-amber-500/20 opacity-80 blur-sm"
              />
              <Card className="relative overflow-hidden rounded-2xl border-border/60 bg-card/95 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.18)] backdrop-blur-sm dark:shadow-[0_24px_60px_-12px_rgba(0,0,0,0.45)]">
                <div
                  aria-hidden
                  className="h-1 w-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-amber-500"
                />
                <CardHeader className="space-y-1 pb-2 pt-7">
                  <CardTitle className="text-xl font-semibold tracking-tight">
                    项目需求表
                  </CardTitle>
                  <CardDescription className="text-[13px] leading-relaxed">
                    告诉我们你的目标与预算，便于匹配交付方案
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-8 pt-2">
                  <form className="space-y-5" onSubmit={handleRequirementSubmit}>
                    <div className="space-y-2">
                      <label htmlFor="req-name" className="text-sm font-medium text-foreground/90">
                        姓名
                      </label>
                      <input
                        id="req-name"
                        name="name"
                        autoComplete="name"
                        value={reqName}
                        onChange={(e) => setReqName(e.target.value)}
                        className={formFieldClass}
                        placeholder="如何称呼您"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="req-contact" className="text-sm font-medium text-foreground/90">
                        微信 / 手机号
                      </label>
                      <input
                        id="req-contact"
                        name="contact"
                        value={reqContact}
                        onChange={(e) => setReqContact(e.target.value)}
                        className={formFieldClass}
                        placeholder="便于我们与您沟通"
                        required
                      />
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label htmlFor="req-type" className="text-sm font-medium text-foreground/90">
                          需求类型
                        </label>
                        <select
                          id="req-type"
                          name="needType"
                          value={reqType}
                          onChange={(e) => setReqType(e.target.value)}
                          className={cn(
                            formFieldClass,
                            "h-10 cursor-pointer appearance-none bg-[length:1rem] bg-[right_0.65rem_center] bg-no-repeat pr-10",
                          )}
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                          }}
                        >
                          {NEED_TYPE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="req-budget" className="text-sm font-medium text-foreground/90">
                          预算范围
                        </label>
                        <select
                          id="req-budget"
                          name="budget"
                          value={reqBudget}
                          onChange={(e) => setReqBudget(e.target.value)}
                          className={cn(
                            formFieldClass,
                            "h-10 cursor-pointer appearance-none bg-[length:1rem] bg-[right_0.65rem_center] bg-no-repeat pr-10",
                          )}
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                          }}
                        >
                          {BUDGET_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="req-desc" className="text-sm font-medium text-foreground/90">
                        需求描述
                      </label>
                      <textarea
                        id="req-desc"
                        name="description"
                        value={reqDesc}
                        onChange={(e) => setReqDesc(e.target.value)}
                        rows={4}
                        className={cn(formFieldClass, "min-h-[120px] resize-y py-3 leading-relaxed")}
                        placeholder="行业背景、期望功能、参考案例、上线时间等"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      size="lg"
                      className="mt-2 w-full gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-md transition hover:from-violet-500 hover:to-violet-600 hover:shadow-lg"
                    >
                      <Send className="h-4 w-4" aria-hidden />
                      提交需求
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              也可直接{" "}
              <Link to="/services/consult" className="font-medium text-primary underline-offset-2 hover:underline">
                打开完整咨询页
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
