import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/contexts/ToastContext";
import { resolveApiUrl } from "@/lib/apiBase";
import { cn } from "@/lib/utils";

const EXPERTISE_OPTIONS = [
  { value: "ai-tools", label: "AI工具" },
  { value: "side-income", label: "副业变现" },
  { value: "dev", label: "编程开发" },
  { value: "design", label: "设计创意" },
  { value: "marketing", label: "营销运营" },
  { value: "other", label: "其他" },
] as const;

const ADVANTAGES = [
  {
    emoji: "🚀",
    title: "免费入驻",
    desc: "无需技术背景，填表即可申请",
  },
  {
    emoji: "💰",
    title: "高分成比例",
    desc: "博主拿80%，业内最高",
  },
  {
    emoji: "📊",
    title: "数据透明",
    desc: "实时查看销售数据和收益",
  },
  {
    emoji: "🛡️",
    title: "安全保障",
    desc: "平台担保，按月结算",
  },
] as const;

const CONDITIONS = [
  "在某领域有实操经验（不限行业）",
  "能提供原创课程内容",
  "有一定粉丝基础或愿意自主推广",
] as const;

const FAQ = [
  {
    q: "入驻需要什么资质？",
    a: "无需营业执照，个人即可入驻，有实操经验即可。",
  },
  {
    q: "收益怎么结算？",
    a: "每月15日结算上月收益，满100元可提现，转账到微信或支付宝。",
  },
  {
    q: "平台会帮我推广吗？",
    a: "会在课程列表和首页推荐优质课程，同时提供数据支持帮你优化内容。",
  },
] as const;

const inputClass =
  "flex min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const textareaClass = cn(inputClass, "min-h-[140px] resize-y");

export type JoinApplicationPayload = {
  name: string;
  wechat: string;
  expertise: string;
  courseName: string;
  price: string;
  bio: string;
  fans: string;
};

