import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  createCreatorCourse,
  fetchCreatorCourses,
  updateCreatorCourseStatus,
  type CreatorCourseRow,
} from "@/lib/creatorApi";

const inputClass =
  "flex min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export function CreatorCoursesPage() {
  const [list, setList] = React.useState<CreatorCourseRow[]>([]);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [title, setTitle] = React.useState("");
  const [priceYuan, setPriceYuan] = React.useState("");
  const [summary, setSummary] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    document.title = "课程管理 - 创作者中心";
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const courses = await fetchCreatorCourses();
      setList(courses);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const price = Number(priceYuan);
      await createCreatorCourse({
        title: title.trim(),
        priceYuan: price,
        summary: summary.trim() || undefined,
      });
      await load();
      setTitle("");
      setPriceYuan("");
      setSummary("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "创建失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleStatus(row: CreatorCourseRow) {
    const next = row.status === "published" ? "offline" : "published";
    try {
      await updateCreatorCourseStatus(row.id, next);
      setList((prev) =>
        prev.map((c) => (c.id === row.id ? { ...c, status: next } : c)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "更新失败");
    }
  }

  function statusLabel(s: CreatorCourseRow["status"]) {
    if (s === "published") return "已上架";
    if (s === "offline") return "已下架";
    if (s === "pending") return "待审核";
    return "草稿";
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          课程管理
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          新建课程默认为草稿，上架后对用户可见（需后端与前台目录打通后生效）。
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}

      <Card className="border-slate-200 shadow-sm dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg">新建课程</CardTitle>
          <CardDescription>提交到 POST /api/creator/courses</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleCreate}>
            <div className="sm:col-span-2">
              <label htmlFor="cc-title" className="text-sm font-medium">
                课程名称
              </label>
              <input
                id="cc-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={cn(inputClass, "mt-1.5")}
                placeholder="例如：AI 小红书起号实战"
                required
                minLength={2}
              />
            </div>
            <div>
              <label htmlFor="cc-price" className="text-sm font-medium">
                售价（元）
              </label>
              <input
                id="cc-price"
                inputMode="decimal"
                value={priceYuan}
                onChange={(e) => setPriceYuan(e.target.value)}
                className={cn(inputClass, "mt-1.5")}
                placeholder="199"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="cc-sum" className="text-sm font-medium">
                简介（选填）
              </label>
              <textarea
                id="cc-sum"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className={cn(inputClass, "mt-1.5 min-h-[88px] resize-y")}
                placeholder="一句话介绍课程价值"
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "提交中…" : "创建课程"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm dark:border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">我的课程</CardTitle>
          <CardDescription>上下架调用 PUT /api/creator/courses/:id/status</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 sm:p-6 sm:pt-0">
          {loading ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              加载中…
            </p>
          ) : (
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/50">
                  <th className="px-4 py-3 font-medium text-muted-foreground">标题</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">售价</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">销量</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">状态</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">操作</th>
                </tr>
              </thead>
              <tbody>
                {list.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      暂无课程，请在上方新建
                    </td>
                  </tr>
                ) : (
                  list.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-slate-100 transition hover:bg-slate-50/80 dark:border-slate-800/80 dark:hover:bg-slate-900/40"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium">{c.title}</p>
                        <p className="text-xs text-muted-foreground">{c.id}</p>
                      </td>
                      <td className="px-4 py-3 tabular-nums">¥{c.priceYuan}</td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">
                        {c.salesCount}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={c.status === "published" ? "default" : "secondary"}
                          className="font-normal"
                        >
                          {statusLabel(c.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void toggleStatus(c)}
                        >
                          {c.status === "published" ? "下架" : "上架"}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
