import * as React from "react";
import { Link } from "react-router-dom";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCoursesCatalog } from "@/contexts/CoursesCatalogContext";
import { formatCoursePrice } from "@/data/courses";
import { formatStudentCount } from "@/data/courses";

export function AdminCoursesPage() {
  const { courses, setCoursesCatalog } = useCoursesCatalog();

  React.useEffect(() => {
    document.title = "课程管理 - 后台";
  }, []);

  function handleDelete(id: string, title: string) {
    if (!window.confirm(`确定删除课程「${title}」？此操作不可恢复。`)) return;
    setCoursesCatalog(courses.filter((c) => c.id !== id));
  }

  function statusBadges(c: (typeof courses)[0]) {
    const items: string[] = [];
    if (c.isHot) items.push("热销");
    if (c.isNew) items.push("新课");
    if (c.isVipFree) items.push("会员免费");
    if (items.length === 0) items.push("在售");
    return items;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            课程管理
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            共 {courses.length} 门课程 · 数据保存在本机 localStorage（admin_courses）
          </p>
        </div>
        <Button asChild className="shrink-0 gap-2 self-start sm:self-auto">
          <Link to="/admin/courses/new">
            <Plus className="h-4 w-4" />
            添加新课程
          </Link>
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm dark:border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">课程列表</CardTitle>
          <CardDescription>封面、价格与状态一览</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 sm:p-6 sm:pt-0">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/50">
                <th className="px-4 py-3 font-medium text-muted-foreground">封面</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">标题</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">分类</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">价格</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">学员数</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">状态</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">操作</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-slate-100 transition hover:bg-slate-50/80 dark:border-slate-800/80 dark:hover:bg-slate-900/40"
                >
                  <td className="px-4 py-3 text-2xl" aria-hidden>
                    {c.coverEmoji}
                  </td>
                  <td className="max-w-[200px] px-4 py-3">
                    <p className="truncate font-medium text-foreground">{c.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{c.id}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.categoryLabel}</td>
                  <td className="px-4 py-3 tabular-nums font-medium">
                    {formatCoursePrice(c.price)}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {formatStudentCount(c.studentCount)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {statusBadges(c).map((s) => (
                        <Badge key={s} variant="secondary" className="text-[10px] font-normal">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" className="h-8 gap-1 px-2" asChild>
                        <Link to={`/admin/courses/edit/${c.id}`}>
                          <Pencil className="h-3.5 w-3.5" />
                          编辑
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 border-red-200 px-2 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40"
                        type="button"
                        onClick={() => handleDelete(c.id, c.title)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        删除
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