export function JoinPage() {
  const { showToast } = useToast();
  const [name, setName] = React.useState("");
  const [wechat, setWechat] = React.useState("");
  const [expertise, setExpertise] = React.useState<string>(
    EXPERTISE_OPTIONS[0].value,
  );
  const [courseName, setCourseName] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [fans, setFans] = React.useState("");

  React.useEffect(() => {
    document.title = "博主入驻申请 - 智学 AI";
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: JoinApplicationPayload = {
      name: name.trim(),
      wechat: wechat.trim(),
      expertise,
      courseName: courseName.trim(),
      price: price.trim(),
      bio: bio.trim(),
      fans: fans.trim(),
    };
    console.log(payload);
    try {
      const res = await fetch(resolveApiUrl("/api/creator/join"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: payload.name,
          wechat: payload.wechat,
          expertise: payload.expertise,
          courseName: payload.courseName,
          price: payload.price,
          bio: payload.bio,
          fans: payload.fans,
        }),
      });
      const data = (await res.json()) as { success?: boolean; message?: string };
      if (!res.ok || data.success === false) {
        showToast(data.message || "提交失败，请稍后重试", "error");
        return;
      }
    } catch {
      showToast("网络异常，请检查连接后重试", "error");
      return;
    }
    showToast("申请已提交！我们将在3个工作日内通过微信联系你", "success");
    setName("");
    setWechat("");
    setExpertise(EXPERTISE_OPTIONS[0].value);
    setCourseName("");
    setPrice("");
    setBio("");
    setFans("");
  }

  return (
    <main className="min-w-0">
      <section className="relative isolate overflow-clip border-b border-border/60">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-950 via-teal-950 to-background" />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.2]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            maskImage:
              "radial-gradient(ellipse at 50% 30%, black 0%, transparent 70%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[32%] z-0 h-[min(20rem,48vw)] w-[min(34rem,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/35 blur-[100px]"
        />

        <div className="relative z-10 mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <h1 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
            入驻智学AI，开始卖课赚钱
          </h1>
          <p className="mt-4 max-w-2xl text-pretty text-base leading-relaxed text-white/85 sm:text-lg">
            平台提供流量+技术+支付，你只需要有内容
          </p>
          <div className="mt-10 flex flex-wrap gap-4 sm:gap-8">
            <div className="rounded-xl border border-white/15 bg-white/5 px-5 py-4 backdrop-blur">
              <p className="text-2xl font-bold tabular-nums text-emerald-300">
                0元入驻
              </p>
              <p className="mt-1 text-sm text-white/70">零门槛启动</p>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/5 px-5 py-4 backdrop-blur">
              <p className="text-2xl font-bold tabular-nums text-emerald-300">
                平台抽佣20%
              </p>
              <p className="mt-1 text-sm text-white/70">博主实得 80%</p>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/5 px-5 py-4 backdrop-blur">
              <p className="text-2xl font-bold tabular-nums text-emerald-300">
                7天审核
              </p>
              <p className="mt-1 text-sm text-white/70">快速反馈</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-14 px-4 py-12 sm:px-6 sm:py-16">
        <section>
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
            平台优势
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            专注内容与变现，其余交给平台
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ADVANTAGES.map((item) => (
              <Card
                key={item.title}
                className="border-border/80 bg-card/60 shadow-sm"
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-start gap-2 text-base">
                    <span aria-hidden className="text-xl leading-none">
                      {item.emoji}
                    </span>
                    {item.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {item.desc}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
            入驻条件
          </h2>
          <ul className="mt-6 space-y-3 rounded-xl border border-border/80 bg-muted/30 px-5 py-5 sm:px-6">
            {CONDITIONS.map((line) => (
              <li key={line} className="flex gap-3 text-sm leading-relaxed">
                <span
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
                  aria-hidden
                />
                {line}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
            提交申请
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            信息仅用于入驻审核，不会对外公开
          </p>
          <Card className="mt-8 border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">入驻申请表</CardTitle>
              <CardDescription>
                填写后我们将在 3 个工作日内通过微信与你联系
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="join-name" className="text-sm font-medium">
                    姓名 / 昵称
                  </label>
                  <input
                    id="join-name"
                    name="name"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={cn(inputClass, "mt-1.5")}
                    placeholder="用于称呼与联系确认"
                  />
                </div>
                <div>
                  <label htmlFor="join-wechat" className="text-sm font-medium">
                    微信号
                  </label>
                  <input
                    id="join-wechat"
                    name="wechat"
                    value={wechat}
                    onChange={(e) => setWechat(e.target.value)}
                    className={cn(inputClass, "mt-1.5")}
                    placeholder="便于工作人员添加你"
                  />
                </div>
                <div>
                  <label
                    htmlFor="join-expertise"
                    className="text-sm font-medium"
                  >
                    擅长领域
                  </label>
                  <select
                    id="join-expertise"
                    name="expertise"
                    value={expertise}
                    onChange={(e) => setExpertise(e.target.value)}
                    className={cn(inputClass, "mt-1.5")}
                  >
                    {EXPERTISE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="join-course-name"
                    className="text-sm font-medium"
                  >
                    预计课程名称
                  </label>
                  <input
                    id="join-course-name"
                    name="courseName"
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                    className={cn(inputClass, "mt-1.5")}
                    placeholder="例如：用 AI 做小红书爆款笔记"
                  />
                </div>
                <div>
                  <label htmlFor="join-price" className="text-sm font-medium">
                    预计售价
                  </label>
                  <input
                    id="join-price"
                    name="price"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className={cn(inputClass, "mt-1.5")}
                    placeholder="例如：199 元"
                  />
                </div>
                <div>
                  <label htmlFor="join-bio" className="text-sm font-medium">
                    个人简介 / 过往经历
                  </label>
                  <textarea
                    id="join-bio"
                    name="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className={cn(textareaClass, "mt-1.5")}
                    placeholder="可写从业背景、作品链接、教学风格等"
                  />
                </div>
                <div>
                  <label htmlFor="join-fans" className="text-sm font-medium">
                    粉丝平台和数量
                  </label>
                  <input
                    id="join-fans"
                    name="fans"
                    value={fans}
                    onChange={(e) => setFans(e.target.value)}
                    className={cn(inputClass, "mt-1.5")}
                    placeholder='例如："小红书2000粉"'
                  />
                </div>
                <Button type="submit" className="w-full sm:w-auto">
                  提交申请
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>

        <section className="pb-4">
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
            常见问题
          </h2>
          <div className="mt-8 space-y-4">
            {FAQ.map((item) => (
              <div
                key={item.q}
                className="rounded-xl border border-border/80 bg-card/40 px-5 py-4 sm:px-6"
              >
                <p className="font-medium text-foreground">{item.q}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
