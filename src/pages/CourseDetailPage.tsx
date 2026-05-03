import * as React from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Check,
  ChevronLeft,
  Copy,
  Heart,
  Megaphone,
  MessageSquare,
  Play,
  ShoppingCart,
  Star,
  ThumbsUp,
  User,
} from "lucide-react";
import {
  CATEGORY_COVER_GRADIENT,
  formatCoursePrice,
  formatStudentCount,
  type CourseCategory,
} from "@/data/courses";
import { useCoursesCatalog } from "@/contexts/CoursesCatalogContext";
import { copyToClipboard } from "@/lib/copyToClipboard";
import {
  readCourseProgress,
  writeCourseProgress,
} from "@/lib/courseProgress";
import { resolveApiUrl } from "@/lib/apiBase";
import {
  claimCoupon,
  fetchCouponPreview,
  fetchCouponsAvailable,
  type CouponPreview,
  type CouponTemplate,
} from "@/lib/couponApi";
import { fetchSeckillByCourse, purchaseSeckill, type SeckillActivity } from "@/lib/seckillApi";
import { getSiteUserToken } from "@/lib/siteUserAuth";
import {
  fetchUserCourseProgress,
  postLearningSession,
  postUserCourseProgress,
} from "@/lib/userProgressApi";
import { useAuth } from "@/contexts/AuthContext";
import { useCourseUser } from "@/contexts/CourseUserContext";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { createDistributionLink } from "@/lib/distributionApi";
import {
  consumePendingDistributionRefForCourse,
  getDistributionRefForCourse,
  saveDistributionRefForCourse,
  setPendingDistributionRef,
} from "@/lib/distributionRefStorage";
import { RatingStars } from "@/components/RatingStars";
import {
  fetchCourseReviews,
  fetchReviewCheck,
  markHelpful,
  submitReview,
  type CourseReview,
} from "@/lib/courseReviewApi";
import { Textarea } from "@/components/ui/textarea";

function chapterTypeLabel(type: string) {
  const map: Record<string, string> = {
    video: "视频",
    doc: "文档",
    live: "直播",
    quiz: "测验",
  };
  return map[type] ?? type;
}

function tagBadgeClass(category: CourseCategory) {
  if (category === "money")
    return "bg-amber-500/15 text-amber-900 ring-1 ring-amber-500/25 dark:text-amber-100";
  if (category === "prompt")
    return "bg-violet-500/10 text-violet-900 ring-1 ring-violet-500/20 dark:text-violet-100";
  return "bg-emerald-500/10 text-emerald-900 ring-1 ring-emerald-500/20 dark:text-emerald-100";
}

function instructorAvatarGradientClass(category: CourseCategory) {
  if (category === "money") return "from-amber-500 to-orange-600";
  if (category === "prompt") return "from-violet-500 to-fuchsia-600";
  return "from-emerald-500 to-teal-600";
}

function formatCountdownHms(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => n.toString().padStart(2, "0")).join(":");
}

function randomCountdownSeconds20to24h() {
  const low = 20 * 3600;
  const high = 24 * 3600;
  return low + Math.floor(Math.random() * (high - low + 1));
}

function describeCouponRule(c: { type: string; value: number; condition_amount: number }): string {
  const cond = c.condition_amount > 0 ? `满¥${c.condition_amount}可用` : "无门槛";
  if (String(c.type).toLowerCase() === "percent") return `${c.value}% 折扣（${cond}）`;
  return `减 ¥${c.value}（${cond}）`;
}

function customServicePitch(category: CourseCategory): string {
  if (category === "money") {
    return "正在学变现与获客？我们可帮你把副业网站、落地页直接做出来，承接咨询与收款。";
  }
  if (category === "tools") {
    return "正在用 Cursor 做产品？我们可承接开发交付，把你的课内原型推进到可上线版本。";
  }
  return "想把课里的方法论落成文档、设计与自动化？我们可按模块拆分交付。";
}

/** 与课程综合评分大致匹配的五星占比（用于展示分布条） */
function starBarPercents(rating: number): [number, number, number, number, number] {
  if (rating >= 4.95) return [80, 15, 3, 1, 1];
  if (rating >= 4.9) return [77, 17, 4, 1, 1];
  if (rating >= 4.85) return [74, 18, 5, 2, 1];
  if (rating >= 4.8) return [70, 20, 6, 2, 2];
  if (rating >= 4.75) return [68, 21, 7, 2, 2];
  if (rating >= 4.7) return [64, 23, 9, 2, 2];
  if (rating >= 4.65) return [61, 24, 10, 3, 2];
  return [58, 26, 11, 3, 2];
}

