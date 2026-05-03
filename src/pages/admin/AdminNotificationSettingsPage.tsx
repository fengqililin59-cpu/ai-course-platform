import * as React from "react";
import { Bell, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAdminApiToken } from "@/admin/AdminAuth";

type SettingsPayload = {
  enabled: boolean;
  cronExpr: string;
  hasStoredWebhook: boolean;
  envWebhookDingtalk: boolean;
  envWebhookWecom: boolean;
  envPushMasterOn: boolean;
  effectiveCron: string;
};

function fieldClass() {
  return "min-h-10 w-full max-w-xl rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30 dark:border-slate-700 dark:bg-slate-900";
}

export function AdminNotificationSettingsPage() {
  const [data, setData] = React.useState<SettingsPayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState("");
  const [err, setErr] = React.useState("");

  const [enabled, setEnabled] = React.useState(false);
  const [cronExpr, setCronExpr] = React.useState("0 9 * * *");
  const [webhookUrl, setWebhookUrl] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setErr("");
    setMsg("");
    const token = getAdminApiToken();
    if (!token) {
      setErr("未登录后台");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/admin/notification-settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = (await res.json()) as { success?: boolean; data?: SettingsPayload; message?: string };
      if (!res.ok || j.success === false) {
        setErr(j.message || `加载失败（${res.status}）`);
        setData(null);
        return;
      }
      const d = j.data;
      setData(d ?? null);
      if (d) {
        setEnabled(d.enabled);
        setCronExpr(d.cronExpr || "0 9 * * *");
        setWebhookUrl("");
      }
    } catch {
      setErr("网络错误");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    document.title = "通知设置 - 后台";
    void load();
  }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr("");
    setMsg("");
    const token = getAdminApiToken();
    if (!token) {
      setErr("未登录后台");
      setSaving(false);
      return;
    }
    try {
      const body: { enabled: boolean; cronExpr: string; webhookUrl?: string } = {
        enabled,
        cronExpr: cronExpr.trim() || "0 9 * * *",
      };
      if (webhookUrl.trim() !== "") {
        body.webhookUrl = webhookUrl.trim();
      }
      const res = await fetch("/api/admin/notification-settings", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const j = (await res.json()) as { success?: boolean; message?: string; data?: { effectiveCron?: string } };
      if (!res.ok || j.success === false) {
        setErr(j.message || `保存失败（${res.status}）`);
        return;
      }
      setMsg(j.message || "已保存");
      setWebhookUrl("");
      if (j.data?.effectiveCron) {
        setCronExpr(j.data.effectiveCron);
      }
      await load();
    } catch {
      setErr("网络错误");
    } finally {
      setSaving(false);
    }
  }

  async function clearWebhook() {
    setSaving(true);
    setErr("");
    setMsg("");
    const token = getAdminApiToken();
    if (!token) {
      setErr("未登录后台");
      setSaving(false);
      return;
    }
    try {
      const res = await fetch("/api/admin/notification-settings", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ enabled, cronExpr: cronExpr.trim() || "0 9 * * *", webhookUrl: "" }),
      });
      const j = (await res.json()) as { success?: boolean; message?: string };
      if (!res.ok || j.success === false) {
        setErr(j.message || `操作失败（${res.status}）`);
        return;
      }
      setMsg("已清除库内 Webhook（环境变量中的地址仍生效）");
      await load();
    } catch {
      setErr("网络错误");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">通知设置</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            每日向企业微信 / 钉钉机器人推送核心指标。Webhook 在库内使用 AES-256-GCM 加密；也可仅用环境变量配置。
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={loading ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
          刷新
        </Button>
      </div>

      {err ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
          {err}
        </p>
      ) : null}
      {msg ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
          {msg}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" aria-hidden />
            核心指标日报推送
          </CardTitle>
          <CardDescription>
            环境变量 <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">METRICS_PUSH_ENABLED</code>{" "}
            为 false 时全局关闭定时任务；此处开关控制是否在允许时实际推送。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && !data ? (
            <p className="text-sm text-muted-foreground">加载中…</p>
          ) : (
            <form className="space-y-5" onSubmit={(e) => void handleSave(e)}>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  开启每日推送
                </label>
                <span className="text-xs text-muted-foreground">
                  环境总开关：{data?.envPushMasterOn ? "已允许" : "已关闭（METRICS_PUSH_ENABLED）"}
                </span>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="cron-expr">
                  Cron 表达式（默认每天 09:00）
                </label>
                <input
                  id="cron-expr"
                  className={fieldClass()}
                  value={cronExpr}
                  onChange={(e) => setCronExpr(e.target.value)}
                  placeholder="0 9 * * *"
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  当前生效：<span className="font-mono">{data?.effectiveCron ?? "—"}</span>
                  （保存后尝试重载定时任务；时区见{" "}
                  <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">METRICS_PUSH_TZ</code>，默认
                  Asia/Shanghai）
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="webhook-url">
                  Webhook URL（https，仅保存时写入；留空不修改原值）
                </label>
                <input
                  id="webhook-url"
                  type="url"
                  className={fieldClass()}
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://oapi.dingtalk.com/... 或 https://qyapi.weixin.qq.com/..."
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  库内已保存：{data?.hasStoredWebhook ? "是" : "否"}；环境变量钉钉
                  {data?.envWebhookDingtalk ? "已配置" : "未配置"}，企业微信
                  {data?.envWebhookWecom ? "已配置" : "未配置"}。优先使用环境变量中的地址。
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "保存中…" : "保存设置"}
                </Button>
                <Button type="button" variant="outline" disabled={saving || !data?.hasStoredWebhook} onClick={() => void clearWebhook()}>
                  清除库内 Webhook
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
