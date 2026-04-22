import * as React from "react";
import { Link, useParams } from "react-router-dom";
import {
  Check,
  ChevronLeft,
  Copy,
  Heart,
  Play,
  ShoppingCart,
  Star,
  User,
} from "lucide-react";
import {
  getCourseById,
  CATEGORY_COVER_GRADIENT,
  formatCoursePrice,
  formatStudentCount,
  type CourseCategory,
} from "@/data/courses";
import { copyToClipboard } from "@/lib/copyToClipboard";
import {
  readCourseProgress,
  writeCourseProgress,
} from "@/lib/courseProgress";
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

export function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { phone, setLoginOpen } = useAuth();
  const { showToast } = useToast();
  const { isPurchased, addPurchase, isFavorite, toggleFavorite } = useCourseUser();
  const [copyLabel, setCopyLabel] = React.useState<"idle" | "copied" | "error">(
    "idle",
  );
  const [payDialogOpen, setPayDialogOpen] = React.useState(false);
  const [promoSecondsLeft, setPromoSecondsLeft] = React.useState(
    randomCountdownSeconds20to24h,
  );
  const [studyPct, setStudyPct] = React.useState(0);
  const progressSaveToastDebounceRef = React.useRef<number>(0);

  const course = courseId ? getCourseById(courseId) : undefined;
  const purchasedEarly = Boolean(course && isPurchased(course.id));

  React.useEffect(() => {
    if (!course || !purchasedEarly) return;
    setStudyPct(readCourseProgress(course.id));
  }, [course, purchasedEarly]);

  React.useEffect(() => {
    return () => {
      window.clearTimeout(progressSaveToastDebounceRef.current);
    };
  }, []);

  React.useEffect(() => {
    if (courseId) {
      setPromoSecondsLeft(randomCountdownSeconds20to24h());
    }
  }, [courseId]);

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

  function handleConfirmPay() {
    addPurchase(activeCourse.id);
    setPayDialogOpen(false);
    showToast("购买成功！开始学习吧 🎉", "success");
  }

  return (
    <main className="mx-auto min-w-0 max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="w-[min(100vw-2rem,28rem)]">
          <DialogHeader>
            <DialogTitle>确认购买</DialogTitle>
            <DialogDescription>
              请核对课程与金额，确认后模拟支付成功（演示环境）。
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
                {formatCoursePrice(activeCourse.price)}
              </span>
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPayDialogOpen(false)}
            >
              取消
            </Button>
            <Button type="button" onClick={handleConfirmPay}>
              确认支付
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
                      document
                        .getElementById(`chapter-row-${ch.id}`)
                        ?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
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
                  模拟学习进度
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

          <section aria-labelledby="chapters-heading">
            <h2
              id="chapters-heading"
              className="text-lg font-semibold tracking-tight"
            >
              课程目录
            </h2>
            <div className="mt-4 overflow-hidden rounded-xl border border-border/80 bg-card">
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
          </section>

          <section className="space-y-6" aria-labelledby="content-heading">
            <h2
              id="content-heading"
              className="text-lg font-semibold tracking-tight"
            >
              课程内容
            </h2>
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
          </section>
        </div>

        <aside className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">
            <Card className="border-border/80 shadow-md">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">解锁完整课程</CardTitle>
                <CardDescription>一次购买，长期回放（演示文案）</CardDescription>
                <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 pt-2">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-3xl font-bold tracking-tight">
                      {formatCoursePrice(activeCourse.price)}
                    </span>
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
                  {!purchased && (
                    <p className="text-right text-sm font-medium leading-tight text-orange-600 dark:text-orange-400">
                      限时优惠，剩余{" "}
                      <span className="tabular-nums text-red-600 dark:text-red-400">
                        {formatCountdownHms(promoSecondsLeft)}
                      </span>
                    </p>
                  )}
                </div>
                {activeCourse.isVipFree && (
                  <p className="text-xs text-primary">
                    开通会员可免费学习本课（演示说明）
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full gap-2"
                  size="lg"
                  type="button"
                  onClick={handlePrimaryPurchaseClick}
                >
                  {purchased ? (
                    <Play className="h-4 w-4" />
                  ) : (
                    <ShoppingCart className="h-4 w-4" />
                  )}
                  {purchased ? "已购买，去学习" : "立即购买"}
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
