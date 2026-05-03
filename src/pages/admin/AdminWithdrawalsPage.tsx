import * as React from "react";
import { RefreshCw, ScrollText, Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getAdminApiToken, getAdminDisplayName } from "@/admin/AdminAuth";
import { cn } from "@/lib/utils";

type WithdrawalStatus = "pending" | "approved" | "rejected" | "paid";

type WithdrawalRow = {
  id: number;
  amount: number;
  alipay_account: string | null;
  wechat_account: string | null;
  commission_ids: { id: number; amount: number }[];
  status: string;
  created_at: string;
  updated_at: string | null;
  creator_phone: string | null;
};

type AuditRow = {
  id: number;
  withdrawal_id: number | null;
  action: string;
  actor: string | null;
  detail: string | null;
  created_at: string;
};

function adminFetchHeaders(): HeadersInit {
  const token = getAdminApiToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token ?? ""}`,
  };
  const name = getAdminDisplayName();
  if (name) headers["X-Admin-Name"] = name;
  return headers;
}

function statusBadgeVariant(s: string): "default" | "secondary" | "outline" | "muted" {
  if (s === "pending") return "secondary";
  if (s === "approved") return "default";
  if (s === "paid") return "outline";
  if (s === "rejected") return "muted";
  return "outline";
}

function statusLabel(s: string): string {
  const m: Record<string, string> = {
    pending: "待审核",
    approved: "已通过",
    rejected: "已拒绝",
    paid: "已打款",
  };
  return m[s] ?? s;
}

function formatDateTime(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  const d = new Date(dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleString("zh-CN", { hour12: false });
}

export function AdminWithdrawalsPage() {
  const [status, setStatus] = React.useState<WithdrawalStatus | "all">("all");
  const [page, setPage] = React.useState(1);
  const pageSize = 20;
  const [total, setTotal] = React.useState(0);
  const [rows, setRows] = React.useState<WithdrawalRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState("");
  const [actionBusyId, setActionBusyId] = React.useState<number | null>(null);

  const [confirm, setConfirm] = React.useState<{
    type: "approve" | "reject" | "paid";
    row: WithdrawalRow;
  } | null>(null);

  const [auditForId, setAuditForId] = React.useState<number | null>(null);
  const [auditRows, setAuditRows] = React.useState<AuditRow[]>([]);
  const [auditLoading, setAuditLoading] = React.useState(false);
  const [auditErr, setAuditErr] = React.useState("");

  const fetchList = React.useCallback(async () => {
    setLoading(true);
    setErr("");
    const token = getAdminApiToken();
    if (!token) {
      setErr("未配置 admin_token：请重新登录后台。");
      setRows([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    try {
      const q = new URLSearchParams();
      if (status !== "all") q.set("status", status);
      q.set("page", String(page));
      q.set("pageSize", String(pageSize));
      const res = await fetch(`/api/admin/withdrawals?${q.toString()}`, {
        headers: adminFetchHeaders(),
      });
      const data = (await res.json()) as {
        success?: boolean;
        message?: string;
        data?: { list: WithdrawalRow[]; total: number; page: number; pageSize: number };
      };
      if (!res.ok || data.success === false) {
        setErr(data.message || `加载失败（${res.status}）`);
        setRows([]);
        setTotal(0);
        return;
      }
      setRows(data.data?.list ?? []);
      setTotal(data.data?.total ?? 0);
    } catch {
      setErr("网络错误");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  React.useEffect(() => {
    document.title = "提现审核 - 后台";
    void fetchList();
  }, [fetchList]);

  React.useEffect(() => {
    if (auditForId == null) {
      setAuditRows([]);
      setAuditErr("");
      return;
    }
    const token = getAdminApiToken();
    if (!token) return;
    let cancelled = false;
    setAuditLoading(true);
    setAuditErr("");
    void fetch(`/api/admin/withdrawals/${auditForId}/audits`, { headers: adminFetchHeaders() })
      .then(async (res) => {
        const j = (await res.json()) as { success?: boolean; data?: AuditRow[]; message?: string };
        if (!res.ok || j.success === false) {
          if (!cancelled) setAuditErr(j.message || "加载失败");
          return;
        }
        if (!cancelled) setAuditRows(j.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setAuditErr("网络错误");
      })
      .finally(() => {
        if (!cancelled) setAuditLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [auditForId]);

  async function postAction(id: number, path: "approve" | "reject" | "paid") {
    const token = getAdminApiToken();
    if (!token) return;
    setActionBusyId(id);
    setErr("");
    try {
      const res = await fetch(`/api/admin/withdrawals/${id}/${path}`, {
        method: "POST",
        headers: { ...adminFetchHeaders(), "Content-Type": "application/json" },
      });
      const j = (await res.json()) as { success?: boolean; message?: string };
      if (!res.ok || j.success === false) {
        setErr(j.message || "操作失败");
        return;
      }
      setConfirm(null);
      await fetchList();
    } catch {
      setErr("网络错误");
    } finally {
      setActionBusyId(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const tabs: { key: WithdrawalStatus | "all"; label: string }[] = [
    { key: "all", label: "全部" },
    { key: "pending", label: "待审核" },
    { key: "approved", label: "已通过" },
    { key: "paid", label: "已打款" },
    { key: "rejected", label: "已拒绝" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            <Wallet className="h-7 w-7 shrink-0 opacity-85" aria-hidden />
            提现审核
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            替代 CLI（withdraw-cli.js）；操作写入 <code className="rounded bg-slate-200 px-1 dark:bg-slate-800">distribution_withdrawal_audits</code>
            ，actor 优先取登录用户名（X-Admin-Name）。
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
        <CardHeader className="pb-3">
          <CardTitle className="text-base">筛选</CardTitle>
          <CardDescription>按状态筛选，默认每页 {pageSize} 条</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <Button
              key={t.key}
              type="button"
              size="sm"
              variant={status === t.key ? "default" : "outline"}
              onClick={() => {
                setStatus(t.key);
                setPage(1);
              }}
            >
              {t.label}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg">申请列表</CardTitle>
          <CardDescription>
            共 {total} 条 · 第 {page} / {totalPages} 页
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">加载中…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无数据</p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase text-muted-foreground dark:border-slate-800 dark:bg-slate-900/50">
                      <th className="px-3 py-2.5 font-medium">ID</th>
                      <th className="px-3 py-2.5 font-medium">申请人</th>
                      <th className="px-3 py-2.5 font-medium">金额（元）</th>
                      <th className="px-3 py-2.5 font-medium">支付宝</th>
                      <th className="px-3 py-2.5 font-medium">微信</th>
                      <th className="px-3 py-2.5 font-medium">申请时间</th>
                      <th className="px-3 py-2.5 font-medium">状态</th>
                      <th className="px-3 py-2.5 font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-slate-100 last:border-0 dark:border-slate-800/80"
                      >
                        <td className="px-3 py-2.5 font-mono text-xs">{r.id}</td>
                        <td className="max-w-[10rem] truncate px-3 py-2.5" title={r.creator_phone ?? ""}>
                          {r.creator_phone ?? "—"}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums font-medium">{Number(r.amount).toFixed(2)}</td>
                        <td className="max-w-[8rem] truncate px-3 py-2.5 text-xs" title={r.alipay_account ?? ""}>
                          {r.alipay_account ?? "—"}
                        </td>
                        <td className="max-w-[8rem] truncate px-3 py-2.5 text-xs" title={r.wechat_account ?? ""}>
                          {r.wechat_account ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-xs text-muted-foreground">
                          {formatDateTime(r.created_at)}
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge
                            variant={statusBadgeVariant(r.status)}
                            className={
                              r.status === "rejected"
                                ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200"
                                : undefined
                            }
                          >
                            {statusLabel(r.status)}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-wrap gap-1.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1 px-2 text-xs"
                              onClick={() => setAuditForId(r.id)}
                            >
                              <ScrollText className="h-3.5 w-3.5" aria-hidden />
                              日志
                            </Button>
                            {r.status === "pending" ? (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-8 text-xs"
                                  disabled={actionBusyId === r.id}
                                  onClick={() => setConfirm({ type: "approve", row: r })}
                                >
                                  通过
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 border-red-300 text-xs text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
                                  disabled={actionBusyId === r.id}
                                  onClick={() => setConfirm({ type: "reject", row: r })}
                                >
                                  拒绝
                                </Button>
                              </>
                            ) : null}
                            {r.status === "approved" ? (
                              <Button
                                type="button"
                                size="sm"
                                className="h-8 text-xs"
                                disabled={actionBusyId === r.id}
                                onClick={() => setConfirm({ type: "paid", row: r })}
                              >
                                标记已打款
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  commission_ids 已解析为 JSON；完整数据可在审计或数据库中查看。
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    上一页
                  </Button>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {page} / {totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages || loading}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(confirm)} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent className="max-w-md border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle>
              {confirm?.type === "approve"
                ? "确认通过"
                : confirm?.type === "reject"
                  ? "确认拒绝"
                  : "确认已打款"}
            </DialogTitle>
            <DialogDescription>
              {confirm ? (
                <>
                  提现 ID <span className="font-mono">{confirm.row.id}</span>，金额{" "}
                  <span className="font-semibold text-foreground">
                    ¥{Number(confirm.row.amount).toFixed(2)}
                  </span>
                  ，申请人 {confirm.row.creator_phone ?? "—"}。此操作不可撤销（状态仅向前流转）。
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirm(null)}>
              取消
            </Button>
            <Button
              type="button"
              variant={confirm?.type === "reject" ? "outline" : "default"}
              className={
                confirm?.type === "reject"
                  ? "border-red-600 bg-red-600 text-white hover:bg-red-600/90 dark:border-red-500 dark:bg-red-600"
                  : undefined
              }
              disabled={!confirm || actionBusyId === confirm.row.id}
              onClick={() => {
                if (!confirm) return;
                void postAction(confirm.row.id, confirm.type);
              }}
            >
              {actionBusyId === confirm?.row.id ? "处理中…" : "确认"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={auditForId != null} onOpenChange={(o) => !o && setAuditForId(null)}>
        <DialogContent className="max-w-lg border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle>审计日志 · ID {auditForId}</DialogTitle>
            <DialogDescription>按时间升序</DialogDescription>
          </DialogHeader>
          <div className="max-h-[min(60vh,24rem)] space-y-2 overflow-y-auto text-sm">
            {auditLoading ? (
              <p className="text-muted-foreground">加载中…</p>
            ) : auditErr ? (
              <p className="text-destructive">{auditErr}</p>
            ) : auditRows.length === 0 ? (
              <p className="text-muted-foreground">暂无记录</p>
            ) : (
              <ul className="space-y-2">
                {auditRows.map((a) => (
                  <li
                    key={a.id}
                    className={cn(
                      "rounded-lg border border-slate-200 p-3 dark:border-slate-700",
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge variant="outline">{a.action}</Badge>
                      <span className="text-xs text-muted-foreground">{formatDateTime(a.created_at)}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">操作者：{a.actor ?? "—"}</p>
                    {a.detail ? (
                      <p className="mt-1 break-words font-mono text-xs text-foreground/90">{a.detail}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setAuditForId(null)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
