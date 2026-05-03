import * as React from "react";
import { RefreshCw, TicketPercent } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAdminApiToken } from "@/admin/AdminAuth";
import type { CouponTemplate } from "@/lib/couponApi";

function toSqlDateTime(v: string): string {
  return v.includes("T") ? v.replace("T", " ") : v;
}

export function AdminCouponsPage() {
  const [rows, setRows] = React.useState<CouponTemplate[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [grantBusy, setGrantBusy] = React.useState(false);

  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<"fixed" | "percent">("fixed");
  const [value, setValue] = React.useState("10");
  const [conditionAmount, setConditionAmount] = React.useState("0");
  const [applicableCourses, setApplicableCourses] = React.useState("");
  const [stock, setStock] = React.useState("100");
  const [claimLimit, setClaimLimit] = React.useState("1");
  const [startTime, setStartTime] = React.useState("");
  const [endTime, setEndTime] = React.useState("");
  const [status, setStatus] = React.useState<"active" | "expired" | "disabled">("active");

  const [grantUserId, setGrantUserId] = React.useState("");
  const [grantCouponId, setGrantCouponId] = React.useState("");

  const fetchList = React.useCallback(async () => {
    setLoading(true);
    setErr("");
    const token = getAdminApiToken();
    if (!token) {
      setErr("未配置 admin_token：请重新登录后台。");
      setRows([]);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/admin/coupons", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as { success?: boolean; data?: CouponTemplate[]; message?: string };
      if (!res.ok || data.success === false) {
        setErr(data.message || `加载失败（${res.status}）`);
        setRows([]);
        return;
      }
      setRows(data.data ?? []);
    } catch {
      setErr("网络错误");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    document.title = "优惠券 - 后台";
    void fetchList();
  }, [fetchList]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const token = getAdminApiToken();
    if (!token) return;
    setCreating(true);
    setErr("");
    try {
      const courses = applicableCourses
        .split(/[,，\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type,
          value: Number(value),
          condition_amount: Number(conditionAmount) || 0,
          applicable_courses: courses,
          stock: Number(stock),
          claim_limit_per_user: Number(claimLimit) || 1,
          start_time: toSqlDateTime(startTime),
          end_time: toSqlDateTime(endTime),
          status,
        }),
      });
      const data = (await res.json()) as { success?: boolean; message?: string };
      if (!res.ok || data.success === false) {
        setErr(data.message || "创建失败");
        return;
      }
      setName("");
      await fetchList();
    } catch {
      setErr("创建请求失败");
    } finally {
      setCreating(false);
    }
  }

  async function handleGrant(e: React.FormEvent) {
    e.preventDefault();
    const token = getAdminApiToken();
    if (!token) return;
    setGrantBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/coupons/grant", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: Number(grantUserId),
          couponId: Number(grantCouponId),
        }),
      });
      const data = (await res.json()) as { success?: boolean; message?: string };
      if (!res.ok || data.success === false) {
        setErr(data.message || "发放失败");
        return;
      }
      setGrantUserId("");
      await fetchList();
    } catch {
      setErr("发放请求失败");
    } finally {
      setGrantBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">优惠券</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            创建模板、查看发行与已用次数；手动发放需填写 <strong>site_users.id</strong>（非手机号）。
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => void fetchList()}>
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
            <TicketPercent className="h-5 w-5 opacity-80" aria-hidden />
            新建优惠券
          </CardTitle>
          <CardDescription>适用课程 ID 留空表示全平台；多个用英文逗号分隔</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => void handleCreate(e)}>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs font-medium text-muted-foreground">名称</span>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">类型</span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as "fixed" | "percent")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="fixed">固定减免（元）</option>
                <option value="percent">折扣（%）</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">面值 / 折扣数值</span>
              <input
                required
                type="number"
                step="0.01"
                min={0}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">满减门槛（元，0 无门槛）</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={conditionAmount}
                onChange={(e) => setConditionAmount(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">发行总量</span>
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
              <span className="text-xs font-medium text-muted-foreground">每人限领次数</span>
              <input
                required
                type="number"
                min={1}
                value={claimLimit}
                onChange={(e) => setClaimLimit(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs font-medium text-muted-foreground">适用课程 ID（可选）</span>
              <input
                value={applicableCourses}
                onChange={(e) => setApplicableCourses(e.target.value)}
                placeholder="例：1,2,3"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">开始时间</span>
              <input
                required
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">结束时间</span>
              <input
                required
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">状态</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as typeof status)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="active">active</option>
                <option value="expired">expired</option>
                <option value="disabled">disabled</option>
              </select>
            </label>
            <div className="flex items-end sm:col-span-2">
              <Button type="submit" disabled={creating}>
                {creating ? "提交中…" : "创建"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg">手动发放</CardTitle>
          <CardDescription>将一张券记入用户券包（受总库存限制）</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => void handleGrant(e)}>
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">用户 ID</span>
              <input
                required
                type="number"
                min={1}
                value={grantUserId}
                onChange={(e) => setGrantUserId(e.target.value)}
                className="flex h-10 w-32 rounded-md border border-input bg-background px-3 text-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">优惠券模板 ID</span>
              <input
                required
                type="number"
                min={1}
                value={grantCouponId}
                onChange={(e) => setGrantCouponId(e.target.value)}
                className="flex h-10 w-32 rounded-md border border-input bg-background px-3 text-sm"
              />
            </label>
            <Button type="submit" variant="secondary" disabled={grantBusy}>
              {grantBusy ? "发放中…" : "发放"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg">模板列表</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">加载中…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无数据</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase text-muted-foreground dark:border-slate-700">
                    <th className="py-2 pr-2 font-medium">ID</th>
                    <th className="py-2 pr-2 font-medium">名称</th>
                    <th className="py-2 pr-2 font-medium">类型</th>
                    <th className="py-2 pr-2 font-medium">值</th>
                    <th className="py-2 pr-2 font-medium">库存/已用</th>
                    <th className="py-2 pr-2 font-medium">限领</th>
                    <th className="py-2 pr-2 font-medium">有效期</th>
                    <th className="py-2 font-medium">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800/80">
                      <td className="py-2 pr-2 font-mono text-xs">{r.id}</td>
                      <td className="py-2 pr-2 font-medium">{r.name}</td>
                      <td className="py-2 pr-2">{r.type}</td>
                      <td className="py-2 pr-2 tabular-nums">{r.value}</td>
                      <td className="py-2 pr-2 tabular-nums">
                        {r.used_count}/{r.stock}
                      </td>
                      <td className="py-2 pr-2">{r.claim_limit_per_user}</td>
                      <td className="py-2 pr-2 text-xs text-muted-foreground">
                        {r.start_time} — {r.end_time}
                      </td>
                      <td className="py-2">
                        <Badge variant="outline">{r.status}</Badge>
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
