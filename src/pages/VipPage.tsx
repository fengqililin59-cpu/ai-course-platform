import * as React from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/contexts/ToastContext";

const plans = [
  {
    id: "month",
    name: "月会员",
    price: "¥99",
    period: "/月",
    original: "¥199",
    badge: null as string | null,
    highlight: false,
  },
  {
    id: "year",
    name: "年会员",
    price: "¥699",
    period: "/年",
    original: "¥1999",
    badge: "最受欢迎",
    highlight: true,
  },
  {
    id: "lifetime",
    name: "永久会员",
    price: "¥1999",
    period: "",
    original: "¥5999",
    badge: "超值推荐",
    highlight: false,
  },
] as const;

const benefits = [
  "全部课程免费学习",
  "新课上线优先通知",
  "专属会员社群",
  "讲师一对一答疑（每月1次）",
  "课程证书（完课后颁发）",
];

export function VipPage() {
  const { showToast } = useToast();

  React.useEffect(() => {
    document.title = "开通会员 - AIlearn Pro";
  }, []);

  function handleSubscribe() {
    showToast("功能开发中，敬请期待 🚀", "info");
  }

  return (
    <main className="mx-auto min-w-0 max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mx-auto max-w-2xl text-center">
        <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          开通会员，解锁全部课程
        </h1>
        <p className="mt-3 text-pretty text-base text-muted-foreground sm:text-lg">
          一次开通，永久学习，持续更新
        </p>
      </header>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={cn(
              "relative flex flex-col overflow-hidden border-border/80 transition-shadow",
              plan.highlight &&
                "border-primary/50 bg-gradient-to-b from-primary/[0.08] via-card to-card shadow-md ring-2 ring-primary/35 md:scale-[1.02] md:shadow-lg",
              !plan.highlight && "hover:shadow-md",
            )}
          >
            {plan.badge ? (
              <div className="absolute right-3 top-3 z-10">
                <Badge
                  className={cn(
                    "font-semibold shadow-sm",
                    plan.highlight
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-amber-500 text-white hover:bg-amber-500/90",
                  )}
                >
                  {plan.badge}
                </Badge>
              </div>
            ) : null}
            <CardHeader className={cn(plan.badge && "pt-12")}>
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <CardDescription className="sr-only">
                {plan.name}套餐价格
              </CardDescription>
              <div className="mt-4 flex flex-wrap items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-foreground">
                  {plan.price}
                  {plan.period ? (
                    <span className="text-lg font-semibold text-muted-foreground">
                      {plan.period}
                    </span>
                  ) : null}
                </span>
                <span className="text-base text-muted-foreground line-through">
                  {plan.original}
                </span>
              </div>
            </CardHeader>
            <CardFooter className="mt-auto w-full">
              <Button
                type="button"
                className="w-full"
                variant={plan.highlight ? "default" : "outline"}
                onClick={handleSubscribe}
              >
                立即开通
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <section className="mt-14 sm:mt-16">
        <h2 className="text-center text-lg font-semibold tracking-tight sm:text-xl">
          会员权益
        </h2>
        <Card className="mx-auto mt-6 max-w-2xl border-border/80">
          <CardContent className="space-y-4 p-6 sm:p-8">
            <ul className="space-y-3 text-sm sm:text-base">
              {benefits.map((text) => (
                <li key={text} className="flex gap-3 text-foreground">
                  <Check
                    className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                    aria-hidden
                  />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
