import * as React from "react";
import { RefreshCw, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAdminApiToken } from "@/admin/AdminAuth";

type DbCourse = {
  id: number;
  title: string;
  price_yuan: number;
  status: string;
};

type SeckillRow = {
  id: number;
  course_id: number;
  original_price: number;
  seckill_price: number;
  stock: number;
  limit_per_user: number;
  start_time: string;
  end_time: string;
  status: string;
  course_title?: string;
};

function toSqlDateTime(v: string): string {
  return v.includes("T") ? v.replace("T", " ") : v;
}

export function AdminSeckillPage() {
  const [activities, setActivities] = React.useState<SeckillRow[]>([]);
  const [courses, setCourses] = React.useState<DbCourse[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  const [courseId, setCourseId] = React.useState("");
  const [originalPrice, setOriginalPrice] = React.useState("");
  const [seckillPrice, setSeckillPrice] = React.useState("");
  const [stock, setStock] = React.useState("50");
  const [limitPerUser, setLimitPerUser] = React.useState("1");
  const [startTime, setStartTime] = React.useState("");
  const [endTime, setEndTime] = React.useState("");
  const [createStatus, setCreateStatus] = React.useState<"pending" | "active" | "ended">("pending");

  const [savingId, setSavingId] = React.useState<number | null>(null);

  const fetchAll = React.useCallback(async () => {
    setLoading(true);
    setErr("");
    const token = getAdminApiToken();
    if (!token) {
      setErr("未配置 admin_token：请重新登录后台。");
      setActivities([]);
      setCourses([]);
      setLoading(false);
      return;
    }
    try {
      const [aRes, cRes] = await Promise.all([
        fetch("/api/admin/seckill-activities", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/admin/courses?status=published", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const aJson = (await aRes.json()) as { success?: boolean; data?: SeckillRow[]; message?: string };
      const cJson = (await cRes.json()) as { success?: boolean; data?: DbCourse[]; message?: string };
      if (!aRes.ok || aJson.success === false) {
        setErr(aJson.message || "加载秒杀失败");
        setActivities([]);
      } else {
        setActivities(aJson.data ?? []);
      }
      if (cRes.ok && cJson.success !== false) {
        setCourses(cJson.data ?? []);
      } else {
        setCourses([]);
      }
    } catch {
      setErr("网络错误");
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    document.title = "秒杀活动 - 后台";
    void fetchAll();
  }, [fetchAll]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const token = getAdminApiToken();
    if (!token) return;
    setCreating(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/seckill-activities", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          course_id: Number(courseId),
          original_price: Number(originalPrice),
          seckill_price: Number(seckillPrice),
          stock: Number(stock),
          limit_per_user: Number(limitPerUser) || 1,
          start_time: toSqlDateTime(startTime),
          end_time: toSqlDateTime(endTime),
          status: createStatus,
        }),
      });
      const data = (await res.json()) as { success?: boolean; message?: string };
      if (!res.ok || data.success === false) {
        setErr(data.message || "创建失败");
        return;
      }
      setCourseId("");
      setOriginalPrice("");
      setSeckillPrice("");
      await fetchAll();
    } catch {
      setErr("创建请求失败");
    } finally {
      setCreating(false);
    }
  }

  async function patchActivity(id: number, body: Record<string, unknown>) {
    const token = getAdminApiToken();
    if (!token) return;
    setSavingId(id);
    setErr("");
    try {
      const res = await fetch(`/api/admin/seckill-activities/${id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { success?: boolean; message?: string };
      if (!res.ok || data.success === false) {
        setErr(data.message || "更新失败");
        return;
      }
      await fetchAll();
    } catch {
      setErr("更新请求失败");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">秒杀活动</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            创建后可将状态改为 <code className="rounded bg-slate-200 px-1 dark:bg-slate-800">active</code>{" "}
            上线；时间与库存以服务端校验为准。
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => void fetchAll()}>
          <RefreshCw className="h-4 w-4" aria-hidden />
          刷新
        </Button>
      </div>

      {err ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {err}
        </p>
      ) : null}

      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 opacity-80" aria-hidden />
            新建活动
          </CardTitle>
          <CardDescription>原价可与课程标价一致；秒杀价须低于原价</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" onSubmit={(e) => void handleCreate(e)}>
            <label className="space-y-1 sm:col-span-2 lg:col-span-3">
              <span className="text-xs font-medium text-muted-foreground">课程</span>
              <select
                required
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="flex h-10 w-full max-w-xl rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">选择已发布课程</option>
                {courses.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    #{c.id} {c.title}（¥{c.price_yuan}）
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">原价（元）</span>
              <input
                required
                type="number"
                min={0}
                step="0.01"
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">秒杀价（元）</span>
              <input
                required
                type="number"
                min={0.01}
                step="0.01"
                value={seckillPrice}
                onChange={(e) => setSeckillPrice(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">库存</span>
              <input
                required
                type="number"
                min={0}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">每人限购</span>
              <input
                required
                type="number"
                min={1}
                value={limitPerUser}
                onChange={(e) => setLimitPerUser(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">开始</span>
              <input
                required
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">结束</span>
              <input
                required
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">初始状态</span>
              <select
                value={createStatus}
                onChange={(e) => setCreateStatus(e.target.value as typeof createStatus)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="pending">pending（未上线）</option>
                <option value="active">active（立即参与）</option>
                <option value="ended">ended</option>
              </select>
            </label>
            <div className="flex items-end sm:col-span-2 lg:col-span-3">
              <Button type="submit" disabled={creating}>
                {creating ? "创建中…" : "创建"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg">活动列表</CardTitle>
          <CardDescription>快速上下线与改库存</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">加载中…</p>
          ) : activities.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无活动</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase text-muted-foreground dark:border-slate-700">
                    <th className="py-2 pr-2 font-medium">ID</th>
                    <th className="py-2 pr-2 font-medium">课程</th>
                    <th className="py-2 pr-2 font-medium">价</th>
                    <th className="py-2 pr-2 font-medium">库存</th>
                    <th className="py-2 pr-2 font-medium">限购</th>
                    <th className="py-2 pr-2 font-medium">时间</th>
                    <th className="py-2 pr-2 font-medium">状态</th>
                    <th className="py-2 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((a) => (
                    <tr key={a.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800/80">
                      <td className="py-2 pr-2 font-mono text-xs">{a.id}</td>
                      <td className="py-2 pr-2">
                        <span className="font-medium">#{a.course_id}</span>{" "}
                        <span className="text-muted-foreground">{a.course_title ?? "—"}</span>
                      </td>
                      <td className="py-2 pr-2 tabular-nums">
                        ¥{a.seckill_price}
                        <span className="text-xs text-muted-foreground"> / 原¥{a.original_price}</span>
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min={0}
                          defaultValue={a.stock}
                          id={`sk-stock-${a.id}`}
                          className="w-20 rounded-md border border-input bg-background px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="py-2 pr-2 tabular-nums">{a.limit_per_user}</td>
                      <td className="py-2 pr-2 text-xs text-muted-foreground">
                        {a.start_time} — {a.end_time}
                      </td>
                      <td className="py-2 pr-2">
                        <select
                          defaultValue={a.status}
                          className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                          onChange={(e) => {
                            const v = e.target.value as SeckillRow["status"];
                            void patchActivity(a.id, { status: v });
                          }}
                        >
                          <option value="pending">pending</option>
                          <option value="active">active</option>
                          <option value="ended">ended</option>
                        </select>
                      </td>
                      <td className="py-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={savingId === a.id}
                          onClick={() => {
                            const el = document.getElementById(`sk-stock-${a.id}`) as HTMLInputElement | null;
                            const n = el ? Number(el.value) : NaN;
                            if (!Number.isFinite(n) || n < 0) return;
                            void patchActivity(a.id, { stock: n });
                          }}
                        >
                          {savingId === a.id ? "保存中…" : "保存库存"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
