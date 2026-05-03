import * as React from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ChevronLeft, Image, Layers, Share2, Sparkles, Video, Zap } from "lucide-react";
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
    Icon: Image,
    title: "AI 图片生成",
    desc: "产品主图、海报、插画、头像，支持风格定制与批量生成。",
    iconClass: "text-violet-500",
  },
  {
    Icon: Video,
    title: "AI 视频生成",
    desc: "短视频、宣传片、商品展示，快速产出高转化内容。",
    iconClass: "text-pink-500",
  },
  {
    Icon: Zap,
    title: "极速交付",
    desc: "3–7 天内交付初稿，支持修改，保证质量。",
    iconClass: "text-amber-500",
  },
  {
    Icon: Layers,
    title: "一站式服务",
    desc: "从策划、生成到后期，全流程托管，省时省心。",
    iconClass: "text-blue-500",
  },
] as const;

const PRICING = [
  {
    name: "图片基础包",
    price: "¥500 起",
    features: ["10 张 AI 图片", "3 次修改", "商用授权"],
  },
  {
    name: "视频标准包",
    price: "¥1500 起",
    features: ["1 条 30 秒视频", "2 次修改", "配乐 + 配音"],
  },
  {
    name: "视频高级包",
    price: "¥3000 起",
    features: ["3 条 60 秒视频", "不限修改", "专属风格"],
  },
  {
    name: "企业定制",
    price: "按需报价",
    features: ["长期合作", "API 接入", "品牌 VI 统一"],
  },
] as const;

const CASE_ITEMS = [
  {
    badge: "电商",
    title: "服饰品牌主图与短视频",
    desc: "AI 生成主图 + 15 秒商品视频，投放点击率较原素材提升约 120%（脱敏统计）。",
  },
  {
    badge: "教育",
    title: "在线课程宣传片",
    desc: "脚本 + AI 画面 + 配音一站式，线索表单转化率较旧版落地页提高约 67%。",
  },
  {
    badge: "个人 IP",
    title: "知识博主日更素材",
    desc: "固定风格封面与口播切片，3 天内全平台涨粉约 5000+（客户授权节选）。",
  },
] as const;

const FAQ_ITEMS = [
  {
    q: "什么是 AI 视觉内容创作？",
    a: "利用 AI 与后期流程生成图片、短视频与营销素材，适用于电商、社媒投放、教育与个人品牌等场景，在控制成本的前提下加快素材迭代。",
  },
  {
    q: "交付周期需要多久？",
    a: "一般图片类约 3 天内出初稿，视频类约 5–7 天；复杂脚本、实拍合成或大量镜头需评估后给出时间表。",
  },
  {
    q: "是否可以修改？",
    a: "基础套餐通常含 2–3 轮修改；高级套餐可在约定范围内多轮调整，直至达到合同约定的验收标准。",
  },
  {
    q: "版权与商用如何约定？",
    a: "最终交付成片的商用范围以合同约定为准；生成链路需遵守平台与模型使用规范，敏感题材与肖像权类素材需提前说明并取得授权。",
  },
] as const;

