import * as React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCoursesCatalog } from "@/contexts/CoursesCatalogContext";
import { useToast } from "@/contexts/ToastContext";
import type { Course, CourseCategory, CourseChapter, CourseChapterType } from "@/data/courses";
import { normalizeCourse } from "@/data/courseRuntime";
import { cn } from "@/lib/utils";

const CATEGORY_OPTIONS: { value: CourseCategory; label: string }[] = [
  { value: "money", label: "AI赚钱项目" },
  { value: "prompt", label: "AI提示词" },
  { value: "tools", label: "AI工具教程" },
];

const CHAPTER_TYPE_OPTIONS: { value: CourseChapterType; label: string }[] = [
  { value: "video", label: "视频" },
  { value: "doc", label: "文档" },
  { value: "live", label: "直播" },
  { value: "quiz", label: "测验" },
];

function categoryLabel(cat: CourseCategory): string {
  return CATEGORY_OPTIONS.find((o) => o.value === cat)?.label ?? "AI工具教程";
}

function emptyChapter(): CourseChapter {
  return {
    id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: "",
    duration: "",
    isFree: true,
    type: "video",
  };
}

const fieldClass =
  "flex min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 dark:border-slate-700 dark:bg-slate-900";

export function AdminCourseFormPage() {
  const { courseId } = useParams<{ courseId?: string }>();
  const isEdit = Boolean(courseId);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { courses, setCoursesCatalog } = useCoursesCatalog();

  const existing = courseId ? courses.find((c) => c.id === courseId) : undefined;

  const [title, setTitle] = React.useState("");
  const [subtitle, setSubtitle] = React.useState("");
  const [category, setCategory] = React.useState<CourseCategory>("money");
  const [price, setPrice] = React.useState(199);
  const [originalPrice, setOriginalPrice] = React.useState(399);
  const [isVipFree, setIsVipFree] = React.useState(false);
  const [isHot, setIsHot] = React.useState(false);
  const [isNew, setIsNew] = React.useState(false);
  const [coverEmoji, setCoverEmoji] = React.useState("📚");
  const [instructorName, setInstructorName] = React.useState("");
  const [instructorTitle, setInstructorTitle] = React.useState("");
  const [totalDuration, setTotalDuration] = React.useState("");
  const [chapterCountInput, setChapterCountInput] = React.useState(1);
  const [tagsInput, setTagsInput] = React.useState("");
  const [highlights, setHighlights] = React.useState<string[]>(["", "", "", "", ""]);
  const [samplePrompt, setSamplePrompt] = React.useState("");
  const [chapters, setChapters] = React.useState<CourseChapter[]>([emptyChapter()]);
  const [studentCount, setStudentCount] = React.useState(0);
  const [rating, setRating] = React.useState(4.8);
  const [reviewCount, setReviewCount] = React.useState(3);

  React.useEffect(() => {
    document.title = isEdit ? "编辑课程 - 后台" : "添加课程 - 后台";
  }, [isEdit]);

  React.useEffect(() => {
    if (isEdit) return;
    setTitle("");
    setSubtitle("");
    setCategory("money");
    setPrice(199);
    setOriginalPrice(399);
    setIsVipFree(false);
    setIsHot(false);
    setIsNew(false);
    setCoverEmoji("📚");
    setInstructorName("");
    setInstructorTitle("");
    setTotalDuration("");
    setChapterCountInput(1);
    setTagsInput("");
    setHighlights(["", "", "", "", ""]);
    setSamplePrompt("");
    setChapters([emptyChapter()]);
    setStudentCount(0);
    setRating(4.8);
    setReviewCount(3);
  }, [isEdit]);

  React.useEffect(() => {
    if (!isEdit || !existing) return;
    setTitle(existing.title);
    setSubtitle(existing.subtitle);
    setCategory(existing.category);
    setPrice(existing.price);
    setOriginalPrice(existing.originalPrice);
    setIsVipFree(existing.isVipFree);
    setIsHot(existing.isHot);
    setIsNew(existing.isNew);
    setCoverEmoji(existing.coverEmoji);
    setInstructorName(existing.instructorName);
    setInstructorTitle(existing.instructorTitle);
    setTotalDuration(existing.totalDuration);
    setChapterCountInput(existing.chapterCount);
    setTagsInput(existing.tags.join(", "));
    setHighlights([...existing.highlights]);
    setSamplePrompt(existing.samplePrompt);
    setChapters(existing.chapters.map((c) => ({ ...c })));
    setStudentCount(existing.studentCount);
    setRating(existing.rating);
    setReviewCount(existing.reviewCount);
  }, [isEdit, courseId, existing]);

  if (isEdit && courseId && !existing) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">未找到课程 ID：{courseId}</p>
        <Button variant="outline" asChild>
          <Link to="/admin/courses">返回列表</Link>
        </Button>
      </div>
    );
  }

  function setHighlight(i: number, v: string) {
    setHighlights((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
  }

  function addChapter() {
    setChapters((prev) => [...prev, emptyChapter()]);
  }

  function removeChapter(idx: number) {
    setChapters((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
  }

  function updateChapter(idx: number, patch: Partial<CourseChapter>) {
    setChapters((prev) =>
      prev.map((ch, i) => (i === idx ? { ...ch, ...patch } : ch)),
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = isEdit && courseId ? courseId : `c-${Date.now()}`;
    const tags = tagsInput
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter(Boolean);
    const fixedChapters = chapters.map((ch, i) => ({
      ...ch,
      id: ch.id.startsWith("tmp-") ? `${id}-ch-${i + 1}` : ch.id,
    }));
    const merged: Partial<Course> = {
      ...(existing ?? {}),
      id,
      title: title.trim(),
      subtitle: subtitle.trim(),
      category,
      categoryLabel: categoryLabel(category),
      price: Number(price) || 0,
      originalPrice: Number(originalPrice) || 0,
      isVipFree,
      isHot,
      isNew,
      coverEmoji: coverEmoji.trim() || "📚",
      instructorName: instructorName.trim(),
      instructorTitle: instructorTitle.trim(),
      totalDuration: totalDuration.trim(),
      chapterCount: fixedChapters.length,
      tags,
      highlights: highlights as Course["highlights"],
      samplePrompt,
      chapters: fixedChapters,
      studentCount: Math.max(0, Math.floor(studentCount)),
      rating: Math.min(5, Math.max(1, Number(rating) || 4.8)),
      reviewCount: Math.max(3, Math.floor(reviewCount)),
    };
    const normalized = normalizeCourse(merged);
    let next: Course[];
    if (isEdit) {
      next = courses.map((c) => (c.id === id ? normalized : c));
    } else {
      next = [...courses, normalized];
    }
    setCoursesCatalog(next);
    showToast("保存成功", "success");
    navigate("/admin/courses", { replace: true });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" className="gap-1 px-2" asChild>
          <Link to="/admin/courses">
            <ArrowLeft className="h-4 w-4" />
            返回列表
          </Link>
        </Button>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          {isEdit ? "编辑课程" : "添加课程"}
        </h2>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="border-slate-200 shadow-sm dark:border-slate-800">
          <CardHeader>
            <CardTitle>课程信息</CardTitle>
            <CardDescription>带 * 为必填（标题、副标题、讲师、时长、章节、亮点与提示词）</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">课程标题 *</label>
                <input
                  className={fieldClass}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">副标题 *</label>
                <input
                  className={fieldClass}
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">分类 *</label>
                <select
                  className={fieldClass}
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CourseCategory)}
                >
                  {CATEGORY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">章节数（参考）</label>
                <input
                  type="number"
                  min={1}
                  className={fieldClass}
                  value={chapterCountInput}
                  onChange={(e) => setChapterCountInput(Number(e.target.value) || 1)}
                />
                <p className="text-xs text-muted-foreground">
                  实际以下方「章节列表」条数为准
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">价格 *</label>
                <input
                  type="number"
                  min={0}
                  className={fieldClass}
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">原价 *</label>
                <input
                  type="number"
                  min={0}
                  className={fieldClass}
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(Number(e.target.value))}
                  required
                />
              </div>
              <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:flex-wrap">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isVipFree}
                    onChange={(e) => setIsVipFree(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  是否会员免费
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isHot}
                    onChange={(e) => setIsHot(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  是否热销
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isNew}
                    onChange={(e) => setIsNew(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  是否新课
                </label>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">封面 Emoji *</label>
                <input className={fieldClass} value={coverEmoji} onChange={(e) => setCoverEmoji(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">总时长 *</label>
                <input
                  className={fieldClass}
                  placeholder='如 "18小时20分"'
                  value={totalDuration}
                  onChange={(e) => setTotalDuration(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">讲师名称 *</label>
                <input
                  className={fieldClass}
                  value={instructorName}
                  onChange={(e) => setInstructorName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">讲师头衔 *</label>
                <input
                  className={fieldClass}
                  value={instructorTitle}
                  onChange={(e) => setInstructorTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">标签（逗号分隔）</label>
                <input
                  className={fieldClass}
                  placeholder="副业, SOP, 报价"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">学员数（编辑用）</label>
                <input
                  type="number"
                  min={0}
                  className={fieldClass}
                  value={studentCount}
                  onChange={(e) => setStudentCount(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">评分 1–5</label>
                <input
                  type="number"
                  step="0.1"
                  min={1}
                  max={5}
                  className={fieldClass}
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">评价总数</label>
                <input
                  type="number"
                  min={3}
                  className={fieldClass}
                  value={reviewCount}
                  onChange={(e) => setReviewCount(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">课程亮点（5 条）*</p>
              {highlights.map((h, i) => (
                <input
                  key={i}
                  className={fieldClass}
                  value={h}
                  onChange={(e) => setHighlight(i, e.target.value)}
                  placeholder={`亮点 ${i + 1}`}
                  required
                />
              ))}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">示例提示词 samplePrompt *</label>
              <textarea
                className={cn(fieldClass, "min-h-[140px] resize-y py-3 leading-relaxed")}
                value={samplePrompt}
                onChange={(e) => setSamplePrompt(e.target.value)}
                required
              />
            </div>

            <div className="space-y-3 border-t border-slate-200 pt-6 dark:border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">章节列表 *</p>
                <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addChapter}>
                  <Plus className="h-4 w-4" />
                  添加章节
                </Button>
              </div>
              <div className="space-y-4">
                {chapters.map((ch, idx) => (
                  <div
                    key={ch.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">
                        第 {idx + 1} 章
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-red-600 hover:text-red-700"
                        onClick={() => removeChapter(idx)}
                        disabled={chapters.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-xs text-muted-foreground">标题</label>
                        <input
                          className={fieldClass}
                          value={ch.title}
                          onChange={(e) => updateChapter(idx, { title: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">时长</label>
                        <input
                          className={fieldClass}
                          value={ch.duration}
                          onChange={(e) => updateChapter(idx, { duration: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">类型</label>
                        <select
                          className={fieldClass}
                          value={ch.type}
                          onChange={(e) =>
                            updateChapter(idx, { type: e.target.value as CourseChapterType })
                          }
                        >
                          {CHAPTER_TYPE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <label className="flex cursor-pointer items-center gap-2 text-sm sm:col-span-2">
                        <input
                          type="checkbox"
                          checked={ch.isFree}
                          onChange={(e) => updateChapter(idx, { isFree: e.target.checked })}
                        />
                        是否免费（试看）
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-6 dark:border-slate-800">
              <Button type="submit" size="lg">
                保存课程
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link to="/admin/courses">取消</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
