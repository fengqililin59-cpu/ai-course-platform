import * as React from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { TicketPercent } from "lucide-react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth, type MembershipTier } from "@/contexts/AuthContext";
import { useCourseUser } from "@/contexts/CourseUserContext";
import {
  COURSE_PROGRESS_UPDATED_EVENT,
  readCourseProgress,
} from "@/lib/courseProgress";
import type { Course } from "@/data/courses";
import { useCoursesCatalog } from "@/contexts/CoursesCatalogContext";
import { useToast } from "@/contexts/ToastContext";
import {
  fetchDistributionSummary,
  requestDistributionWithdraw,
  type DistributionSummary,
} from "@/lib/distributionApi";
import {
  fetchGithubOAuthUrl,
  fetchGoogleOAuthUrl,
  fetchOAuthLinks,
  fetchOauthConfig,
  friendlyAuthErrorMessage,
  unlinkOAuth,
} from "@/lib/siteAuthApi";
import { fetchCouponMine, type CouponMineRow } from "@/lib/couponApi";
import { getSiteUserToken } from "@/lib/siteUserAuth";

/** 前台登录标识：手机号 / mail:邮箱 / wx:openId / gh: / google: */
function maskAccount(identity: string): string {
  const s = identity.trim();
  if (s.startsWith("mail:")) {
    const e = s.slice(5);
    const at = e.indexOf("@");
    if (at <= 1) return e;
    return `${e[0]}***${e.slice(at)}`;
  }
  if (s.startsWith("wx:")) {
    const id = s.slice(3);
    if (id.length <= 8) return `微信·${id}`;
    return `微信·${id.slice(0, 4)}…${id.slice(-4)}`;
  }
  if (s.startsWith("gh:")) {
    const id = s.slice(3);
    if (id.length <= 10) return `GitHub·${id}`;
    return `GitHub·${id.slice(0, 4)}…${id.slice(-4)}`;
  }
  if (s.startsWith("google:")) {
    const id = s.slice(7);
    if (id.length <= 12) return `Google·${id}`;
    return `Google·${id.slice(0, 4)}…${id.slice(-4)}`;
  }
  if (/^1\d{10}$/.test(s)) {
    return `${s.slice(0, 3)}****${s.slice(-4)}`;
  }
  return s;
}

function membershipLabel(tier: MembershipTier): string {
  const map: Record<MembershipTier, string> = {
    none: "非会员",
    month: "月会员",
    year: "年会员",
    lifetime: "永久会员",
  };
  return map[tier];
}

function profileProgressStyle(pct: number) {
  const p = Math.min(100, Math.max(0, Math.round(pct)));
  if (p >= 100) {
    return {
      fill: "bg-emerald-500",
      label: "已完成",
      showCheck: true as const,
    };
  }
  if (p >= 71) {
    return {
      fill: "bg-blue-500",
      label: "即将完成",
      showCheck: false as const,
    };
  }
  if (p >= 31) {
    return {
      fill: "bg-amber-400",
      label: "学习中",
      showCheck: false as const,
    };
  }
  return {
    fill: "bg-red-500",
    label: "刚开始",
    showCheck: false as const,
  };
}

type ProfileTab = "courses" | "orders" | "referral" | "coupons";
type CouponFilter = "unused" | "used" | "expired" | "all";

function couponUseHref(row: CouponMineRow): string {
  const apps = row.coupon.applicable_courses;
  if (!apps || apps.length === 0) return "/courses";
  return `/courses/${encodeURIComponent(apps[0])}`;
}

function couponStatusLabel(s: string): string {
  if (s === "unused") return "可用";
  if (s === "used") return "已使用";
  if (s === "expired") return "已过期";
  return s;
}

function withdrawalStatusLabel(s: string): string {
  const map: Record<string, string> = {
    pending: "审核中",
    approved: "已通过",
    rejected: "已拒绝",
    paid: "已打款",
  };
  return map[s] ?? s;
}

function commissionStatusLabel(s: string | undefined): string {
  if (!s || s === "available") return "已入账";
  if (s === "pending_settlement") return "待结算";
  if (s === "cancelled") return "已取消";
  return s;
}

