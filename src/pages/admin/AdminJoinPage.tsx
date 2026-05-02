import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAdminApiToken } from "@/admin/AdminAuth";
import { cn } from "@/lib/utils";

type JoinApplication = {
  id: number;
  name: string;
  wechat: string;
  expertise: string;
  course_name: string;
  price: string;
  bio: string;
  fans: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

const STATUS_MAP = {
  pending: {
    label: "待审核",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  },
  approved: {
    label: "已通过",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
  rejected: {
    label: "已拒绝",
    className: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400",
  },
};

const EXPERTISE_LABELS: Record<string, string> = {
  "ai-tools": "AI工具",
  "side-income": "副业变现",
  dev: "编程开发",
  design: "设计创意",
  marketing: "营销运营",
  other: "其他",
};

export function AdminJoinPage() {
  const [apps, setApps] = React.useState<JoinApplication[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [listError, setListError] = React.useState("");
  const [filter, setFilter] = React.useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [selected, setSelected] = React.useState<JoinApplication | null>(null);
  const [processing, setProcessing] = React.useState(false);

  const fetchApps = React.useCallback(async () => {
    setLoading(true);
    setListError("");
    const token = getAdminApiToken();
    if (!token) {
      setListError("未配置 admin_token：请重新登录后台。");
      setApps([]);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/admin/join-applications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as { success?: boolean; data?: JoinApplication[]; message?: string };
      if (!res.ok || data.success === false) {
        setListError(data.message || `加载失败 (${res.status})`);
        setApps([]);
        return;
      }
      setApps(data.data ?? []);
    } catch {
      setListError("网络错误");
      setApps([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    document.title = "入驻审核 - 后台";
    void fetchApps();
  }, [fetchApps]);

  async function handleAction(id: number, action: "approved" | "rejected" | "pending") {
    const token = getAdminApiToken();
    if (!token) return;
    setProcessing(true);
    try {
      const res = await fetch(`/api/admin/join-applications/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: action }),
      });
      const data = (await res.json()) as { success?: boolean; message?: string };
      if (data.success) {
        setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status: action } : a)));
        setSelected((prev) => (prev?.id === id ? { ...prev, status: action } : prev));
      }
    } finally {
      setProcessing(false);
    }
  }

  const filtered = filter === "all" ? apps : apps.filter((a) => a.status === filter);
  const counts = {
    all: apps.length,
    pending: apps.filter((a) => a.status === "pending").length,
    approved: apps.filter((a) => a.status === "approved").length,
    rejected: apps.filter((a) => a.status === "rejected").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            入驻申请审核
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            审核博主入驻申请；数据来自 SQLite <code className="text-xs">join_applications</code>
          </p>
        </div>
        <Button variant="outline" size="sm" type="button" onClick={() => void fetchApps()}>
          刷新
        </Button>
      </div>

      {listError ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
          {listError}
        </p>
      ) : null}

      <div className="flex w-fit gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900">
        {(["pending", "all", "approved", "rejected"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              filter === tab
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400",
            )}
          >
            {tab === "all"
              ? "全部"
              : tab === "pending"
                ? "待审核"
                : tab === "approved"
                  ? "已通过"
                  : "已拒绝"}
            <span className="ml-1.5 tabular-nums text-slate-400">({counts[tab]})</span>
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
                />
              ))
            : filtered.length === 0
              ? (
                  <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm text-muted-foreground dark:border-slate-800">
                    暂无申请
                  </div>
                )
              : (
                  filtered.map((app) => {
                    const status = STATUS_MAP[app.status];
                    return (
                      <button
                        key={app.id}
                        type="button"
                        onClick={() => setSelected(app)}
                        className={cn(
                          "w-full rounded-xl border p-4 text-left transition-colors",
                          selected?.id === app.id
                            ? "border-slate-400 bg-white shadow-sm dark:border-slate-600 dark:bg-slate-800"
                            : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-medium">{app.name}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {EXPERTISE_LABELS[app.expertise] || app.expertise} ·{" "}
                              {app.created_at.slice(0, 10)}
                            </p>
                            {app.course_name ? (
                              <p className="mt-1 truncate text-xs text-slate-600 dark:text-slate-400">
                                📚 {app.course_name}
                              </p>
                            ) : null}
                          </div>
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                              status.className,
                            )}
                          >
                            {status.label}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
        </div>

        <div>
          {selected ? (
            <Card className="sticky top-6 border-slate-200 shadow-sm dark:border-slate-800">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{selected.name}</CardTitle>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      STATUS_MAP[selected.status].className,
                    )}
                  >
                    {STATUS_MAP[selected.status].label}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Row label="微信号" value={selected.wechat} copyable />
                <Row label="擅长领域" value={EXPERTISE_LABELS[selected.expertise] || selected.expertise} />
                <Row label="预计课程" value={selected.course_name || "—"} />
                <Row label="预计售价" value={selected.price || "—"} />
                <Row label="粉丝平台" value={selected.fans || "—"} />
                {selected.bio ? (
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">个人简介</p>
                    <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm leading-relaxed dark:bg-slate-800/60">
                      {selected.bio}
                    </p>
                  </div>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  申请时间：{selected.created_at.slice(0, 16)}
                </p>

                {selected.status === "pending" ? (
                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
                      disabled={processing}
                      onClick={() => void handleAction(selected.id, "approved")}
                    >
                      ✓ 通过申请
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400"
                      disabled={processing}
                      onClick={() => void handleAction(selected.id, "rejected")}
                    >
                      ✕ 拒绝
                    </Button>
                  </div>
                ) : null}

                {selected.status === "approved" ? (
                  <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                    ✓ 已通过 — 请通过微信联系博主，引导使用手机号登录创作者中心。
                  </div>
                ) : null}

                {selected.status === "rejected" ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={processing}
                    onClick={() => void handleAction(selected.id, "approved")}
                  >
                    撤销拒绝，改为通过
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ) : (
            <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-muted-foreground dark:border-slate-800">
              点击左侧申请查看详情
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  copyable,
}: {
  label: string;
  value: string;
  copyable?: boolean;
}) {
  const [copied, setCopied] = React.useState(false);

  function handleCopy() {
    if (!value) return;
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="flex min-w-0 items-center gap-1">
        <span className="truncate font-medium">{value}</span>
        {copyable ? (
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 rounded px-1.5 py-0.5 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            {copied ? "✓" : "复制"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
