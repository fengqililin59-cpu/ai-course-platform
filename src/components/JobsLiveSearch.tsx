import * as React from "react";
import { Link } from "react-router-dom";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { jobsSearchUrl, type JobSearchItem } from "@/lib/jobsSearchApi";
import { formatCoursePrice } from "@/data/courses";
import { useToast } from "@/contexts/ToastContext";

const CITIES = ["全国", "北京", "上海", "深圳", "杭州", "广州", "成都"] as const;

export function JobsLiveSearch() {
  const { showToast } = useToast();
  const [keyword, setKeyword] = React.useState("");
  const [city, setCity] = React.useState<string>("全国");
  const [page, setPage] = React.useState(1);
  const [jobs, setJobs] = React.useState<JobSearchItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [source, setSource] = React.useState<string>("");
  const [degraded, setDegraded] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  async function runSearch(nextPage = 1) {
    const k = keyword.trim();
    if (k.length < 2) {
      showToast("请输入至少 2 个字的搜索关键词", "error");
      return;
    }
    setLoading(true);
    try {
      const url = jobsSearchUrl(k, city, nextPage);
      const res = await fetch(url);
      const data = (await res.json().catch(() => ({}))) as {
        jobs?: JobSearchItem[];
        total?: number;
        source?: string;
        degraded?: boolean;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || `请求失败（${res.status}）`);
      }
      const list = Array.isArray(data.jobs) ? data.jobs : [];
      if (nextPage <= 1) {
        setJobs(list);
      } else {
        setJobs((prev) => {
          const seen = new Set(prev.map((j) => j.id));
          const merged = [...prev];
          for (const j of list) {
            if (!seen.has(j.id)) {
              seen.add(j.id);
              merged.push(j);
            }
          }
          return merged;
        });
      }
      setTotal(typeof data.total === "number" ? data.total : 0);
      setSource(String(data.source || ""));
      setDegraded(Boolean(data.degraded));
      setPage(nextPage);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "搜索失败";
      showToast(msg, "error");
      setJobs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  const sourceLabel =
    source === "zhidekan"
      ? "职得看"
      : source === "liepin"
        ? "猎聘"
        : source === "static_fallback"
          ? "本地示例"
          : source || "—";

  return (
    <section className="rounded-xl border border-border/70 bg-card/50 p-6 shadow-sm sm:p-8">
      <h2 className="text-xl font-bold tracking-tight sm:text-2xl">实时岗位搜索</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        数据由职得看聚合 API 为主、猎聘企业版为备；未配置密钥时将返回示例岗位。结果缓存约 30
        分钟。
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <input
          type="search"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void runSearch(1);
          }}
          placeholder="例如：提示词工程师、Cursor、AI 产品"
          className="min-h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="搜索关键词"
        />
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="min-h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-36"
          aria-label="城市"
        >
          {CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <Button
          type="button"
          className="gap-2 sm:w-auto"
          disabled={loading}
          onClick={() => void runSearch(1)}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Search className="h-4 w-4" aria-hidden />
          )}
          搜索
        </Button>
      </div>

      {degraded ? (
        <p className="mt-4 text-xs text-amber-700 dark:text-amber-300">
          当前为降级数据（上游不可用或仅配置了示例），配置 ZHIDEKAN_API_KEY 后可拉取真实岗位。
        </p>
      ) : null}

      {loading ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">加载中…</p>
      ) : null}

      {!loading && jobs.length === 0 && keyword.trim().length >= 2 ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          未找到相关岗位，可尝试更换关键词或城市。
        </p>
      ) : null}

      {!loading && jobs.length > 0 ? (
        <ul className="mt-8 space-y-4">
          {jobs.map((job) => (
            <li
              key={job.id}
              className="rounded-lg border border-border/60 bg-background/80 p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold leading-snug text-foreground">
                    {job.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {job.company}
                    {job.city ? ` · ${job.city}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-base font-semibold text-primary">
                  {job.salary}
                </span>
              </div>
              {job.description ? (
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                  {job.description}
                </p>
              ) : null}
              {job.skills?.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {job.skills.map((s) => (
                    <span
                      key={`${job.id}-${s}`}
                      className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              ) : null}
              {job.relatedCourses && job.relatedCourses.length > 0 ? (
                <div className="mt-3 border-t border-border/50 pt-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    站内推荐课程
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {job.relatedCourses.map((course) => (
                      <Link
                        key={`${job.id}-c-${course.id}`}
                        to={course.url}
                        className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-violet-500/25 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-800 transition hover:bg-violet-500/15 dark:text-violet-200 dark:hover:bg-violet-500/20"
                      >
                        <span className="truncate">{course.title}</span>
                        <span className="shrink-0 tabular-nums opacity-80">
                          {formatCoursePrice(course.price)}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-3 text-xs text-muted-foreground">
                <span>
                  来源：{sourceLabel}
                  {job.source === "static" ? "（示例）" : ""}
                </span>
                {job.url && job.url !== "#" ? (
                  <a
                    href={job.url}
                    target="_blank"
                    rel="nofollow noopener noreferrer"
                    className="font-medium text-primary hover:underline"
                  >
                    查看详情 →
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {!loading && jobs.length > 0 && total > jobs.length ? (
        <div className="mt-6 flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void runSearch(page + 1)}
          >
            加载更多（第 {page + 1} 页）
          </Button>
        </div>
      ) : null}

      <p className="mt-8 border-t border-border/60 pt-4 text-[11px] leading-relaxed text-muted-foreground">
        数据来源于职得看、猎聘等授权合作伙伴及公开渠道聚合，仅作技能趋势与岗位参考；本站不存储您的简历信息。点击外链为
        nofollow，请在合作方站点内完成投递。
      </p>
    </section>
  );
}
