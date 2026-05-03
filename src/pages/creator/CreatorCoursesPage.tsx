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
  updateCreatorCourse,
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
  const [createTags, setCreateTags] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const [edit, setEdit] = React.useState<{
    id: string;
    title: string;
    priceYuan: string;
    summary: string;
    tags: string;
    videoUrl: string;
  } | null>(null);
  const [editSaving, setEditSaving] = React.useState(false);

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
        tags: createTags.trim() || undefined,
      });
      await load();
      setTitle("");
      setPriceYuan("");
      setSummary("");
      setCreateTags("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "创建失败");
    } finally {
      setSubmitting(false);
    }
  }

  function openEdit(row: CreatorCourseRow) {
    setEdit({
      id: row.id,
      title: row.title,
      priceYuan: String(row.priceYuan),
      summary: row.description,
      tags: row.tags,
      videoUrl: row.videoUrl,
    });
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!edit) return;
    const price = Number(edit.priceYuan);
    if (!edit.title.trim() || Number.isNaN(price)) return;
    setEditSaving(true);
    setError("");
    try {
      await updateCreatorCourse(edit.id, {
        title: edit.title.trim(),
        priceYuan: price,
        summary: edit.summary.trim() || undefined,
        tags: edit.tags.trim() || undefined,
        videoUrl: edit.videoUrl.trim() || undefined,
      });
      await load();
      setEdit(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setEditSaving(false);
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
              <label htmlFor="cc-tags" className="text-sm font-medium">
                标签（选填，逗号分隔）
              </label>
              <input
                id="cc-tags"
                type="text"
                value={createTags}
                onChange={(e) => setCreateTags(e.target.value)}
                className={cn(inputClass, "mt-1.5")}
                placeholder="例如：ChatGPT, Python, 提示词"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                用于就业雷达岗位与课程的匹配推荐；多个标签建议用英文逗号分隔。
              </p>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "提交中…" : "创建课程"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {edit ? (
        <Card className="border-slate-200 shadow-sm dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg">编辑课程</CardTitle>
            <CardDescription>
              保存将调用 PUT /api/creator/courses/{edit.id}（含标签与视频链接）
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => void handleEditSave(e)}>
              <div className="sm:col-span-2">
                <label htmlFor="ce-title" className="text-sm font-medium">
                  课程名称
                </label>
                <input
                  id="ce-title"
                  value={edit.title}
                  onChange={(e) => setEdit((s) => (s ? { ...s, title: e.target.value } : s))}
                  className={cn(inputClass, "mt-1.5")}
                  required
                  minLength={2}
                />
              </div>
              <div>
                <label htmlFor="ce-price" className="text-sm font-medium">
                  售价（元）
                </label>
                <input
                  id="ce-price"
                  inputMode="decimal"
                  value={edit.priceYuan}
                  onChange={(e) =>
                    setEdit((s) => (s ? { ...s, priceYuan: e.target.value } : s))
                  }
                  className={cn(inputClass, "mt-1.5")}
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="ce-sum" className="text-sm font-medium">
                  简介
                </label>
                <textarea
                  id="ce-sum"
                  value={edit.summary}
                  onChange={(e) =>
                    setEdit((s) => (s ? { ...s, summary: e.target.value } : s))
                  }
                  className={cn(inputClass, "mt-1.5 min-h-[88px] resize-y")}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="ce-tags" className="text-sm font-medium">
                  标签（逗号分隔）
                </label>
                <input
                  id="ce-tags"
                  type="text"
                  value={edit.tags}
                  onChange={(e) => setEdit((s) => (s ? { ...s, tags: e.target.value } : s))}
                  className={cn(inputClass, "mt-1.5")}
                  placeholder="例如：ChatGPT, Python, 提示词"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  用于就业雷达岗位与课程的匹配推荐。
                </p>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="ce-video" className="text-sm font-medium">
                  视频链接（选填）
                </label>
                <input
                  id="ce-video"
                  type="url"
                  inputMode="url"
                  value={edit.videoUrl}
                  onChange={(e) =>
                    setEdit((s) => (s ? { ...s, videoUrl: e.target.value } : s))
                  }
                  className={cn(inputClass, "mt-1.5")}
                  placeholder="https://..."
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  试看或完整视频地址，将写入课程库的 video_url 字段。
                </p>
              </div>
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                <Button type="submit" disabled={editSaving}>
                  {editSaving ? "保存中…" : "保存修改"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={editSaving}
                  onClick={() => setEdit(null)}
                >
                  取消
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

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
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => openEdit(c)}
                          >
                            编辑
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void toggleStatus(c)}
                          >
                            {c.status === "published" ? "下架" : "上架"}
                          </Button>
                        </div>
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
