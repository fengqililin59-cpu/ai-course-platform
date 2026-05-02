import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useToast } from "@/contexts/ToastContext";
import { cn } from "@/lib/utils";
import { CreatorLayout } from "./CreatorOverviewPage";

const inputClass =
  "flex min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

type Course = {
  id: number;
  title: string;
  price: number;
  status: "draft" | "pending" | "published" | "offline";
  students: number;
  earnings: number;
  createdAt: string;
  coverUrl?: string;
};

const STATUS_MAP = {
  draft: { label: "草稿", className: "bg-muted text-muted-foreground" },
  pending: { label: "审核中", className: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
  published: { label: "已上架", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" },
  offline: { label: "已下架", className: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400" },
};

export function CreatorCoursesPage() {
  const { showToast } = useToast();
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showForm, setShowForm] = React.useState(false);

  React.useEffect(() => {
    document.title = "课程管理 - 创作者中心";
    fetchCourses();
  }, []);

  async function fetchCourses() {
    const token = localStorage.getItem("creator_token");
    try {
      const res = await fetch("/api/creator/courses", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setCourses(data.data);
    } catch {
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleStatus(course: Course) {
    const token = localStorage.getItem("creator_token");
    const newStatus = course.status === "published" ? "offline" : "published";
    try {
      const res = await fetch(`/api/creator/courses/${course.id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setCourses((prev) =>
          prev.map((c) => (c.id === course.id ? { ...c, status: newStatus } : c))
        );
        showToast(newStatus === "published" ? "课程已上架" : "课程已下架", "success");
      }
    } catch {
      showToast("操作失败，请重试", "error");
    }
  }

  return (
    <CreatorLayout activeKey="courses">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">课程管理</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              管理你的所有课程，上架、下架或编辑内容
            </p>
          </div>
          <Button onClick={() => setShowForm(true)}>
            + 新建课程
          </Button>
        </div>

        {showForm && (
          <CreateCourseForm
            onSuccess={() => {
              setShowForm(false);
              fetchCourses();
              showToast("课程已提交审核", "success");
            }}
            onCancel={() => setShowForm(false)}
          />
        )}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl border border-border/60 bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 py-16 text-center">
            <p className="text-4xl">📚</p>
            <p className="mt-3 font-medium">还没有课程</p>
            <p className="mt-1 text-sm text-muted-foreground">点击「新建课程」开始创建你的第一门课</p>
            <Button className="mt-4" onClick={() => setShowForm(true)}>
              新建课程
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                onToggle={() => handleToggleStatus(course)}
              />
            ))}
          </div>
        )}
      </div>
    </CreatorLayout>
  );
}

function CourseCard({
  course,
  onToggle,
}: {
  course: Course;
  onToggle: () => void;
}) {
  const status = STATUS_MAP[course.status];
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-card/60 p-4 shadow-sm">
      {/* 封面占位 */}
      <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-lg bg-muted text-2xl overflow-hidden">
        {course.coverUrl ? (
          <img src={course.coverUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          "📖"
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium">{course.title}</p>
          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", status.className)}>
            {status.label}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-muted-foreground">
          <span>¥{course.price}</span>
          <span>{course.students} 名学员</span>
          <span>收益 ¥{course.earnings.toFixed(2)}</span>
          <span>{course.createdAt}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <a href={`/creator/courses/${course.id}/edit`}>
          <Button variant="outline" size="sm">编辑</Button>
        </a>
        {(course.status === "published" || course.status === "offline") && (
          <Button
            variant="outline"
            size="sm"
            onClick={onToggle}
            className={course.status === "published" ? "text-rose-600 hover:text-rose-600" : ""}
          >
            {course.status === "published" ? "下架" : "上架"}
          </Button>
        )}
      </div>
    </div>
  );
}

function CreateCourseForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [videoUrl, setVideoUrl] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const { showToast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !price.trim()) {
      showToast("请填写课程名称和价格", "error");
      return;
    }
    setSubmitting(true);
    const token = localStorage.getItem("creator_token");
    try {
      const res = await fetch("/api/creator/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          price: parseFloat(price),
          description: description.trim(),
          videoUrl: videoUrl.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        onSuccess();
      } else {
        showToast(data.message || "提交失败", "error");
      }
    } catch {
      showToast("网络错误，请重试", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="border-emerald-500/30 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">新建课程</CardTitle>
        <CardDescription>提交后将进入审核，审核通过后自动上架</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="text-sm font-medium">课程名称</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={cn(inputClass, "mt-1.5")}
              placeholder="例如：用 AI 做小红书爆款笔记"
            />
          </div>
          <div>
            <label className="text-sm font-medium">售价（元）</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={cn(inputClass, "mt-1.5")}
              placeholder="例如：199"
            />
          </div>
          <div>
            <label className="text-sm font-medium">课程简介</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={cn(
                inputClass,
                "mt-1.5 min-h-[100px] resize-y"
              )}
              placeholder="描述课程内容、适合人群、学完能做什么..."
            />
          </div>
          <div>
            <label className="text-sm font-medium">课程视频链接</label>
            <input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className={cn(inputClass, "mt-1.5")}
              placeholder="腾讯视频/优酷/OSS 链接"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="submit" disabled={submitting}>
              {submitting ? "提交中..." : "提交审核"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              取消
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