export function AiVisionServicePage() {
  const { showToast } = useToast();
  const [formData, setFormData] = React.useState({
    name: "",
    contact: "",
    serviceType: "",
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
    document.title = "AI视觉内容创作 - AIlearn Pro";
  }, []);

  React.useEffect(() => {
    if (shareOpen) {
      setShareUrl(buildAbsoluteShareUrl("/services/ai-vision"));
    }
  }, [shareOpen]);

  React.useEffect(
    () => () => window.clearTimeout(submittedHideTimerRef.current),
    [],
  );

  function handleInputChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
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
          serviceType: formData.serviceType.trim() || undefined,
          budgetRange: formData.budgetRange.trim() || undefined,
          description: formData.description.trim(),
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
      setFormData({
        name: "",
        contact: "",
        serviceType: "",
        budgetRange: "",
        description: "",
      });
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
      console.error("[ai-vision submit]", err);
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
          <span className="text-foreground">AI视觉内容创作</span>
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
            分享本页
          </Button>
        </div>

        {/* 头部 */}
        <header className="mt-8 text-center">
          <Badge variant="outline" className="border-violet-500/40 text-violet-700 dark:text-violet-300">
            AI Generative Media
          </Badge>
          <h1 className="mt-4 text-balance bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
            AI视觉内容创作
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-pretty text-sm text-muted-foreground sm:text-base">
            让 AI 成为你的创意伙伴，快速生成高质量图片与视频，提升品牌视觉表现力。
          </p>
        </header>

        {/* 能力展示 */}
        <section aria-labelledby="ai-vision-features" className="mt-14">
          <h2 id="ai-vision-features" className="sr-only">
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

        {/* 报价 */}
        <section aria-labelledby="ai-vision-pricing" className="mt-16">
          <h2
            id="ai-vision-pricing"
            className="text-center text-2xl font-bold tracking-tight text-foreground"
          >
            灵活套餐
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted-foreground">
            以下为示意档位，最终以沟通后的书面报价为准
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PRICING.map((item) => (
              <Card
                key={item.name}
                className="flex flex-col border-border/70 bg-card/90 shadow-md transition-shadow hover:shadow-xl"
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl font-semibold">{item.name}</CardTitle>
                  <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                    {item.price}
                  </p>
                </CardHeader>
                <CardContent className="flex-1 pb-6">
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {item.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <CheckCircle2
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                          aria-hidden
                        />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* 案例占位 */}
        <section aria-labelledby="ai-vision-cases" className="mt-16">
          <h2
            id="ai-vision-cases"
            className="text-center text-2xl font-bold tracking-tight text-foreground"
          >
            真实案例
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-center text-sm text-muted-foreground">
            脱敏节选，实际效果以交付为准
          </p>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {CASE_ITEMS.map((item) => (
              <Card
                key={item.title}
                className="overflow-hidden border-border/70 bg-card/90 shadow-md"
              >
                <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-violet-500/15 to-pink-500/15 text-xs text-muted-foreground">
                  视频 / 图片预览
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

        {/* FAQ */}
        <section aria-labelledby="ai-vision-faq" className="mx-auto mt-16 max-w-3xl">
          <h2
            id="ai-vision-faq"
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
                    <span
                      className="text-muted-foreground transition group-open:rotate-180"
                      aria-hidden
                    >
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

        {/* 需求表单 */}
        <section id="request-form" className="mx-auto mt-16 max-w-lg scroll-mt-24">
          <Card className="relative overflow-hidden border-border/70 bg-card/95 shadow-xl">
            <div
              aria-hidden
              className="h-1 w-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-amber-500"
            />
            <CardHeader className="space-y-1 pb-2 pt-8 text-center">
              <div className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-violet-500/25 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-700 dark:text-violet-300">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Get started
              </div>
              <CardTitle className="text-xl sm:text-2xl">立即咨询 · 获取报价</CardTitle>
              <CardDescription>告诉我们你的需求，我们将在 24 小时内回复</CardDescription>
            </CardHeader>
            <CardContent className="pb-8">
              {submitted && submitSuccessMessage ? (
                <div
                  role="status"
                  className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-3 text-center text-sm text-emerald-800 dark:text-emerald-100"
                >
                  {submitSuccessMessage}
                </div>
              ) : null}
              <form className="space-y-5" onSubmit={(ev) => void handleSubmit(ev)}>
                <div className="space-y-2">
                  <label htmlFor="ai-vision-name" className="text-sm font-medium text-foreground/90">
                    姓名 <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="ai-vision-name"
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
                  <label htmlFor="ai-vision-contact" className="text-sm font-medium text-foreground/90">
                    微信 / 手机号 <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="ai-vision-contact"
                    name="contact"
                    value={formData.contact}
                    onChange={handleInputChange}
                    className={formFieldClass}
                    placeholder="便于我们与您沟通"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="ai-vision-type" className="text-sm font-medium text-foreground/90">
                    服务类型
                  </label>
                  <select
                    id="ai-vision-type"
                    name="serviceType"
                    value={formData.serviceType}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, serviceType: e.target.value }))
                    }
                    className={cn(
                      formFieldClass,
                      "h-10 cursor-pointer appearance-none bg-[length:1rem] bg-[right_0.65rem_center] bg-no-repeat pr-10",
                    )}
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                    }}
                  >
                    <option value="">请选择</option>
                    <option value="图片生成">图片生成</option>
                    <option value="视频生成">视频生成</option>
                    <option value="图片+视频">图片 + 视频组合</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="ai-vision-budget" className="text-sm font-medium text-foreground/90">
                    预算范围
                  </label>
                  <select
                    id="ai-vision-budget"
                    name="budgetRange"
                    value={formData.budgetRange}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, budgetRange: e.target.value }))
                    }
                    className={cn(
                      formFieldClass,
                      "h-10 cursor-pointer appearance-none bg-[length:1rem] bg-[right_0.65rem_center] bg-no-repeat pr-10",
                    )}
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                    }}
                  >
                    <option value="">请选择</option>
                    <option value="1000-3000">1000–3000 元</option>
                    <option value="3000-1万">3000–1 万元</option>
                    <option value="1万+">1 万元以上</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="ai-vision-desc" className="text-sm font-medium text-foreground/90">
                    需求描述 <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    id="ai-vision-desc"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    className={cn(formFieldClass, "min-h-[120px] resize-y py-3 leading-relaxed")}
                    placeholder="请说明用途、风格、数量、期望交付时间等"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  size="lg"
                  className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md hover:from-violet-500 hover:to-fuchsia-500"
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
            className="text-sm font-medium text-violet-600 underline-offset-2 hover:underline dark:text-violet-400"
          >
            ← 返回服务列表
          </Link>
        </p>

        <ShareModal
          open={shareOpen}
          onOpenChange={setShareOpen}
          title="AI视觉内容创作"
          url={shareUrl}
        />
      </div>
    </main>
  );
}