function formatReviewDate(iso: string) {
  const d = new Date(iso.includes("T") ? iso : iso.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("zh-CN", { dateStyle: "short", timeStyle: "short" });
}

function StarRatingRow({
  rating,
  size = "md",
}: {
  rating: number;
  size?: "sm" | "md";
}) {
  const filled = Math.round(Math.min(5, Math.max(1, rating)));
  const iconClass =
    size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4 sm:h-5 sm:w-5";
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating.toFixed(1)} 分`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            iconClass,
            i < filled
              ? "fill-amber-400 text-amber-400"
              : "fill-transparent text-muted-foreground/35",
          )}
          aria-hidden
        />
      ))}
    </div>
  );
}

export function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { getCourseById } = useCoursesCatalog();
  const { phone, setLoginOpen } = useAuth();
  const { showToast } = useToast();
  const { isPurchased, isFavorite, toggleFavorite } = useCourseUser();
  const purchasedForBanner = Boolean(courseId && isPurchased(courseId));
  const [copyLabel, setCopyLabel] = React.useState<"idle" | "copied" | "error">(
    "idle",
  );
  const [payDialogOpen, setPayDialogOpen] = React.useState(false);
  const [promoSecondsLeft, setPromoSecondsLeft] = React.useState(
    randomCountdownSeconds20to24h,
  );
  const [studyPct, setStudyPct] = React.useState(0);
  const [detailTab, setDetailTab] = React.useState<
    "chapters" | "content" | "reviews"
  >("chapters");
  const [paySubmitting, setPaySubmitting] = React.useState(false);
  const [promoteDialogOpen, setPromoteDialogOpen] = React.useState(false);
  const [promoteUrl, setPromoteUrl] = React.useState("");
  const [promoteLoading, setPromoteLoading] = React.useState(false);
  const [seckillAct, setSeckillAct] = React.useState<SeckillActivity | null>(null);
  const [checkoutPreview, setCheckoutPreview] = React.useState<CouponPreview | null>(null);
  const [availableCoupons, setAvailableCoupons] = React.useState<CouponTemplate[]>([]);
  const [seckillSecondsLeft, setSeckillSecondsLeft] = React.useState(0);
  const [claimingCouponId, setClaimingCouponId] = React.useState<number | null>(null);
  const [apiReviews, setApiReviews] = React.useState<CourseReview[]>([]);
  const [avgRating, setAvgRating] = React.useState(0);
  const [totalReviews, setTotalReviews] = React.useState(0);
  const [reviewPage, setReviewPage] = React.useState(1);
  const [reviewLoading, setReviewLoading] = React.useState(false);
  const [hasMoreReviews, setHasMoreReviews] = React.useState(false);
  const [showReviewModal, setShowReviewModal] = React.useState(false);
  const [newRating, setNewRating] = React.useState(5);
  const [newContent, setNewContent] = React.useState("");
  const [submittingReview, setSubmittingReview] = React.useState(false);
  const [reviewCheck, setReviewCheck] = React.useState<{
    canSubmit: boolean;
    hasReviewed: boolean;
    purchased: boolean;
  } | null>(null);
  const [reviewCheckLoading, setReviewCheckLoading] = React.useState(false);
  const progressSaveToastDebounceRef = React.useRef<number>(0);
  const progressPostDebounceRef = React.useRef<number>(0);
  const progressServerSentRef = React.useRef<number | null>(null);

  const course = courseId ? getCourseById(courseId) : undefined;
  const purchasedEarly = Boolean(course && isPurchased(course.id));

  const queueProgressPost = React.useCallback(
    (pct: number) => {
      if (!getSiteUserToken() || !course?.id) return;
      window.clearTimeout(progressPostDebounceRef.current);
      const prev = progressServerSentRef.current;
      const bigJump = prev == null || Math.abs(pct - prev) >= 5;
      const run = () => {
        void postUserCourseProgress(course.id, pct)
          .then(() => {
            progressServerSentRef.current = pct;
          })
          .catch(() => {});
      };
      if (bigJump) run();
      else progressPostDebounceRef.current = window.setTimeout(run, 10_000);
    },
    [course?.id],
  );

  React.useEffect(() => {
    progressServerSentRef.current = null;
    window.clearTimeout(progressPostDebounceRef.current);
  }, [course?.id]);

  React.useEffect(() => {
    if (!course || !purchasedEarly) return;
    const local = readCourseProgress(course.id);
    setStudyPct(local);
    let cancelled = false;
    void fetchUserCourseProgress(course.id).then((srv) => {
      if (cancelled) return;
      const merged = srv != null ? Math.max(local, srv) : local;
      setStudyPct(merged);
      progressServerSentRef.current = merged;
    });
    return () => {
      cancelled = true;
    };
  }, [course, purchasedEarly]);

  const learningSessionStartRef = React.useRef<number>(Date.now());

  React.useEffect(() => {
    if (!course || !purchasedEarly || !getSiteUserToken()) return;
    const cid = course.id;
    learningSessionStartRef.current = Date.now();
    const flushSession = () => {
      if (!getSiteUserToken()) return;
      const end = Date.now();
      const sec = Math.floor((end - learningSessionStartRef.current) / 1000);
      if (sec < 5) return;
      learningSessionStartRef.current = end;
      void postLearningSession(cid, sec).catch(() => {});
    };
    const onVisibility = () => {
      if (document.hidden) {
        flushSession();
      } else {
        learningSessionStartRef.current = Date.now();
      }
    };
    const onPageHide = () => flushSession();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      flushSession();
    };
  }, [course?.id, purchasedEarly]);

  React.useEffect(() => {
    return () => {
      window.clearTimeout(progressSaveToastDebounceRef.current);
      window.clearTimeout(progressPostDebounceRef.current);
    };
  }, []);

  React.useEffect(() => {
    if (courseId) {
      setPromoSecondsLeft(randomCountdownSeconds20to24h());
      setDetailTab("chapters");
    }
  }, [courseId]);

  React.useEffect(() => {
    if (!courseId) return;
    const ref = searchParams.get("ref")?.trim();
    if (ref) {
      if (phone) {
        saveDistributionRefForCourse(courseId, ref);
      } else {
        setPendingDistributionRef(ref, courseId);
      }
    } else if (phone) {
      consumePendingDistributionRefForCourse(courseId);
    }
  }, [searchParams, courseId, phone]);

  React.useEffect(() => {
    if (!courseId) return;
    let cancelled = false;
    void fetchSeckillByCourse(courseId).then((r) => {
      if (!cancelled) setSeckillAct(r);
    });
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  React.useEffect(() => {
    if (!courseId || !phone || !getSiteUserToken()) {
      setCheckoutPreview(null);
      setAvailableCoupons([]);
      return;
    }
    let cancelled = false;
    void Promise.all([fetchCouponPreview(courseId), fetchCouponsAvailable()]).then(([p, av]) => {
      if (!cancelled) {
        setCheckoutPreview(p);
        setAvailableCoupons(av);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [courseId, phone]);

  const seckillBanner = checkoutPreview?.seckill ?? seckillAct;

  React.useEffect(() => {
    if (!seckillBanner || purchasedForBanner) {
      setSeckillSecondsLeft(0);
      return;
    }
    const tick = () => {
      const e = new Date(String(seckillBanner.end_time).replace(" ", "T")).getTime();
      setSeckillSecondsLeft(Math.max(0, Math.floor((e - Date.now()) / 1000)));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [seckillBanner, purchasedForBanner]);

  React.useEffect(() => {
    const id = window.setInterval(() => {
      setPromoSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  React.useEffect(() => {
    if (course) {
      document.title = `${course.title} - AIlearn Pro`;
    } else {
      document.title = "课程不存在 - AIlearn Pro";
    }
  }, [course, courseId]);

  const loadReviews = React.useCallback(
    async (page: number, append: boolean) => {
      if (!courseId) return;
      setReviewLoading(true);
      try {
        const res = await fetchCourseReviews(courseId, page, 5);
        if (res.success && res.data) {
          const { reviews: newReviews, total, avgRating: ag, totalReviews: tr } = res.data;
          setAvgRating(ag);
          setTotalReviews(tr);
          setApiReviews((prev) => {
            const next = append ? [...prev, ...newReviews] : newReviews;
            setHasMoreReviews(total > next.length);
            return next;
          });
          setReviewPage(page);
        }
      } catch (e) {
        showToast(e instanceof Error ? e.message : "加载评价失败", "error");
      } finally {
        setReviewLoading(false);
      }
    },
    [courseId, showToast],
  );

  React.useEffect(() => {
    if (!courseId) {
      setApiReviews([]);
      setTotalReviews(0);
      setAvgRating(0);
      setHasMoreReviews(false);
      return;
    }
    void loadReviews(1, false);
  }, [courseId, loadReviews]);

  React.useEffect(() => {
    if (!courseId || !phone || !getSiteUserToken()) {
      setReviewCheck(null);
      setReviewCheckLoading(false);
      return;
    }
    let cancelled = false;
    setReviewCheckLoading(true);
    void fetchReviewCheck(courseId)
      .then((d) => {
        if (!cancelled) setReviewCheck(d);
      })
      .catch(() => {
        if (!cancelled) setReviewCheck(null);
      })
      .finally(() => {
        if (!cancelled) setReviewCheckLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [courseId, phone]);

  const payPriceNum = React.useMemo(() => {
    if (!course) return 0;
    if (checkoutPreview) return Number(checkoutPreview.best.finalPrice) || course.price;
    if (seckillAct && seckillAct.stock > 0) {
      const now = Date.now();
      const s = new Date(String(seckillAct.start_time).replace(" ", "T")).getTime();
      const e = new Date(String(seckillAct.end_time).replace(" ", "T")).getTime();
      if (Number.isFinite(s) && Number.isFinite(e) && now >= s && now <= e) {
        return Number(seckillAct.seckill_price) || course.price;
      }
    }
    return course.price;
  }, [course, checkoutPreview, seckillAct]);

  if (!course) {
    return (
      <main className="mx-auto min-w-0 max-w-6xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold">课程不存在</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          请从课程列表重新选择。
        </p>
        <Button className="mt-6" asChild>
          <Link to="/courses">返回课程列表</Link>
        </Button>
      </main>
    );
  }

  const activeCourse = course;
  const cover = CATEGORY_COVER_GRADIENT[activeCourse.category];
  const discount =
    activeCourse.originalPrice > activeCourse.price
      ? Math.round((1 - activeCourse.price / activeCourse.originalPrice) * 100)
      : 0;

  const purchased = isPurchased(activeCourse.id);
  const favorited = isFavorite(activeCourse.id);
  const firstLessonCaption = "第1课：课程介绍（免费试看）";
  const applicableList = checkoutPreview?.applicableUserCoupons ?? [];
  const claimableHere = React.useMemo(() => {
    const cid = String(activeCourse.id);
    return availableCoupons.filter(
      (c) => c.applicable_courses.length === 0 || c.applicable_courses.includes(cid),
    );
  }, [availableCoupons, activeCourse.id]);

  async function handleSubmitReview() {
    if (!newContent.trim()) {
      showToast("请填写评价内容", "error");
      return;
    }
    setSubmittingReview(true);
    try {
      await submitReview(activeCourse.id, newRating, newContent.trim());
      setShowReviewModal(false);
      setNewContent("");
      setNewRating(5);
      setReviewCheck((c) => (c ? { ...c, hasReviewed: true, canSubmit: false } : c));
      await loadReviews(1, false);
      showToast("提交成功，审核通过后将公开展示", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "提交失败", "error");
    } finally {
      setSubmittingReview(false);
    }
  }

  async function handleReviewHelpful(reviewId: number) {
    if (!getSiteUserToken()) {
      setLoginOpen(true);
      return;
    }
    try {
      const { helpful_count: hc, alreadyMarked } = await markHelpful(reviewId);
      setApiReviews((prev) => prev.map((r) => (r.id === reviewId ? { ...r, helpful_count: hc } : r)));
      if (alreadyMarked) {
        showToast("您已标记过有用", "info");
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : "操作失败", "error");
    }
  }

  async function handleCopyPrompt() {
    const ok = await copyToClipboard(activeCourse.samplePrompt);
    if (ok) {
      setCopyLabel("copied");
      showToast("提示词已复制到剪贴板 ✓", "success");
      window.setTimeout(() => setCopyLabel("idle"), 2000);
    } else {
      setCopyLabel("error");
      window.setTimeout(() => setCopyLabel("idle"), 2500);
    }
  }

  function handlePrimaryPurchaseClick() {
    if (!phone) {
      setLoginOpen(true);
      return;
    }
    if (purchased) {
      showToast("播放功能即将上线，敬请期待", "info");
      return;
    }
    setPayDialogOpen(true);
  }

  async function handleClaimCoupon(tplId: number) {
    if (!phone) {
      setLoginOpen(true);
      return;
    }
    if (!courseId || !getSiteUserToken()) return;
    setClaimingCouponId(tplId);
    try {
      await claimCoupon(tplId);
      showToast("领取成功", "success");
      const [p, av] = await Promise.all([
        fetchCouponPreview(courseId),
        fetchCouponsAvailable(),
      ]);
      setCheckoutPreview(p);
      setAvailableCoupons(av);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "领取失败", "error");
    } finally {
      setClaimingCouponId(null);
    }
  }

  async function handleConfirmPay() {
    if (!phone) {
      setLoginOpen(true);
      return;
    }
    setPaySubmitting(true);
    try {
      if (checkoutPreview?.best.mode === "seckill" && checkoutPreview.seckill) {
        const data = await purchaseSeckill(checkoutPreview.seckill.id);
        if (data.devSimulate && data.outTradeNo) {
          setPayDialogOpen(false);
          const q = new URLSearchParams({
            outTradeNo: data.outTradeNo,
            courseId: String(activeCourse.id),
            amount: String(data.amount ?? payPriceNum),
            courseName: activeCourse.title,
          });
          navigate(`/pay/dev-simulate?${q.toString()}`);
          return;
        }
        if (data.payUrl) {
          setPayDialogOpen(false);
          window.location.href = data.payUrl;
          return;
        }
        throw new Error("未返回支付链接");
      }

      const createOrderUrl = resolveApiUrl("/api/pay/create-order");
      const distributorRef = getDistributionRefForCourse(activeCourse.id);
      const payload: Record<string, unknown> = {
        courseId: activeCourse.id,
        userId: phone,
        amount: payPriceNum,
        courseName: activeCourse.title,
      };
      if (checkoutPreview?.best.mode === "coupon" && checkoutPreview.best.user_coupon_id) {
        payload.userCouponId = checkoutPreview.best.user_coupon_id;
      }
      if (distributorRef) {
        payload.distributorRef = distributorRef;
      }
      const res = await fetch(createOrderUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data: {
        payUrl?: string | null;
        message?: string;
        devSimulate?: boolean;
        outTradeNo?: string;
      } = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || `下单失败（${res.status}）`);
      }
      if (data.devSimulate && data.outTradeNo) {
        setPayDialogOpen(false);
        const q = new URLSearchParams({
          outTradeNo: data.outTradeNo,
          courseId: String(activeCourse.id),
          amount: String(payPriceNum),
          courseName: activeCourse.title,
        });
        navigate(`/pay/dev-simulate?${q.toString()}`);
        return;
      }
      if (!data.payUrl) {
        throw new Error("未返回支付链接，请检查支付服务配置或开启 PAY_DEV_SIMULATE=1 走模拟支付");
      }
      setPayDialogOpen(false);
      window.location.href = data.payUrl;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "下单失败";
      showToast(msg, "error");
    } finally {
      setPaySubmitting(false);
    }
  }

  async function handleOpenPromote() {
    if (!phone) {
      setLoginOpen(true);
      return;
    }
    setPromoteDialogOpen(true);
    setPromoteUrl("");
    setPromoteLoading(true);
    try {
      const { shareUrl } = await createDistributionLink(activeCourse.id, phone);
      setPromoteUrl(shareUrl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "生成推广链接失败";
      showToast(msg, "error");
      setPromoteDialogOpen(false);
    } finally {
      setPromoteLoading(false);
    }
  }

  async function handleCopyPromoteUrl() {
    if (!promoteUrl) return;
    const ok = await copyToClipboard(promoteUrl);
    showToast(ok ? "链接已复制" : "复制失败，请手动选择", ok ? "success" : "error");
  }

  const promoteQrSrc = promoteUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(promoteUrl)}`
    : "";

  return (
    <main className="mx-auto min-w-0 max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <Dialog open={promoteDialogOpen} onOpenChange={setPromoteDialogOpen}>
        <DialogContent className="w-[min(100vw-2rem,24rem)]">
          <DialogHeader>
            <DialogTitle>推广赚钱</DialogTitle>
            <DialogDescription>
              分享下方链接或海报二维码。佣金比例以创建链接时为准（默认由平台配置）；好友支付成功后佣金先进入「待结算」，期满自动转入可提现余额。未登录用户通过推广链接进入时，系统会在本机暂存推广参数，登录后再打开同一课程即可关联订单。
            </DialogDescription>
          </DialogHeader>
          {promoteLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              正在生成专属链接…
            </p>
          ) : promoteUrl ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 rounded-lg border border-border/60 bg-muted/25 p-4">
                <img
                  src={promoteQrSrc}
                  width={200}
                  height={200}
                  alt="推广链接二维码"
                  className="rounded-md bg-white p-2"
                />
                <p className="text-center text-xs text-muted-foreground">
                  扫码打开购买页（含您的推广参数）
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <p className="text-xs font-medium text-muted-foreground">专属链接</p>
                <p className="mt-1 break-all text-sm leading-snug text-foreground">
                  {promoteUrl}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={() => void handleCopyPromoteUrl()}
              >
                <Copy className="h-4 w-4" />
                复制链接
              </Button>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setPromoteDialogOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent className="w-[min(100vw-2rem,28rem)]">
          <DialogHeader>
            <DialogTitle>评价课程</DialogTitle>
            <DialogDescription>提交后需管理员审核，通过后将展示在学员真实评价中。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">评分</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="rounded p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => setNewRating(star)}
                    aria-label={`${star} 星`}
                  >
                    <Star
                      className={cn(
                        "h-7 w-7",
                        star <= newRating
                          ? "fill-amber-400 text-amber-400"
                          : "fill-transparent text-muted-foreground/35",
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="review-content" className="mb-2 block text-sm font-medium text-foreground">
                评价内容
              </label>
              <Textarea
                id="review-content"
                rows={4}
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="分享你的学习心得…"
                maxLength={2000}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setShowReviewModal(false)}>
              取消
            </Button>
            <Button type="button" disabled={submittingReview} onClick={() => void handleSubmitReview()}>
              {submittingReview ? "提交中…" : "提交评价"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="w-[min(100vw-2rem,28rem)]">
          <DialogHeader>
            <DialogTitle>确认购买</DialogTitle>
            <DialogDescription>
              请核对课程信息与应付金额。确认后将跳转支付宝手机网站完成支付，支付成功后会自动返回并解锁课程。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-4 text-sm">
            <p>
              <span className="text-muted-foreground">课程</span>
              <span className="mt-1 block font-medium text-foreground">
                {activeCourse.title}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">应付金额</span>
              <span className="ml-2 text-lg font-bold text-foreground">
                {formatCoursePrice(payPriceNum)}
              </span>
              {payPriceNum < activeCourse.price ? (
                <span className="ml-2 text-sm text-muted-foreground line-through">
                  {formatCoursePrice(activeCourse.price)}
                </span>
              ) : null}
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={paySubmitting}
              onClick={() => setPayDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              type="button"
              disabled={paySubmitting}
              onClick={() => void handleConfirmPay()}
            >
              {paySubmitting ? "正在创建订单…" : "确认支付"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <nav
        className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-muted-foreground"
        aria-label="面包屑"
      >
        <Link to="/" className="shrink-0 hover:text-foreground">
          首页
        </Link>
        <span className="shrink-0 text-muted-foreground/70" aria-hidden>
          /
        </span>
        <Link to="/courses" className="shrink-0 hover:text-foreground">
          全部课程
        </Link>
        <span className="shrink-0 text-muted-foreground/70" aria-hidden>
          /
        </span>
        <span className="min-w-0 max-w-full break-words text-foreground">
          {activeCourse.title}
        </span>
      </nav>

      <Button variant="ghost" size="sm" className="mt-4 -ml-2 gap-1 px-2" asChild>
        <Link to="/courses">
          <ChevronLeft className="h-4 w-4" />
          返回列表
        </Link>
      </Button>

      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <header>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{activeCourse.categoryLabel}</Badge>
              {activeCourse.isHot && (
                <Badge className="bg-orange-500 text-white hover:bg-orange-500/90">
                  HOT
                </Badge>
              )}
              {activeCourse.isNew && (
                <Badge className="bg-emerald-600 text-white hover:bg-emerald-600/90">
                  NEW
                </Badge>
              )}
              {activeCourse.isVipFree && (
                <Badge variant="secondary">会员免费</Badge>
              )}
              {activeCourse.tags.map((t) => (
                <Badge
                  key={t}
                  variant="secondary"
                  className={tagBadgeClass(activeCourse.category)}
                >
                  {t}
                </Badge>
              ))}
            </div>
            <h1 className="mt-4 text-balance text-2xl font-bold tracking-tight sm:text-3xl">
              {activeCourse.title}
            </h1>
            <p className="mt-2 text-base font-medium text-foreground/90">
              {activeCourse.subtitle}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <User className="h-4 w-4" />
                {activeCourse.instructorName} · {activeCourse.instructorTitle}
              </span>
              <span className="inline-flex items-center gap-1">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                {activeCourse.rating.toFixed(1)} 分
              </span>
              <span>{formatStudentCount(activeCourse.studentCount)} 人学习</span>
              <span>{activeCourse.totalDuration}</span>
              <span>{activeCourse.chapterCount} 章</span>
              <span>更新 {activeCourse.updatedAt}</span>
            </div>
          </header>

          <section aria-labelledby="video-heading">
            <h2 id="video-heading" className="sr-only">
              课程视频
            </h2>
            <div
              className="relative aspect-video overflow-hidden rounded-xl border border-border/80 shadow-md"
              style={{ background: cover }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/15 to-transparent" />
              <div
                className="pointer-events-none absolute right-3 top-2 select-none text-6xl leading-none opacity-40 drop-shadow-md sm:right-5 sm:top-3 sm:text-7xl"
                aria-hidden
              >
                {activeCourse.coverEmoji}
              </div>
              <div className="absolute left-4 top-4 z-10 flex gap-2">
                {activeCourse.isHot && (
                  <span className="rounded-md bg-orange-500/95 px-2 py-0.5 text-[10px] font-bold text-white">
                    HOT
                  </span>
                )}
                {activeCourse.isNew && (
                  <span className="rounded-md bg-emerald-500/95 px-2 py-0.5 text-[10px] font-bold text-white">
                    NEW
                  </span>
                )}
              </div>
              <div className="relative z-[1] flex h-full w-full flex-col items-center justify-center px-4 py-8 text-center text-white">
                <div
                  className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-full bg-white/30 ring-2 ring-white/50 backdrop-blur-sm sm:h-[5.25rem] sm:w-[5.25rem]"
                  aria-hidden
                >
                  <Play className="ml-1 h-11 w-11 fill-white text-white sm:h-[3.25rem] sm:w-[3.25rem]" />
                </div>
                <p className="mt-5 max-w-lg text-pretty text-sm font-medium leading-snug text-white drop-shadow-md sm:text-base">
                  {firstLessonCaption}
                </p>
              </div>
            </div>

            <nav
              className="mt-4"
              aria-label="课程目录快捷导航"
            >
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                课程目录
              </p>
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 pt-0.5 [scrollbar-width:thin]">
                {activeCourse.chapters.map((ch, idx) => (
                  <button
                    key={ch.id}
                    type="button"
                    className="flex max-w-[min(100%,15rem)] shrink-0 items-center gap-2 rounded-full border border-border/80 bg-muted/50 px-3 py-2 text-left text-sm shadow-sm transition-colors hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => {
                      setDetailTab("chapters");
                      window.requestAnimationFrame(() => {
                        window.requestAnimationFrame(() => {
                          document
                            .getElementById(`chapter-row-${ch.id}`)
                            ?.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            });
                        });
                      });
                    }}
                  >
                    <span className="shrink-0 tabular-nums text-xs font-semibold text-muted-foreground">
                      {idx + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                      {ch.title}
                    </span>
                    {ch.isFree ? (
                      <Badge className="shrink-0 bg-primary/15 px-1.5 py-0 text-[10px] text-primary hover:bg-primary/20">
                        免费
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="shrink-0 px-1.5 py-0 text-[10px]"
                      >
                        付费
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            </nav>

            {purchased && (
              <div className="mt-5 rounded-xl border border-border/80 bg-card p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">
                    当前进度：{studyPct}%
                  </p>
                </div>
                <label
                  className="mt-3 block text-xs text-muted-foreground"
                  htmlFor="study-progress-range"
                >
                  手动更新学习进度
                </label>
                <input
                  id="study-progress-range"
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={studyPct}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setStudyPct(v);
                    writeCourseProgress(activeCourse.id, v);
                    queueProgressPost(v);
                    window.clearTimeout(progressSaveToastDebounceRef.current);
                    progressSaveToastDebounceRef.current = window.setTimeout(
                      () => {
                        showToast("学习进度已保存", "success");
                      },
                      400,
                    );
                  }}
                  className="mt-2 block h-2 w-full cursor-pointer accent-primary"
                />
              </div>
            )}
          </section>

          <section aria-labelledby="highlights-heading">
            <h2
              id="highlights-heading"
              className="text-lg font-semibold tracking-tight"
            >
              学完收获
            </h2>
            <ul className="mt-4 space-y-3 rounded-xl border border-border/80 bg-card p-6 text-sm leading-relaxed text-muted-foreground">
              {activeCourse.highlights.map((item, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {i + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="course-detail-tabs-label">
            <h2
              id="course-detail-tabs-label"
              className="text-lg font-semibold tracking-tight"
            >
              课程详情
            </h2>
            <div
              role="tablist"
              aria-label="课程目录、课程内容与学员评价"
              className="mt-4 flex flex-wrap gap-1 rounded-lg border border-border/80 bg-muted/40 p-1"
            >
              {(
                [
                  ["chapters", "课程目录"],
                  ["content", "课程内容"],
                  ["reviews", "学员评价"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={detailTab === id}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    detailTab === id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => setDetailTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-6" role="tabpanel">
              {detailTab === "chapters" ? (
                <div className="overflow-hidden rounded-xl border border-border/80 bg-card">
                  <ul className="divide-y divide-border/80">
                    {activeCourse.chapters.map((ch, idx) => (
                      <li
                        key={ch.id}
                        id={`chapter-row-${ch.id}`}
                        className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm scroll-mt-24"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="text-xs text-muted-foreground">
                            第 {idx + 1} 章
                          </span>
                          <p className="font-medium text-foreground">{ch.title}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">
                            {chapterTypeLabel(ch.type)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {ch.duration}
                          </span>
                          {ch.isFree ? (
                            <Badge className="bg-primary/15 text-primary hover:bg-primary/20">
                              试看
                            </Badge>
                          ) : (
                            <Badge variant="secondary">付费</Badge>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {detailTab === "content" ? (
                <div className="space-y-6 rounded-xl border border-border/80 bg-card p-6 shadow-sm">
                  {activeCourse.contentSections.map((section) => (
                    <article key={section.heading}>
                      <h3 className="text-base font-semibold">{section.heading}</h3>
                      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                        {section.body}
                      </p>
                    </article>
                  ))}
                </div>
              ) : null}

              {detailTab === "reviews" ? (
                <div className="space-y-8 rounded-xl border border-border/80 bg-card p-6 shadow-sm">
                  <div className="space-y-5 border-b border-border/80 pb-8">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-lg font-semibold tracking-tight text-foreground">
                          学员真实评价
                        </h3>
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                          <RatingStars rating={avgRating} size={20} />
                          <span className="text-sm text-muted-foreground">
                            {totalReviews > 0 ? (
                              <>
                                <span className="font-semibold tabular-nums text-foreground">
                                  {avgRating.toFixed(1)}
                                </span>
                                {" · "}
                                <span className="tabular-nums">{totalReviews}</span> 条已通过审核
                              </>
                            ) : (
                              "暂无已通过审核的评价"
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        {reviewCheckLoading ? (
                          <span className="text-xs text-muted-foreground">资格校验中…</span>
                        ) : reviewCheck?.canSubmit ? (
                          <Button type="button" variant="outline" onClick={() => setShowReviewModal(true)}>
                            写评价
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    {reviewLoading && apiReviews.length === 0 ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">加载评价中…</p>
                    ) : null}

                    <ul className="space-y-5">
                      {apiReviews.map((rev) => (
                        <li
                          key={rev.id}
                          className="rounded-lg border border-border/70 bg-muted/20 p-4 sm:p-5"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium text-foreground">{rev.author_display}</span>
                                <RatingStars rating={rev.rating} size={14} />
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {formatReviewDate(rev.created_at)}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="shrink-0 gap-1 text-muted-foreground hover:text-primary"
                              onClick={() => void handleReviewHelpful(rev.id)}
                            >
                              <ThumbsUp className="h-3.5 w-3.5" aria-hidden />
                              <span className="tabular-nums">{rev.helpful_count}</span>
                            </Button>
                          </div>
                          <p className="mt-3 text-sm leading-relaxed text-foreground">{rev.content}</p>
                          {rev.reply_content ? (
                            <div className="mt-4 rounded-md border border-border/60 bg-background/80 p-3">
                              <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                                <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                                管理员回复
                              </div>
                              <p className="mt-1.5 text-sm text-muted-foreground">{rev.reply_content}</p>
                              {rev.reply_at ? (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {formatReviewDate(rev.reply_at)}
                                </p>
                              ) : null}
                            </div>
                          ) : null}
                        </li>
                      ))}
                    </ul>

                    {hasMoreReviews ? (
                      <div className="flex justify-center pt-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={reviewLoading}
                          onClick={() => void loadReviews(reviewPage + 1, true)}
                        >
                          {reviewLoading ? "加载中…" : "加载更多"}
                        </Button>
                      </div>
                    ) : null}

                    {!reviewLoading && totalReviews === 0 ? (
                      <p className="py-4 text-center text-sm text-muted-foreground">
                        暂无评价，购买课程后可提交首条评价（需审核后展示）
                      </p>
                    ) : null}
                  </div>

                  <p className="text-xs font-medium text-muted-foreground">以下为课程页展示用参考数据</p>

                  <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between lg:gap-12">
                    <div className="shrink-0">
                      <p className="text-5xl font-bold tabular-nums tracking-tight text-foreground">
                        {activeCourse.rating.toFixed(1)}
                      </p>
                      <div className="mt-2">
                        <StarRatingRow rating={activeCourse.rating} />
                      </div>
                      <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
                        综合评分来自学员打分加权，并随评价更新定期校准。
                      </p>
                    </div>
                    <div className="min-w-0 flex-1 space-y-2.5">
                      <p className="text-xs font-medium text-muted-foreground">
                        评分分布
                      </p>
                      {(["5", "4", "3", "2", "1"] as const).map((label, idx) => {
                        const pct = starBarPercents(activeCourse.rating)[idx];
                        return (
                          <div
                            key={label}
                            className="grid grid-cols-[2.25rem_1fr_2.5rem] items-center gap-2 text-xs"
                          >
                            <span className="text-muted-foreground">{label} 星</span>
                            <div className="h-2 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-amber-400/90"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-right tabular-nums text-muted-foreground">
                              {pct}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="border-t border-border/80 pt-8">
                    <h3 className="text-base font-semibold tracking-tight">
                      精选评价
                    </h3>
                    <ul className="mt-4 space-y-4">
                      {activeCourse.reviews.map((r) => (
                        <li key={`${r.date}-${r.name}`}>
                          <Card className="border-border/70 shadow-none">
                            <CardContent className="p-4 sm:p-5">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="flex min-w-0 flex-1 gap-3">
                                  <div
                                    className={cn(
                                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white shadow-inner",
                                      instructorAvatarGradientClass(
                                        activeCourse.category,
                                      ),
                                    )}
                                    aria-hidden
                                  >
                                    {r.avatar}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="font-semibold text-foreground">
                                        {r.name}
                                      </span>
                                      <Badge
                                        variant="secondary"
                                        className="text-[10px] font-normal"
                                      >
                                        {r.tag}
                                      </Badge>
                                    </div>
                                    <div className="mt-1.5">
                                      <StarRatingRow rating={r.rating} size="sm" />
                                    </div>
                                    <p className="mt-3 text-sm leading-relaxed text-foreground">
                                      {r.content}
                                    </p>
                                    <p className="mt-3 text-xs text-muted-foreground">
                                      {r.date}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-6 text-center text-sm text-muted-foreground">
                      共{" "}
                      <span className="font-semibold text-foreground tabular-nums">
                        {activeCourse.reviewCount.toLocaleString("zh-CN")}
                      </span>{" "}
                      条评价
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        </div>

        <aside className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">
            <Card className="border-border/80 shadow-md">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">解锁完整课程</CardTitle>
                <CardDescription>一次购买，永久回放，内容持续更新</CardDescription>
                <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 pt-2">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-3xl font-bold tracking-tight">
                      {formatCoursePrice(payPriceNum)}
                    </span>
                    {activeCourse.price > payPriceNum + 1e-6 && (
                      <span className="text-lg text-muted-foreground line-through">
                        {formatCoursePrice(activeCourse.price)}
                      </span>
                    )}
                    {activeCourse.originalPrice > activeCourse.price && (
                      <>
                        <span className="text-lg text-muted-foreground line-through">
                          {formatCoursePrice(activeCourse.originalPrice)}
                        </span>
                        <Badge variant="secondary" className="font-semibold">
                          限时 {discount}% OFF
                        </Badge>
                      </>
                    )}
                  </div>
                  {!purchased && checkoutPreview?.best.mode === "seckill" && checkoutPreview.seckill ? (
                    <p className="text-right text-sm font-medium leading-tight text-red-600 dark:text-red-400">
                      秒杀进行中 · 剩余库存{" "}
                      <span className="tabular-nums">{checkoutPreview.seckill.stock}</span> · 每人限
                      {checkoutPreview.seckill.limit_per_user} 件
                    </p>
                  ) : !purchased ? (
                    <p className="text-right text-sm font-medium leading-tight text-orange-600 dark:text-orange-400">
                      限时优惠，剩余{" "}
                      <span className="tabular-nums text-red-600 dark:text-red-400">
                        {formatCountdownHms(promoSecondsLeft)}
                      </span>
                    </p>
                  ) : null}
                </div>
                {activeCourse.isVipFree && (
                  <p className="text-xs text-primary">
                    开通会员可免费学习全部课程
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {!purchased && (seckillBanner || applicableList.length > 0 || claimableHere.length > 0) ? (
                  <div className="space-y-3 rounded-lg border border-border/70 bg-muted/25 p-3 text-sm">
                    {seckillBanner && seckillBanner.stock > 0 ? (
                      <div className="rounded-md border border-red-200/80 bg-red-50/60 px-3 py-2 dark:border-red-900/50 dark:bg-red-950/40">
                        <p className="font-semibold text-red-700 dark:text-red-300">限时秒杀</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          距结束{" "}
                          <span className="font-mono tabular-nums text-foreground">
                            {formatCountdownHms(seckillSecondsLeft)}
                          </span>
                          · 库存{" "}
                          <span className="tabular-nums font-medium text-foreground">{seckillBanner.stock}</span>
                          {checkoutPreview?.best.mode === "seckill" ? (
                            <span className="text-red-600 dark:text-red-400"> · 本单已选秒杀价</span>
                          ) : checkoutPreview?.best.mode === "coupon" ? (
                            <span> · 本单优惠券更优，已自动选用券后价</span>
                          ) : null}
                        </p>
                      </div>
                    ) : null}
                    {applicableList.length > 0 ? (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">可用优惠券</p>
                        <ul className="mt-2 space-y-2">
                          {applicableList.map((row) => (
                            <li
                              key={row.user_coupon_id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 bg-background/80 px-2 py-1.5"
                            >
                              <span className="font-medium text-foreground">{row.name}</span>
                              <span className="text-xs text-muted-foreground">
                                预估 ¥{Number(row.pay_price).toFixed(2)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {claimableHere.length > 0 ? (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">可领取</p>
                        <ul className="mt-2 space-y-2">
                          {claimableHere.map((tpl) => (
                            <li
                              key={tpl.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed border-border/70 bg-background/60 px-2 py-1.5"
                            >
                              <div className="min-w-0">
                                <p className="font-medium text-foreground">{tpl.name}</p>
                                <p className="text-xs text-muted-foreground">{describeCouponRule(tpl)}</p>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                disabled={claimingCouponId === tpl.id}
                                onClick={() => void handleClaimCoupon(tpl.id)}
                              >
                                {claimingCouponId === tpl.id ? "领取中…" : "领取"}
                              </Button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <Button
                  className={cn(
                    "w-full gap-2",
                    !purchased &&
                      checkoutPreview?.best.mode === "seckill" &&
                      "bg-red-600 text-white hover:bg-red-600/90 dark:bg-red-600 dark:hover:bg-red-600/90",
                  )}
                  size="lg"
                  type="button"
                  onClick={handlePrimaryPurchaseClick}
                >
                  {purchased ? (
                    <Play className="h-4 w-4" />
                  ) : (
                    <ShoppingCart className="h-4 w-4" />
                  )}
                  {purchased ? "已购买，去学习" : checkoutPreview?.best.mode === "seckill" ? "立即秒杀" : "立即购买"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  aria-pressed={favorited}
                  onClick={() => {
                    showToast(favorited ? "已取消收藏" : "已收藏", "info");
                    toggleFavorite(activeCourse.id);
                  }}
                >
                  <Heart
                    className={cn(
                      "h-4 w-4 transition-colors",
                      favorited && "fill-red-500 text-red-500",
                    )}
                  />
                  {favorited ? "已收藏" : "加入收藏"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2 border-amber-500/40 text-amber-900 hover:bg-amber-500/10 dark:text-amber-100"
                  onClick={() => void handleOpenPromote()}
                >
                  <Megaphone className="h-4 w-4" />
                  推广赚钱
                </Button>
                <p className="text-center text-[11px] text-muted-foreground">
                  支持企业对公 · 可开发票
                </p>
              </CardContent>
            </Card>

            <Card className="border-amber-500/35 bg-gradient-to-b from-amber-500/10 to-card dark:from-amber-400/10">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-start gap-2 text-base">
                  <span aria-hidden>💡</span>
                  <span>需要定制服务？</span>
                </CardTitle>
                <CardDescription className="text-[13px] leading-relaxed">
                  这门课的技能，我们可以直接帮你落地
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {customServicePitch(activeCourse.category)}
                </p>
                <div className="grid grid-cols-2 gap-2 text-center text-xs font-medium">
                  <span className="rounded-md border border-border/60 bg-muted/50 py-2 text-foreground">
                    网站开发
                  </span>
                  <span className="rounded-md border border-border/60 bg-muted/50 py-2 text-foreground">
                    方案撰写
                  </span>
                  <span className="rounded-md border border-border/60 bg-muted/50 py-2 text-foreground">
                    UI设计
                  </span>
                  <span className="rounded-md border border-border/60 bg-muted/50 py-2 text-foreground">
                    工作流搭建
                  </span>
                </div>
                <Button
                  className="w-full bg-amber-500 text-slate-950 hover:bg-amber-400"
                  asChild
                >
                  <Link to="/services/consult">获取报价</Link>
                </Button>
                <p className="text-center text-[11px] text-muted-foreground">
                  支持企业对公 · 可开发票
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">讲师介绍</CardTitle>
                <CardDescription>平台认证 · 实战导向</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <div
                    className={cn(
                      "flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-lg font-bold text-white shadow-inner",
                      instructorAvatarGradientClass(activeCourse.category),
                    )}
                    aria-hidden
                  >
                    {activeCourse.instructorName.slice(0, 1)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-base font-semibold leading-none">
                        {activeCourse.instructorName}
                      </span>
                      <span
                        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/30"
                        title="平台认证讲师"
                        aria-label="平台认证讲师"
                      >
                        <Check className="h-3 w-3 stroke-[3]" aria-hidden />
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-snug text-muted-foreground">
                      {activeCourse.instructorTitle}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">示例提示词</CardTitle>
                <CardDescription>
                  复制后在 ChatGPT / Claude 等工具中粘贴使用，可按占位符替换你的信息。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <pre className="max-h-48 overflow-x-auto overflow-y-auto break-words rounded-lg border border-border/80 bg-muted/40 p-3 text-left text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                  {activeCourse.samplePrompt}
                </pre>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  type="button"
                  onClick={handleCopyPrompt}
                >
                  <Copy className="h-4 w-4" />
                  {copyLabel === "copied"
                    ? "已复制"
                    : copyLabel === "error"
                      ? "复制失败，请手动选择文本"
                      : "复制提示词"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </aside>
      </div>
    </main>
  );
}
