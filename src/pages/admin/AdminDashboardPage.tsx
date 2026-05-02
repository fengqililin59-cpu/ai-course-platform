import * as React from "react";
import { Link } from "react-router-dom";
import { BookOpen, ClipboardList, TrendingUp, UserCheck, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const ADMIN_TOKEN = "Aike@2026#Ai";
function authHeaders() { return { Authorization: `Bearer ${ADMIN_TOKEN}` }; }
function fmt(dt: string) { return dt ? dt.slice(0, 16).replace("T", " ") : "—"; }
const ST: Record<string, { label: string; cls: string }> = {
  pending:  { label: "待审核", cls: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
  approved: { label: "已通过", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" },
  rejected: { label: "已拒绝", cls: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400" },
  paid:     { label: "已支付", cls: "bg-emerald-100 text-emerald-700" },
};
const EX: Record<string, string> = {
  "ai-tools":"AI工具","side-income":"副业变现","dev":"编程开发","design":"设计创意","marketing":"营销运营","other":"其他",
};

type Stats = { totalCreators:number; pendingApps:number; pendingCourses:number; totalOrders:number; totalRevenue:number };
type App   = { id:number; name:string; wechat:string; expertise:string; course_name:string; fans:string; status:string; created_at:string };
type Creator = { id:number; phone:string; display_name:string|null; status:string; course_count:number; order_count:number; total_earnings:number; created_at:string };
type Order = { id:number; out_trade_no:string; buyer_phone:string; total_amount:number; creator_amount:number; status:string; paid_at:string|null; created_at:string };

export function AdminDashboardPage() {
  const [stats, setStats]     = React.useState<Stats|null>(null);
  const [apps, setApps]       = React.useState<App[]>([]);
  const [creators, setCreators] = React.useState<Creator[]>([]);
  const [orders, setOrders]   = React.useState<Order[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab]         = React.useState<"apps"|"creators"|"orders">("apps");

  React.useEffect(() => { document.title = "数据总览 - 后台"; load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [s,a,c,o] = await Promise.all([
        fetch("/api/admin/stats",            {headers:authHeaders()}).then(r=>r.json()),
        fetch("/api/admin/join-applications",{headers:authHeaders()}).then(r=>r.json()),
        fetch("/api/admin/creators",         {headers:authHeaders()}).then(r=>r.json()),
        fetch("/api/admin/orders",           {headers:authHeaders()}).then(r=>r.json()),
      ]);
      if(s.success) setStats(s.data);
      if(a.success) setApps(a.data);
      if(c.success) setCreators(c.data);
      if(o.success) setOrders(o.data);
    } catch(e){ console.error(e); }
    finally{ setLoading(false); }
  }

  const cards = [
    { title:"入驻申请", value:stats?String(stats.totalCreators):"—", sub:`待审核 ${stats?.pendingApps??0} 条`, icon:ClipboardList, tint:"from-amber-500/15 to-orange-500/10", href:"/admin/join", badge:stats?.pendingApps||null },
    { title:"创作者总数", value:stats?String(stats.totalCreators):"—", sub:"已注册博主账号", icon:UserCheck, tint:"from-violet-500/15 to-fuchsia-500/10" },
    { title:"平台总收入", value:stats?`¥${stats.totalRevenue.toFixed(2)}`:"—", sub:`共 ${stats?.totalOrders??0} 笔订单`, icon:TrendingUp, tint:"from-emerald-500/15 to-teal-500/10" },
    { title:"待审核课程", value:stats?String(stats.pendingCourses):"—", sub:"需要审核上架", icon:BookOpen, tint:"from-sky-500/15 to-cyan-500/10" },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">数据总览</h2>
          <p className="mt-1 text-sm text-muted-foreground">入驻申请、创作者、订单实时数据</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          <RefreshCw className="h-3.5 w-3.5" />刷新
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((item) => (
          <Card key={item.title} className="overflow-hidden border-slate-200/80 shadow-sm dark:border-slate-800">
            <div className={cn("h-1.5 bg-gradient-to-r", item.tint)} />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{item.title}</CardTitle>
              <div className="flex items-center gap-1.5">
                {"badge" in item && item.badge ? <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">{item.badge}</span> : null}
                <item.icon className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tabular-nums">{item.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.sub}</p>
              {"href" in item && item.href ? <Link to={item.href} className="mt-2 inline-block text-xs text-violet-600 hover:underline dark:text-violet-400">去审核 →</Link> : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 w-fit dark:border-slate-800 dark:bg-slate-900">
        {([["apps","入驻申请"],["creators","创作者列表"],["orders","订单记录"]] as const).map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} className={cn("rounded-md px-4 py-1.5 text-sm font-medium transition-colors", tab===k?"bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white":"text-slate-500 hover:text-slate-700 dark:text-slate-400")}>
            {l}{k==="apps"&&stats?.pendingApps?<span className="ml-1.5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] text-white">{stats.pendingApps}</span>:null}
          </button>
        ))}
      </div>

      {tab==="apps"&&(
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          {loading?<div className="p-8 text-center text-sm text-muted-foreground">加载中...</div>:apps.length===0?<div className="p-8 text-center text-sm text-muted-foreground">暂无入驻申请</div>:(
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
                <tr>{["姓名","微信号","擅长领域","预计课程","粉丝","状态","申请时间","操作"].map(h=><th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {apps.map(a=>{const st=ST[a.status]??{label:a.status,cls:""};return(
                  <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                    <td className="px-4 py-3 font-medium">{a.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.wechat}</td>
                    <td className="px-4 py-3">{EX[a.expertise]||a.expertise}</td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[140px] truncate">{a.course_name||"—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.fans||"—"}</td>
                    <td className="px-4 py-3"><span className={cn("rounded-full px-2 py-0.5 text-xs font-medium",st.cls)}>{st.label}</span></td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{fmt(a.created_at)}</td>
                    <td className="px-4 py-3"><Link to="/admin/join" className="text-xs text-violet-600 hover:underline dark:text-violet-400">审核</Link></td>
                  </tr>
                );})}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab==="creators"&&(
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          {loading?<div className="p-8 text-center text-sm text-muted-foreground">加载中...</div>:creators.length===0?<div className="p-8 text-center text-sm text-muted-foreground">暂无创作者</div>:(
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
                <tr>{["手机号","昵称","状态","课程数","订单数","累计收益","注册时间"].map(h=><th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {creators.map(c=>{const st=ST[c.status]??{label:c.status,cls:""};return(
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                    <td className="px-4 py-3 font-medium">{c.phone}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.display_name||"未设置"}</td>
                    <td className="px-4 py-3"><span className={cn("rounded-full px-2 py-0.5 text-xs font-medium",st.cls)}>{st.label}</span></td>
                    <td className="px-4 py-3 tabular-nums">{c.course_count}</td>
                    <td className="px-4 py-3 tabular-nums">{c.order_count}</td>
                    <td className="px-4 py-3 tabular-nums text-emerald-600 dark:text-emerald-400">¥{Number(c.total_earnings).toFixed(2)}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{fmt(c.created_at)}</td>
                  </tr>
                );})}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab==="orders"&&(
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          {loading?<div className="p-8 text-center text-sm text-muted-foreground">加载中...</div>:orders.length===0?<div className="p-8 text-center text-sm text-muted-foreground">暂无订单</div>:(
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
                <tr>{["订单号","买家手机","金额","平台分成","状态","支付时间","创建时间"].map(h=><th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {orders.map(o=>{const st=ST[o.status]??{label:o.status,cls:""};const platform=o.total_amount-o.creator_amount;return(
                  <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{o.out_trade_no.slice(-8)}</td>
                    <td className="px-4 py-3">{o.buyer_phone?o.buyer_phone.replace(/(\d{3})\d{4}(\d{4})/,"$1****$2"):"匿名"}</td>
                    <td className="px-4 py-3 tabular-nums font-medium">¥{Number(o.total_amount).toFixed(2)}</td>
                    <td className="px-4 py-3 tabular-nums text-emerald-600">¥{platform.toFixed(2)}</td>
                    <td className="px-4 py-3"><span className={cn("rounded-full px-2 py-0.5 text-xs font-medium",st.cls)}>{st.label}</span></td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{o.paid_at?fmt(o.paid_at):"—"}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{fmt(o.created_at)}</td>
                  </tr>
                );})}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
