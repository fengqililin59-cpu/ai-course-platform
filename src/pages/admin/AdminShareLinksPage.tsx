import * as React from "react";
import { Link2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAdminApiToken } from "@/admin/AdminAuth";

type ShareLinkRow = {
  id: number;
  short_code: string;
  target_url: string;
  title: string | null;
  user_id: number | null;
  click_count: number;
  unique_visitors: number;
  created_at: string;
};

function formatDateTime(dateStr: string) {
  if (!dateStr) return "—";
  const d = new Date(dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleString("zh-CN", { hour12: false });
}

export function AdminShareLinksPage() {
  const [rows, setRows] = React.useState<ShareLinkRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [listError, setListError] = React.useState("");

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    setListError("");
    const token = getAdminApiToken();
    if (!token) {
      setListError("未配置 admin_token：请重新登录后台。");
      setRows([]);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/admin/share-links?limit=200", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as {
        success?: boolean;
        data?: ShareLinkRow[];
        message?: string;
      };
      if (!res.ok || data.success === false) {
        setListError(data.message || `加载失败（${res.status}）`);
        setRows([]);
        return;
      }
      setRows(data.data ?? []);
    } catch {
      setListError("网络错误");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    document.title = "分享短链 - 后台";
    void fetchData();
  }, [fetchData]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            分享短链统计
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            短链由 API 域名 <code className="rounded bg-slate-200 px-1 dark:bg-slate-800">/s/:code</code>{" "}
            跳转并累计点击；前台在分享弹窗中生成。
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => void fetchData()}>
          <RefreshCw className="h-4 w-4" aria-hidden />
          刷新
        </Button>
      </div>

      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Link2 className="h-5 w-5 opacity-80" aria-hidden />
            最近记录
          </CardTitle>
          <CardDescription>最多展示 200 条，按创建时间倒序</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">加载中…</p>
          ) : listError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{listError}</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无短链数据</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase text-muted-foreground dark:border-slate-700">
                    <th className="py-2 pr-3 font-medium">短码</th>
                    <th className="py-2 pr-3 font-medium">点击</th>
                    <th className="py-2 pr-3 font-medium">标题</th>
                    <th className="py-2 pr-3 font-medium">目标 URL</th>
                    <th className="py-2 pr-3 font-medium">创建者 user_id</th>
                    <th className="py-2 font-medium">创建时间</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-slate-100 last:border-0 dark:border-slate-800/80"
                    >
                      <td className="py-2 pr-3 font-mono text-xs">{r.short_code}</td>
                      <td className="py-2 pr-3">
                        <Badge variant="secondary">{r.click_count}</Badge>
                      </td>
                      <td className="max-w-[140px] truncate py-2 pr-3 text-muted-foreground" title={r.title ?? ""}>
                        {r.title || "—"}
                      </td>
                      <td className="max-w-[280px] truncate py-2 pr-3 font-mono text-xs text-muted-foreground" title={r.target_url}>
                        {r.target_url}
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">{r.user_id ?? "—"}</td>
                      <td className="py-2 text-muted-foreground">{formatDateTime(r.created_at)}</td>
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