function formatWithdrawalCommissionIds(raw: string | null | undefined): string {
  if (!raw) return "";
  try {
    const a = JSON.parse(raw) as unknown;
    if (!Array.isArray(a) || a.length === 0) return "";
    const first = a[0];
    if (
      typeof first === "object" &&
      first !== null &&
      "id" in first &&
      "amount" in first
    ) {
      return (a as { id: number; amount: number }[])
        .map((x) => `${x.id}(¥${Number(x.amount).toFixed(2)})`)
        .join("，");
    }
    return a.map(String).join("，");
  } catch {
    /* ignore */
  }
  return raw.length > 120 ? `${raw.slice(0, 120)}…` : raw;
}

export function ProfilePage() {
  const { phone, membership, setLoginOpen, logout } = useAuth();
  const { purchasedIds } = useCourseUser();
  const { courses, getCourseById } = useCoursesCatalog();
  const { showToast } = useToast();

  const sampleOrders = React.useMemo(
    () => [
      {
        orderNo: "38472910",
        courseName: courses[0]?.title ?? "课程",
        amount: "¥199",
        status: "已支付",
        date: "2026-04-02",
      },
      {
        orderNo: "92837465",
        courseName: courses[1]?.title ?? "课程",
        amount: "¥149",
        status: "已支付",
        date: "2026-03-18",
      },
      {
        orderNo: "10293847",
        courseName: courses[2]?.title ?? "课程",
        amount: "¥259",
        status: "已支付",
        date: "2026-02-26",
      },
    ],
    [courses],
  );

  React.useEffect(() => {
    document.title = "个人中心 - AIlearn Pro";
  }, []);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = React.useState<ProfileTab>("courses");
  const [oauthCfg, setOauthCfg] = React.useState<{ github: boolean; google: boolean } | null>(null);
  const [oauthLinks, setOauthLinks] = React.useState<{
    github: boolean;
    google: boolean;
    wechat: boolean;
  } | null>(null);
  const [bindBusy, setBindBusy] = React.useState(false);
  const [progressRev, setProgressRev] = React.useState(0);
  const [refSummary, setRefSummary] = React.useState<DistributionSummary | null>(
    null,
  );
  const [refLoading, setRefLoading] = React.useState(false);
  const [refErr, setRefErr] = React.useState("");
  const [withdrawAmount, setWithdrawAmount] = React.useState("");
  const [withdrawAlipay, setWithdrawAlipay] = React.useState("");
  const [withdrawSubmitting, setWithdrawSubmitting] = React.useState(false);
  const [couponRows, setCouponRows] = React.useState<CouponMineRow[]>([]);
  const [couponLoading, setCouponLoading] = React.useState(false);
  const [couponErr, setCouponErr] = React.useState("");
  const [couponFilter, setCouponFilter] = React.useState<CouponFilter>("unused");

  React.useEffect(() => {
    const bump = () => setProgressRev((n) => n + 1);
    window.addEventListener(COURSE_PROGRESS_UPDATED_EVENT, bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener(COURSE_PROGRESS_UPDATED_EVENT, bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  const refreshOAuthBindings = React.useCallback(async () => {
    try {
      const cfg = await fetchOauthConfig();
      setOauthCfg(cfg);
    } catch {
      setOauthCfg({ github: false, google: false });
    }
    try {
      const links = await fetchOAuthLinks();
      setOauthLinks(links);
    } catch {
      setOauthLinks({ github: false, google: false, wechat: false });
    }
  }, []);

  React.useEffect(() => {
    if (!phone) return;
    void refreshOAuthBindings();
  }, [phone, refreshOAuthBindings]);

  React.useEffect(() => {
    const err = searchParams.get("error");
    const bind = searchParams.get("oauth_bind");
    const ok = searchParams.get("success");
    const relevant = Boolean(err) || Boolean(bind && ok === "1");
    if (!relevant) return;

    if (bind === "github" && ok === "1") {
      showToast("GitHub 绑定成功", "success");
    } else if (bind === "google" && ok === "1") {
      showToast("Google 绑定成功", "success");
    } else if (err) {
      const msg: Record<string, string> = {
        oauth_invalid_state: "授权已失效或已使用，请重新发起绑定",
        oauth_already_linked: "该第三方账号已被其他用户绑定",
        oauth_account_has_github: "当前账号已绑定其他 GitHub",
        oauth_account_has_google: "当前账号已绑定其他 Google",
        oauth_link_missing_user: "绑定失败，请重新登录后再试",
        oauth_user_not_found: "用户不存在，请重新登录",
      };
      showToast(msg[err] ?? "绑定失败", "error");
    }
    navigate("/profile", { replace: true });
    void refreshOAuthBindings();
  }, [searchParams, navigate, showToast, refreshOAuthBindings]);

  async function handleOauthUnlink(provider: "github" | "google" | "wechat") {
    const names = { github: "GitHub", google: "Google", wechat: "微信" };
    if (
      !window.confirm(
        `确定解绑 ${names[provider]}？解绑后请确保仍能用手机号、邮箱密码或其它第三方方式登录。`,
      )
    ) {
      return;
    }
    try {
      const msg = await unlinkOAuth(provider);
      showToast(msg, "success");
      await refreshOAuthBindings();
    } catch (e) {
      showToast(friendlyAuthErrorMessage(e, "解绑失败"), "error");
    }
  }

  React.useEffect(() => {
    if (tab !== "coupons") return;
    if (!phone || !getSiteUserToken()) {
      setCouponRows([]);
      return;
    }
    let cancelled = false;
    setCouponLoading(true);
    setCouponErr("");
    void fetchCouponMine()
      .then((rows) => {
        if (!cancelled) setCouponRows(rows);
      })
      .catch((e: unknown) => {
        if (!cancelled) setCouponErr(e instanceof Error ? e.message : "加载失败");
      })
      .finally(() => {
        if (!cancelled) setCouponLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, phone]);

  React.useEffect(() => {
    if (tab !== "referral" || !phone) return;
    let cancelled = false;
    setRefLoading(true);
    setRefErr("");
    void fetchDistributionSummary(phone)
      .then((d) => {
        if (!cancelled) setRefSummary(d);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setRefErr(e instanceof Error ? e.message : "加载失败");
        }
      })
      .finally(() => {
        if (!cancelled) setRefLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, phone]);

  const myCourses = React.useMemo(
    () =>
      purchasedIds
        .map((id) => getCourseById(id))
        .filter((c): c is Course => Boolean(c)),
    [purchasedIds, getCourseById],
  );

  const filteredCoupons = React.useMemo(() => {
    if (couponFilter === "all") return couponRows;
    return couponRows.filter((r) => r.status === couponFilter);
  }, [couponRows, couponFilter]);

  const learningStats = React.useMemo(() => {
    const count = purchasedIds.length;
    if (count === 0) return { count: 0, avg: 0 };
    let sum = 0;
    for (const id of purchasedIds) {
      sum += readCourseProgress(id);
    }
    return { count, avg: Math.round(sum / count) };
  }, [purchasedIds, progressRev]);

  if (!phone) {
    return (
      <main className="mx-auto min-w-0 max-w-lg px-4 py-16 sm:px-6 sm:py-20">
        <Card className="border-dashed">
          <CardHeader className="text-center">
            <CardTitle>个人中心</CardTitle>
            <CardDescription>请先登录后查看课程与订单</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-2 pb-8">
            <p className="text-sm text-muted-foreground">请先登录</p>
            <Button type="button" size="lg" onClick={() => setLoginOpen(true)}>
              登录
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const avatarDigits = React.useMemo(() => {
    if (!phone || phone.length < 2) return "—";
    if (phone.startsWith("mail:")) {
      const e = phone.slice(5);
      const at = e.indexOf("@");
      const local = at > 0 ? e.slice(0, at) : e;
      return local.length >= 2 ? local.slice(-2) : "邮";
    }
    if (phone.startsWith("wx:")) {
      const id = phone.slice(3);
      return id.length >= 2 ? id.slice(-2) : "微";
    }
    if (phone.startsWith("gh:")) {
      const id = phone.slice(3);
      return id.length >= 2 ? id.slice(-2) : "G";
    }
    if (phone.startsWith("google:")) {
      const id = phone.slice(7);
      return id.length >= 2 ? id.slice(-2) : "Go";
    }
    return phone.slice(-2);
  }, [phone]);

  return (
    <main className="mx-auto min-w-0 max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="text-2xl font-bold tracking-tight">个人中心</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        已学习 {learningStats.count} 门课程 · 累计 {learningStats.avg}% 平均进度
      </p>

      <Card className="mt-8 border-border/80">
        <CardContent className="flex flex-col items-center gap-4 p-6 sm:flex-row sm:items-center sm:gap-6 sm:p-8">
          <div
            className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-primary text-3xl font-bold text-primary-foreground shadow-inner"
            aria-hidden
          >
            {avatarDigits}
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="text-lg font-semibold tracking-tight text-foreground">
              {maskAccount(phone)}
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              <Badge variant="secondary" className="text-sm">
                {membershipLabel(membership)}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6 border-border/80">
        <CardHeader>
          <CardTitle>第三方账号</CardTitle>
          <CardDescription>绑定后可用 GitHub / Google 快捷登录（需在服务端配置 OAuth）</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!oauthCfg ? (
            <p className="text-sm text-muted-foreground">加载绑定状态中…</p>
          ) : oauthLinks === null ? (
            <p className="text-sm text-muted-foreground">加载绑定状态中…</p>
          ) : !oauthCfg.github && !oauthCfg.google ? (
            <p className="text-sm text-muted-foreground">当前未开启 GitHub / Google 登录，绑定入口已隐藏。</p>
          ) : (
            <>
              {oauthCfg.github ? (
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium text-foreground">GitHub</p>
                    <p className="text-xs text-muted-foreground">与登录页 OAuth 使用同一应用配置</p>
                  </div>
                  {oauthLinks.github ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">已绑定</Badge>
                      <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => void handleOauthUnlink("github")}>
                        解绑
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      disabled={bindBusy}
                      onClick={() => {
                        setBindBusy(true);
                        void fetchGithubOAuthUrl({ mode: "link" })
                          .then((url) => {
                            window.location.href = url;
                          })
                          .catch((e: unknown) => {
                            showToast(friendlyAuthErrorMessage(e, "无法发起绑定"), "error");
                            setBindBusy(false);
                          });
                      }}
                    >
                      绑定
                    </Button>
                  )}
                </div>
              ) : null}
              {oauthCfg.google ? (
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium text-foreground">Google</p>
                    <p className="text-xs text-muted-foreground">与登录页 OAuth 使用同一应用配置</p>
                  </div>
                  {oauthLinks.google ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">已绑定</Badge>
                      <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => void handleOauthUnlink("google")}>
                        解绑
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      disabled={bindBusy}
                      onClick={() => {
                        setBindBusy(true);
                        void fetchGoogleOAuthUrl({ mode: "link" })
                          .then((url) => {
                            window.location.href = url;
                          })
                          .catch((e: unknown) => {
                            showToast(friendlyAuthErrorMessage(e, "无法发起绑定"), "error");
                            setBindBusy(false);
                          });
                      }}
                    >
                      绑定
                    </Button>
                  )}
                </div>
              ) : null}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">微信</p>
                  <p className="text-xs text-muted-foreground">请在登录弹窗内使用扫码绑定</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{oauthLinks.wechat ? "已绑定" : "未绑定"}</Badge>
                  {oauthLinks.wechat ? (
                    <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => void handleOauthUnlink("wechat")}>
                      解绑
                    </Button>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div
        className="mt-8 flex gap-1 rounded-lg border border-border/80 bg-muted/30 p-1"
        role="tablist"
        aria-label="个人中心内容"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "courses"}
          className={cn(
            "min-h-10 min-w-0 flex-1 rounded-md px-2 py-2.5 text-xs font-medium transition-colors sm:px-3 sm:text-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            tab === "courses"
              ? "bg-background text-foreground shadow-sm ring-1 ring-border"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setTab("courses")}
        >
          我的课程
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "orders"}
          className={cn(
            "min-h-10 min-w-0 flex-1 rounded-md px-2 py-2.5 text-xs font-medium transition-colors sm:px-3 sm:text-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            tab === "orders"
              ? "bg-background text-foreground shadow-sm ring-1 ring-border"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setTab("orders")}
        >
          我的订单
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "coupons"}
          className={cn(
            "min-h-10 min-w-0 flex-1 rounded-md px-2 py-2.5 text-xs font-medium transition-colors sm:px-3 sm:text-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            tab === "coupons"
              ? "bg-background text-foreground shadow-sm ring-1 ring-border"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setTab("coupons")}
        >
          优惠券
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "referral"}
          className={cn(
            "min-h-10 min-w-0 flex-1 rounded-md px-2 py-2.5 text-xs font-medium transition-colors sm:px-3 sm:text-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            tab === "referral"
              ? "bg-background text-foreground shadow-sm ring-1 ring-border"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setTab("referral")}
        >
          推广收益
        </button>
      </div>

      {tab === "courses" ? (
        myCourses.length === 0 ? (
          <Card className="mt-6 border-dashed border-border/80">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              暂无已购课程，去课程页购买后即可在此查看学习进度。
            </CardContent>
          </Card>
        ) : (
          <ul className="mt-6 space-y-4">
            {myCourses.map((course) => {
              const pct = readCourseProgress(course.id);
              const seg = profileProgressStyle(pct);
              return (
                <li key={course.id}>
                  <Card className="overflow-hidden border-border/80">
                    <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-5">
                      <div
                        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/40 text-3xl"
                        aria-hidden
                      >
                        {course.coverEmoji}
                      </div>
                      <div className="min-w-0 flex-1 space-y-2">
                        <p className="font-semibold leading-snug text-foreground">
                          {course.title}
                        </p>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs text-muted-foreground">
                            <span>学习进度</span>
                            <span className="inline-flex items-center gap-1 font-medium text-foreground">
                              {seg.showCheck && (
                                <Check
                                  className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400"
                                  aria-hidden
                                />
                              )}
                              <span>{seg.label}</span>
                              <span className="tabular-nums text-muted-foreground">
                                {pct}%
                              </span>
                            </span>
                          </div>
                          <div
                            className="h-2 overflow-hidden rounded-full bg-muted"
                            role="progressbar"
                            aria-valuenow={pct}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${course.title} 进度 ${pct}%`}
                          >
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                seg.fill,
                              )}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <Button className="w-full shrink-0 sm:w-auto" asChild>
                        <Link to={`/courses/${course.id}`}>继续学习</Link>
                      </Button>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )
      ) : tab === "orders" ? (
        <ul className="mt-6 space-y-3">
          {sampleOrders.map((o) => (
            <li key={o.orderNo}>
              <Card className="border-border/80">
                <CardContent className="space-y-2 p-4 text-sm sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      订单号 {o.orderNo}
                    </span>
                    <Badge variant="outline" className="font-normal">
                      {o.status}
                    </Badge>
                  </div>
                  <p className="font-medium text-foreground">{o.courseName}</p>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-muted-foreground">
                    <span className="text-base font-semibold text-foreground">
                      {o.amount}
                    </span>
                    <span className="text-xs">{o.date}</span>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      ) : tab === "coupons" ? (
        <div className="mt-6 space-y-4">
          {!getSiteUserToken() ? (
            <Card className="border-dashed border-border/80">
              <CardContent className="p-6 text-sm text-muted-foreground">
                请使用带 JWT 的登录方式后查看优惠券（手机验证码登录即可）。
              </CardContent>
            </Card>
          ) : couponLoading ? (
            <p className="text-center text-sm text-muted-foreground">加载中…</p>
          ) : couponErr ? (
            <Card className="border-destructive/40">
              <CardContent className="p-6 text-sm text-destructive">{couponErr}</CardContent>
            </Card>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["unused", "可用"],
                    ["used", "已用"],
                    ["expired", "已过期"],
                    ["all", "全部"],
                  ] as const
                ).map(([key, label]) => (
                  <Button
                    key={key}
                    type="button"
                    size="sm"
                    variant={couponFilter === key ? "default" : "outline"}
                    onClick={() => setCouponFilter(key)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              {filteredCoupons.length === 0 ? (
                <Card className="border-border/80">
                  <CardContent className="flex flex-col items-center gap-2 p-8 text-center text-sm text-muted-foreground">
                    <TicketPercent className="h-8 w-8 opacity-50" aria-hidden />
                    暂无此类优惠券
                  </CardContent>
                </Card>
              ) : (
                <ul className="space-y-3">
                  {filteredCoupons.map((row) => (
                    <li key={row.id}>
                      <Card className="border-border/80">
                        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-foreground">{row.coupon.name}</p>
                              <Badge variant="secondary">{couponStatusLabel(row.status)}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              领取方式 {row.assigned_method} · {row.assigned_at}
                              {row.used_at ? ` · 使用时间 ${row.used_at}` : ""}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              有效期至 {row.coupon.end_time}
                            </p>
                          </div>
                          {row.status === "unused" ? (
                            <Button className="w-full shrink-0 sm:w-auto" asChild>
                              <Link to={couponUseHref(row)}>立即使用</Link>
                            </Button>
                          ) : null}
                        </CardContent>
                      </Card>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {refLoading ? (
            <p className="text-center text-sm text-muted-foreground">加载中…</p>
          ) : refErr ? (
            <Card className="border-destructive/40">
              <CardContent className="p-6 text-sm text-destructive">
                {refErr}
              </CardContent>
            </Card>
          ) : refSummary ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="border-border/80">
                  <CardHeader className="pb-2">
                    <CardDescription>累计产生</CardDescription>
                    <CardTitle className="text-2xl tabular-nums">
                      ¥{refSummary.totalCommission.toFixed(2)}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card className="border-border/80">
                  <CardHeader className="pb-2">
                    <CardDescription>待结算（预计）</CardDescription>
                    <CardTitle className="text-2xl tabular-nums">
                      ¥{refSummary.pendingSettlement.toFixed(2)}
                    </CardTitle>
                    <CardDescription className="pt-1 text-[11px] leading-snug">
                      售后期满后自动转入可提现，当前结算周期约 {refSummary.settleDays ?? 7}{" "}
                      天
                    </CardDescription>
                  </CardHeader>
                </Card>
                <Card className="border-border/80">
                  <CardHeader className="pb-2">
                    <CardDescription>已入账池</CardDescription>
                    <CardTitle className="text-2xl tabular-nums">
                      ¥{refSummary.settledCommission.toFixed(2)}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card className="border-border/80">
                  <CardHeader className="pb-2">
                    <CardDescription>已申请提现 / 冻结</CardDescription>
                    <CardTitle className="text-2xl tabular-nums">
                      ¥{refSummary.pendingAndPaidWithdrawals.toFixed(2)}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>
              <Card className="border-amber-500/30 bg-amber-500/5">
                <CardHeader className="pb-2">
                  <CardDescription>当前可提现余额</CardDescription>
                  <CardTitle className="text-2xl tabular-nums text-amber-900 dark:text-amber-100">
                    ¥{refSummary.available.toFixed(2)}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card className="border-border/80">
                <CardHeader>
                  <CardTitle className="text-base">申请提现</CardTitle>
                  <CardDescription>
                    单笔最低 ¥{refSummary.withdrawMinYuan.toFixed(2)}
                    {refSummary.withdrawFeePercent > 0
                      ? `，手续费 ${refSummary.withdrawFeePercent}%（从申请金额中扣除，详见提交成功提示）`
                      : ""}
                    。提交后由平台审核打款，请填写真实支付宝账号便于核对。
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="wd-amt">
                      提现金额（元）
                    </label>
                    <input
                      id="wd-amt"
                      type="number"
                      min={refSummary.withdrawMinYuan}
                      step={0.01}
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      placeholder={`最低 ¥${refSummary.withdrawMinYuan}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="wd-alipay">
                      支付宝账号（选填）
                    </label>
                    <input
                      id="wd-alipay"
                      type="text"
                      value={withdrawAlipay}
                      onChange={(e) => setWithdrawAlipay(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      placeholder="手机号或邮箱"
                    />
                  </div>
                  <Button
                    type="button"
                    disabled={withdrawSubmitting || !phone}
                    onClick={() => {
                      if (!phone) return;
                      const n = Number(withdrawAmount);
                      const minY = refSummary.withdrawMinYuan;
                      if (!Number.isFinite(n) || n < minY) {
                        showToast(`单笔提现不得低于 ¥${minY}`, "error");
                        return;
                      }
                      setWithdrawSubmitting(true);
                      void requestDistributionWithdraw({
                        phone,
                        amount: n,
                        alipayAccount: withdrawAlipay.trim() || undefined,
                      })
                        .then((r) => {
                          showToast(r.message, "success");
                          setWithdrawAmount("");
                          setWithdrawAlipay("");
                          return fetchDistributionSummary(phone);
                        })
                        .then(setRefSummary)
                        .catch((e: unknown) => {
                          showToast(
                            e instanceof Error ? e.message : "申请失败",
                            "error",
                          );
                        })
                        .finally(() => setWithdrawSubmitting(false));
                    }}
                  >
                    {withdrawSubmitting ? "提交中…" : "提交申请"}
                  </Button>
                </CardContent>
              </Card>

              <div>
                <h2 className="text-base font-semibold tracking-tight">
                  佣金明细
                </h2>
                {refSummary.commissions.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    暂无佣金记录。在课程详情页使用「推广赚钱」生成链接，好友购买成功后将在此展示。
                  </p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {refSummary.commissions.map((c) => {
                      const title =
                        getCourseById(c.course_id)?.title ?? c.course_id;
                      return (
                        <li key={c.id}>
                          <Card className="border-border/80">
                            <CardContent className="space-y-2 p-4 text-sm sm:p-5">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="min-w-0 space-y-1">
                                  <p className="font-medium text-foreground">
                                    {title}
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    <Badge variant="outline" className="text-[10px] font-normal">
                                      {commissionStatusLabel(c.status)}
                                    </Badge>
                                    {c.status === "pending_settlement" &&
                                    c.available_at ? (
                                      <span className="text-[11px] text-muted-foreground">
                                        预计 {c.available_at} 起可提现
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                                <span className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                                  +¥{Number(c.commission_amount).toFixed(2)}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                订单实付 ¥{Number(c.order_amount).toFixed(2)}
                                {c.order_amount_cents != null
                                  ? `（${c.order_amount_cents} 分）`
                                  : ""}{" "}
                                · 佣金比例 {c.rate_percent ?? 20}%
                              </p>
                              <p className="font-mono text-[11px] text-muted-foreground">
                                {c.out_trade_no}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {c.status === "available"
                                  ? (c.paid_at ?? c.created_at)
                                  : c.created_at}
                              </p>
                            </CardContent>
                          </Card>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {refSummary.withdrawals.length > 0 ? (
                <div>
                  <h2 className="text-base font-semibold tracking-tight">
                    提现记录
                  </h2>
                  <ul className="mt-4 space-y-3">
                    {refSummary.withdrawals.map((w) => (
                      <li key={w.id}>
                        <Card className="border-border/80">
                          <CardContent className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm sm:p-5">
                            <div>
                              <p className="font-semibold tabular-nums">
                                ¥{Number(w.amount).toFixed(2)}
                              </p>
                              {w.alipay_account ? (
                                <p className="text-xs text-muted-foreground">
                                  {w.alipay_account}
                                </p>
                              ) : null}
                              {w.commission_ids ? (
                                <p className="text-[11px] font-mono leading-snug text-muted-foreground break-all">
                                  本次占用佣金：{formatWithdrawalCommissionIds(w.commission_ids)}
                                </p>
                              ) : null}
                            </div>
                            <Badge variant="outline">
                              {withdrawalStatusLabel(w.status)}
                            </Badge>
                            <span className="w-full text-xs text-muted-foreground sm:w-auto">
                              {w.created_at}
                            </span>
                          </CardContent>
                        </Card>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      )}

      <div className="mt-10 border-t border-border/80 pt-8">
        <Button
          type="button"
          variant="outline"
          className="w-full sm:max-w-xs"
          onClick={() => {
            logout();
            navigate("/");
          }}
        >
          退出登录
        </Button>
      </div>
    </main>
  );
}
