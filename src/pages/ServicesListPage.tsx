import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { BookOpen, Search, Send, Sparkles, X, XCircle } from "lucide-react";
import {
  listServiceOffers,
  SERVICE_FILTERS,
  serviceFilterFromSearch,
  type ServiceFilterId,
  type ServiceListing,
} from "@/data/services";
import { CourseCard } from "@/components/CourseCard";
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

function matchesSearch(offer: ServiceListing, raw: string): boolean {
  const q = raw.trim().toLowerCase();
  if (!q) return true;
  if (offer.title.toLowerCase().includes(q)) return true;
  return offer.tags.some((t) => t.toLowerCase().includes(q));
}

function countLabel(
  category: ServiceFilterId,
  queryTrim: string,
  count: number,
): string {
  if (queryTrim) {
    return `搜索「${queryTrim}」· 共 ${count} 项服务`;
  }
  if (category !== "all") {
    const label = SERVICE_FILTERS.find((f) => f.id === category)?.label ?? "";
    return `${label} · 共 ${count} 项服务`;
  }
  return `全部服务 · 共 ${count} 项`;
}

export function ServicesListPage() {
  const { showToast } = useToast();

  React.useEffect(() => {
    document.title = "AI 定制服务 - AIlearn Pro";
  }, []);

  const [searchParams, setSearchParams] = useSearchParams();
  const category = serviceFilterFromSearch(searchParams.get("category"));
  const [query, setQuery] = React.useState("");

  const [reqName, setReqName] = React.useState("");
  const [reqContact, setReqContact] = React.useState("");
  const [reqType, setReqType] = React.useState<string>(NEED_TYPE_OPTIONS[0].value);
  const [reqBudget, setReqBudget] = React.useState<string>(BUDGET_OPTIONS[0].value);
  const [reqDesc, setReqDesc] = React.useState("");

  const setCategory = React.useCallback(
    (id: ServiceFilterId) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (id === "all") next.delete("category");
          else next.set("category", id);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const all = listServiceOffers();
  const byCategory =
    category === "all"
      ? all
      : all.filter((s) => s.filter === category);

  const filtered = React.useMemo(
    () => byCategory.filter((s) => matchesSearch(s, query)),
    [byCategory, query],
  );

  const queryTrim = query.trim();
  const hasCategoryFilter = category !== "all";
  const hasSearch = queryTrim.length > 0;
  const showFilterChips = hasCategoryFilter || hasSearch;

  const inputClass =
    "flex h-10 w-full rounded-md border border-input bg-background py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

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
    showToast("提交成功", "success");
    setReqName("");
    setReqContact("");
    setReqType(NEED_TYPE_OPTIONS[0].value);
    setReqBudget(BUDGET_OPTIONS[0].value);
    setReqDesc("");
  }

  return (
    <main className="mx-auto min-w-0 max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          AI 定制服务
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">AI 定制服务</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          把 AI 能力变成你的产品，支持企业对公合作
        </p>
      </div>

      <div
        className="mt-8 flex flex-wrap gap-2 rounded-xl border border-border/80 bg-muted/40 p-1.5 sm:inline-flex sm:flex-nowrap"
        role="tablist"
        aria-label="服务分类"
      >
        {SERVICE_FILTERS.map((f) => {
          const selected = category === f.id;
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setCategory(f.id)}
              className={cn(
                "relative min-h-10 rounded-lg px-4 py-2.5 text-sm font-medium transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                selected
                  ? "bg-background text-foreground shadow-md ring-2 ring-primary/60"
                  : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-stretch">
        <div className="relative min-w-0 flex-1 max-w-lg">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索服务名称或标签…"
            className={cn(inputClass, "pl-10", queryTrim ? "pr-10" : "pr-3")}
            aria-label="搜索服务"
          />
          {queryTrim !== "" && (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => setQuery("")}
              aria-label="清空搜索"
            >
              <XCircle className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {showFilterChips ? (
        <div className="mt-4 flex min-w-0 flex-wrap gap-2" aria-label="已选筛选">
          {hasCategoryFilter ? (
            <button
              type="button"
              onClick={() => setCategory("all")}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-secondary/80 px-3 py-1 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary"
            >
              <span className="truncate">
                {SERVICE_FILTERS.find((f) => f.id === category)?.label}
              </span>
              <X className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
              <span className="sr-only">清除分类</span>
            </button>
          ) : null}
          {hasSearch ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-secondary/80 px-3 py-1 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary"
            >
              <span className="truncate">搜索: {queryTrim}</span>
              <X className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
              <span className="sr-only">清除搜索</span>
            </button>
          ) : null}
        </div>
      ) : null}

      <p className="mt-4 text-sm font-medium text-foreground">
        {countLabel(category, queryTrim, filtered.length)}
      </p>

      {filtered.length === 0 ? (
        <Card className="mt-8 border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground" aria-hidden />
            <p className="text-base font-medium text-foreground">没有找到相关服务</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              请尝试更换关键词，或清空搜索后重新浏览。
            </p>
            {queryTrim !== "" && (
              <Button type="button" variant="secondary" onClick={() => setQuery("")}>
                清除搜索
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div
          id="cases"
          className="mt-6 scroll-mt-28 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3"
        >
          {filtered.map((offer) => (
            <CourseCard
              key={offer.id}
              service={offer}
              highlightKeyword={queryTrim || undefined}
            />
          ))}
        </div>
      )}

      <section
        id="success-cases"
        aria-labelledby="success-cases-heading"
        className="mt-20 scroll-mt-24 border-t border-border/50 pt-16"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Portfolio
            </p>
            <h2
              id="success-cases-heading"
              className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl"
            >
              成功案例
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              真实交付节选（已脱敏），覆盖企业与个人客户，网站与小程序双线能力。
            </p>
          </div>
          <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-border/80 bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground sm:inline-flex">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" aria-hidden />
            持续更新案例库
          </span>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SUCCESS_CASES.map((item) => (
            <Card
              key={item.id}
              className="flex h-full flex-col overflow-hidden border-border/70 bg-card/80 shadow-sm transition-shadow hover:shadow-md"
            >
              <CardHeader className="space-y-3 pb-3">
                <div className="flex flex-wrap gap-1.5">
                  {item.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-[11px] font-normal text-foreground/85"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
                <CardTitle className="text-lg font-semibold leading-snug tracking-tight">
                  {item.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="mt-auto flex flex-1 flex-col gap-4 border-t border-border/50 pt-4 text-sm">
                <dl className="space-y-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <dt className="shrink-0 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      客户类型
                    </dt>
                    <dd>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs font-medium",
                          item.clientType === "企业"
                            ? "border-violet-500/35 bg-violet-500/10 text-violet-900 dark:text-violet-100"
                            : "border-sky-500/35 bg-sky-500/10 text-sky-900 dark:text-sky-100",
                        )}
                      >
                        {item.clientType}
                      </Badge>
                    </dd>
                  </div>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <dt className="shrink-0 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      做了什么
                    </dt>
                    <dd className="text-right font-medium text-foreground">{item.deliverable}</dd>
                  </div>
                  <div className="rounded-lg bg-muted/50 px-3 py-2.5">
                    <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      结果
                    </dt>
                    <dd className="mt-1.5 text-[13px] leading-relaxed text-foreground/90">
                      {item.outcome}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section
        id="request-form"
        aria-labelledby="request-form-title"
        className="mt-20 scroll-mt-24 border-t border-border/50 pt-16"
      >
        <div className="mx-auto flex max-w-lg flex-col items-center">
          <p className="text-center text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Get started
          </p>
          <h2
            id="request-form-title"
            className="mt-2 text-center text-2xl font-semibold tracking-tight text-foreground sm:text-[1.65rem]"
          >
            需求提交
          </h2>
          <p className="mt-2 max-w-md text-center text-sm leading-relaxed text-muted-foreground">
            填写后我们将在 1 个工作日内与您联系。信息仅用于需求沟通，不会用于其他用途。
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
                        className={cn(formFieldClass, "h-10 cursor-pointer appearance-none bg-[length:1rem] bg-[right_0.65rem_center] bg-no-repeat pr-10")}
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
                        className={cn(formFieldClass, "h-10 cursor-pointer appearance-none bg-[length:1rem] bg-[right_0.65rem_center] bg-no-repeat pr-10")}
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
        </div>
      </section>
    </main>
  );
}
