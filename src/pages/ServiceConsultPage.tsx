import * as React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/contexts/ToastContext";
import { getServiceById } from "@/data/services";
import { cn } from "@/lib/utils";

const NEED_TYPES = [
  { value: "web", label: "网站" },
  { value: "miniprogram", label: "小程序" },
  { value: "biz", label: "商业方案" },
  { value: "aimedia", label: "AI视觉内容" },
  { value: "design", label: "设计" },
  { value: "other", label: "其他" },
] as const;

const BUDGETS = [
  { value: "under2000", label: "2000 以下" },
  { value: "2000-5000", label: "2000–5000" },
  { value: "5000-10000", label: "5000–10000" },
  { value: "10000plus", label: "1 万以上" },
] as const;

const inputClass =
  "flex min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export function ServiceConsultPage() {
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const presetServiceId = searchParams.get("service") ?? "";

  const [name, setName] = React.useState("");
  const [needType, setNeedType] = React.useState<string>(NEED_TYPES[0].value);
  const [budget, setBudget] = React.useState<string>(BUDGETS[0].value);
  const [contact, setContact] = React.useState("");
  const [detail, setDetail] = React.useState("");

  React.useEffect(() => {
    document.title = "服务咨询 - AIlearn Pro";
  }, []);

  const presetLabel = React.useMemo(() => {
    if (!presetServiceId) return "";
    const s = getServiceById(presetServiceId);
    return s?.title ?? "";
  }, [presetServiceId]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !contact.trim() || !detail.trim()) {
      showToast("请填写姓名/公司、联系方式与需求描述", "error");
      return;
    }
    showToast("已收到你的需求，我们会尽快通过微信/电话与你联系。", "success");
  }

  return (
    <main className="mx-auto min-w-0 max-w-xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        AI 定制服务
      </p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">咨询与报价</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        提交后由商务跟进；如需对公与发票请在需求中说明。
      </p>

      {presetLabel ? (
        <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
          意向服务：<span className="font-medium">{presetLabel}</span>
        </p>
      ) : null}

      <Card className="mt-8 border-border/80">
        <CardHeader>
          <CardTitle className="text-lg">填写信息</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="consult-name" className="text-sm font-medium">
                姓名 / 公司名
              </label>
              <input
                id="consult-name"
                name="name"
                autoComplete="organization"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={cn(inputClass, "mt-1.5")}
                placeholder="例如：张三 / XX 科技有限公司"
              />
            </div>
            <div>
              <label htmlFor="consult-type" className="text-sm font-medium">
                需求类型
              </label>
              <select
                id="consult-type"
                name="needType"
                value={needType}
                onChange={(e) => setNeedType(e.target.value)}
                className={cn(inputClass, "mt-1.5 cursor-pointer")}
              >
                {NEED_TYPES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="consult-budget" className="text-sm font-medium">
                预算范围
              </label>
              <select
                id="consult-budget"
                name="budget"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className={cn(inputClass, "mt-1.5 cursor-pointer")}
              >
                {BUDGETS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="consult-contact" className="text-sm font-medium">
                联系方式（微信 / 电话）
              </label>
              <input
                id="consult-contact"
                name="contact"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className={cn(inputClass, "mt-1.5")}
                placeholder="微信号或手机号"
              />
            </div>
            <div>
              <label htmlFor="consult-detail" className="text-sm font-medium">
                需求描述
              </label>
              <textarea
                id="consult-detail"
                name="detail"
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                rows={5}
                className={cn(inputClass, "mt-1.5 min-h-[120px] resize-y")}
                placeholder="行业、目标用户、期望上线时间、参考站点等"
              />
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button type="submit" className="bg-amber-500 text-slate-950 hover:bg-amber-400">
                提交咨询
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link to="/services">返回服务列表</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
