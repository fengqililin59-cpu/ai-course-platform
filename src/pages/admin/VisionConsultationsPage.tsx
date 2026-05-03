import * as React from "react";
import { Image, RefreshCw, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAdminApiToken } from "@/admin/AdminAuth";
import { cn } from "@/lib/utils";

type VisionConsultation = {
  id: number;
  name: string;
  contact: string;
  service_type: string | null;
  budget_range: string | null;
  description: string;
  created_at: string;
};

function serviceTypeBadge(type: string | null) {
  if (!type) {
    return <Badge variant="muted">未选</Badge>;
  }
  if (type.includes("图片") && type.includes("视频")) {
    return <Badge variant="default">{type}</Badge>;
  }
  return <Badge variant="secondary">{type}</Badge>;
}

function formatDateTime(dateStr: string) {
  if (!dateStr) return "—";
  const d = new Date(dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleString("zh-CN", { hour12: false });
}

export function VisionConsultationsPage() {
  const [rows, setRows] = React.useState<VisionConsultation[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [listError, setListError] = React.useState("");
  const [searchTerm, setSearchTerm] = React.useState("");

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
      const res = await fetch("/api/admin/vision-consultations?limit=200", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as {
        success?: boolean;
        data?: VisionConsultation[];
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
    document.title = "视觉咨询列表 - 后台";
    void fetchData();
  }, [fetchData]);

  const q = searchTerm.trim().toLowerCase();
  const filtered = q
    ? rows.filter(
        (item) =>
          item.name?.toLowerCase().includes(q) ||
          item.contact?.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q) ||
          (item.service_type && item.service_type.toLowerCase().includes(q)),
      )
    : rows;

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <Card className="border-slate-200 shadow-sm dark:border-slate-800">
        <CardHeader className="flex flex-col gap-4 border-b border-slate-100 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div className="flex items-center gap-2">
            <Image className="h-5 w-5 text-violet-600 dark:text-violet-400" aria-hidden />
            <CardTitle className="text-lg">AI 视觉咨询列表</CardTitle>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-2"
            onClick={() => void fetchData()}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} aria-hidden />
            刷新
          </Button>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="relative mb-4 max-w-md">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索姓名、联系方式或需求描述"
              className="flex h-10 w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30 dark:border-slate-700 dark:bg-slate-900"
            />
          </div>

          {listError ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
              {listError}
            </p>
          ) : null}

          {loading ? (
            <p className="py-12 text-center text-sm text-muted-foreground">加载中…</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/80">
                    <th className="px-3 py-3 font-semibold text-slate-700 dark:text-slate-200">ID</th>
                    <th className="px-3 py-3 font-semibold text-slate-700 dark:text-slate-200">姓名</th>
                    <th className="px-3 py-3 font-semibold text-slate-700 dark:text-slate-200">联系方式</th>
                    <th className="px-3 py-3 font-semibold text-slate-700 dark:text-slate-200">服务类型</th>
                    <th className="px-3 py-3 font-semibold text-slate-700 dark:text-slate-200">预算</th>
                    <th className="px-3 py-3 font-semibold text-slate-700 dark:text-slate-200">需求描述</th>
                    <th className="px-3 py-3 font-semibold text-slate-700 dark:text-slate-200">提交时间</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-3 py-10 text-center text-muted-foreground"
                      >
                        {rows.length === 0 ? "暂无咨询记录" : "无匹配结果"}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((item) => {
                      const desc =
                        item.description.length > 80
                          ? `${item.description.slice(0, 80)}…`
                          : item.description;
                      return (
                        <tr
                          key={item.id}
                          className="border-b border-slate-100 last:border-0 dark:border-slate-800/80"
                        >
                          <td className="px-3 py-3 tabular-nums text-muted-foreground">{item.id}</td>
                          <td className="px-3 py-3 font-medium text-slate-900 dark:text-slate-100">
                            {item.name}
                          </td>
                          <td className="max-w-[140px] px-3 py-3 break-all text-slate-700 dark:text-slate-300">
                            {item.contact}
                          </td>
                          <td className="px-3 py-3">{serviceTypeBadge(item.service_type)}</td>
                          <td className="px-3 py-3 text-muted-foreground">
                            {item.budget_range || "—"}
                          </td>
                          <td
                            className="max-w-md px-3 py-3 text-slate-700 dark:text-slate-300"
                            title={item.description}
                          >
                            {desc}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                            {formatDateTime(item.created_at)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
