import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { BookOpen, Search, X, XCircle } from "lucide-react";
import { useCoursesCatalog } from "@/contexts/CoursesCatalogContext";
import { type CourseCategory, type Course } from "@/data/courses";
import { CourseCard } from "@/components/CourseCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const filters: { id: "all" | CourseCategory; label: string }[] = [
  { id: "all", label: "全部课程" },
  { id: "money", label: "AI赚钱项目" },
  { id: "prompt", label: "AI提示词" },
  { id: "tools", label: "AI工具教程" },
];

const VALID: Set<string> = new Set(["money", "prompt", "tools"]);

type SortOption =
  | "default"
  | "newest"
  | "rating"
  | "priceAsc"
  | "priceDesc";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "default", label: "综合排序" },
  { value: "newest", label: "最新上线" },
  { value: "rating", label: "评分最高" },
  { value: "priceAsc", label: "价格从低到高" },
  { value: "priceDesc", label: "价格从高到低" },
];

function categoryFromSearch(value: string | null): "all" | CourseCategory {
  if (value && VALID.has(value)) return value as CourseCategory;
  return "all";
}

function matchesSearch(course: Course, raw: string): boolean {
  const q = raw.trim().toLowerCase();
  if (!q) return true;
  if (course.title.toLowerCase().includes(q)) return true;
  return course.tags.some((t) => t.toLowerCase().includes(q));
}

function sortCourses(list: Course[], sortBy: SortOption): Course[] {
  const arr = [...list];
  switch (sortBy) {
    case "newest":
      return arr.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    case "rating":
      return arr.sort((a, b) => b.rating - a.rating);
    case "priceAsc":
      return arr.sort((a, b) => a.price - b.price);
    case "priceDesc":
      return arr.sort((a, b) => b.price - a.price);
    default:
      return arr;
  }
}

function countLabel(
  category: "all" | CourseCategory,
  queryTrim: string,
  count: number,
): string {
  if (queryTrim) {
    return `搜索"${queryTrim}" · 找到 ${count} 门课程`;
  }
  if (category !== "all") {
    const label = filters.find((f) => f.id === category)?.label ?? "";
    return `${label} · 共 ${count} 门课程`;
  }
  return `全部课程 · 共 ${count} 门课程`;
}

export function CourseListPage() {
  const { courses: COURSES } = useCoursesCatalog();

  React.useEffect(() => {
    document.title = "全部课程 - AIlearn Pro";
  }, []);

  const [searchParams, setSearchParams] = useSearchParams();
  const category = categoryFromSearch(searchParams.get("category"));
  const [query, setQuery] = React.useState("");
  const [sortBy, setSortBy] = React.useState<SortOption>("default");

  const setCategory = React.useCallback(
    (id: "all" | CourseCategory) => {
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

  const byCategory =
    category === "all"
      ? COURSES
      : COURSES.filter((c) => c.category === category);

  const filtered = React.useMemo(
    () => byCategory.filter((c) => matchesSearch(c, query)),
    [byCategory, query],
  );

  const sorted = React.useMemo(
    () => sortCourses(filtered, sortBy),
    [filtered, sortBy],
  );

  const queryTrim = query.trim();
  const hasCategoryFilter = category !== "all";
  const hasSearch = queryTrim.length > 0;
  const showFilterChips = hasCategoryFilter || hasSearch;

  const inputClass =
    "flex h-10 w-full rounded-md border border-input bg-background py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

  const selectClass = cn(
    inputClass,
    "min-w-0 cursor-pointer appearance-none bg-[length:1rem] bg-[right_0.5rem_center] bg-no-repeat pr-9 sm:w-[11rem]",
  );

  return (
    <main className="mx-auto min-w-0 max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          全部课程
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">选课学习</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          支持按分类与关键词筛选、排序，点击课程卡片进入详情页。
        </p>
      </div>

      {/* 分类 Tab — URL ?category= */}
      <div
        className="mt-8 flex flex-wrap gap-2 rounded-xl border border-border/80 bg-muted/40 p-1.5 sm:inline-flex sm:flex-nowrap"
        role="tablist"
        aria-label="课程分类"
      >
        {filters.map((f) => {
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

      {/* 搜索 + 排序 */}
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
            placeholder="搜索课程标题或标签…"
            className={cn(inputClass, "pl-10", queryTrim ? "pr-10" : "pr-3")}
            aria-label="搜索课程"
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
        <div className="relative w-full shrink-0 sm:w-auto sm:self-stretch">
          <select
            aria-label="排序方式"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className={selectClass}
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
            }}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
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
                {filters.find((f) => f.id === category)?.label}
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
        {countLabel(category, queryTrim, sorted.length)}
      </p>

      {sorted.length === 0 ? (
        <Card className="mt-8 border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground" aria-hidden />
            <p className="text-base font-medium text-foreground">
              没有找到相关课程
            </p>
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
        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {sorted.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              highlightKeyword={queryTrim || undefined}
            />
          ))}
        </div>
      )}
    </main>
  );
}
