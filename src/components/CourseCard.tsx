import * as React from "react";
import { Link } from "react-router-dom";
import type { Course, CourseCategory } from "@/data/courses";
import {
  CATEGORY_COVER_GRADIENT,
  formatCoursePrice,
  formatStudentCount,
} from "@/data/courses";
import type { ServiceListing } from "@/data/services";
import { formatPriceFrom } from "@/data/services";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

export type CourseCardProps =
  | {
      course: Course;
      className?: string;
      highlightKeyword?: string;
    }
  | {
      service: ServiceListing;
      className?: string;
      highlightKeyword?: string;
    };

function TitleHighlight({
  title,
  keyword,
}: {
  title: string;
  keyword?: string;
}) {
  const kw = keyword?.trim();
  if (!kw) {
    return <>{title}</>;
  }
  const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(${escaped})`, "gi");
  const parts = title.split(re);
  const kwLower = kw.toLowerCase();
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === kwLower ? (
          <mark
            key={i}
            className="rounded-sm bg-yellow-200/95 px-0.5 text-inherit dark:bg-yellow-500/45"
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        ),
      )}
    </>
  );
}

function tagBadgeClass(category: CourseCategory) {
  if (category === "money")
    return "bg-amber-500/15 text-amber-900 ring-1 ring-amber-500/25 hover:bg-amber-500/20 dark:text-amber-100";
  if (category === "prompt")
    return "bg-violet-500/10 text-violet-900 ring-1 ring-violet-500/20 hover:bg-violet-500/15 dark:text-violet-100";
  return "bg-emerald-500/10 text-emerald-900 ring-1 ring-emerald-500/20 hover:bg-emerald-500/15 dark:text-emerald-100";
}

export function CourseCard(props: CourseCardProps) {
  const [emojiVisible, setEmojiVisible] = React.useState(false);
  const entityId = "service" in props ? props.service.id : props.course.id;

  React.useEffect(() => {
    const id = requestAnimationFrame(() => setEmojiVisible(true));
    return () => cancelAnimationFrame(id);
  }, [entityId]);

  if ("service" in props) {
    const { service, className, highlightKeyword } = props;
    const cover = CATEGORY_COVER_GRADIENT[service.visualCategory];

    return (
      <Link
        to={`/services/${service.id}`}
        className={cn(
          "block rounded-xl no-underline text-inherit outline-none transition-transform focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          className,
        )}
      >
        <Card className="h-full overflow-hidden border-border/70 transition-shadow hover:shadow-lg">
          <div className="flex min-w-0 flex-col sm:flex-row">
            <div
              className="relative flex h-40 shrink-0 items-center justify-center sm:h-auto sm:w-44 sm:min-h-[11rem]"
              style={{ background: cover }}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.22),transparent_45%)]" />
              <div
                className={cn(
                  "relative text-6xl drop-shadow-md transition-opacity duration-500 ease-out sm:text-7xl",
                  emojiVisible ? "opacity-100" : "opacity-0",
                )}
                aria-hidden
              >
                {service.coverEmoji}
              </div>
              <div className="absolute left-2 top-2 flex flex-wrap gap-1">
                {service.isHot && (
                  <span className="rounded-md bg-orange-500/95 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                    HOT
                  </span>
                )}
                {service.isNew && (
                  <span className="rounded-md bg-emerald-500/95 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                    NEW
                  </span>
                )}
              </div>
              <div className="absolute bottom-3 left-3 right-3 rounded-md border border-white/15 bg-black/25 px-2 py-1 text-[11px] font-medium text-white/95 backdrop-blur">
                {service.categoryLabel}
              </div>
            </div>
            <div className="flex min-w-0 flex-1 flex-col p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-[11px] font-normal">
                  {service.categoryLabel}
                </Badge>
                {service.tags.map((t) => (
                  <Badge
                    key={t}
                    variant="secondary"
                    className={tagBadgeClass(service.visualCategory)}
                  >
                    {t}
                  </Badge>
                ))}
              </div>
              <h3 className="mt-3 text-lg font-semibold leading-snug tracking-tight">
                <TitleHighlight title={service.title} keyword={highlightKeyword} />
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {service.headline}
              </p>
              <p className="mt-1 text-sm font-medium text-foreground/90">
                {service.deliveryLine}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                支持企业对公 · 可开发票
              </p>
              <div className="mt-3 flex flex-wrap items-baseline gap-2">
                <span className="text-lg font-bold text-foreground">
                  {formatPriceFrom(service.priceFrom)}
                </span>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <span className={cn(buttonVariants({ size: "sm" }), "pointer-events-none")}>
                  查看详情
                </span>
              </div>
            </div>
          </div>
        </Card>
      </Link>
    );
  }

  const { course, className, highlightKeyword } = props;

  const cover = CATEGORY_COVER_GRADIENT[course.category];
  const discount =
    course.originalPrice > course.price
      ? Math.round((1 - course.price / course.originalPrice) * 100)
      : 0;

  return (
    <Link
      to={`/courses/${course.id}`}
      className={cn(
        "block rounded-xl no-underline text-inherit outline-none transition-transform focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
    >
      <Card className="h-full overflow-hidden border-border/70 transition-shadow hover:shadow-lg">
        <div className="flex min-w-0 flex-col sm:flex-row">
          <div
            className="relative flex h-40 shrink-0 items-center justify-center sm:h-auto sm:w-44 sm:min-h-[11rem]"
            style={{ background: cover }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.22),transparent_45%)]" />
            <div
              className={cn(
                "relative text-6xl drop-shadow-md transition-opacity duration-500 ease-out sm:text-7xl",
                emojiVisible ? "opacity-100" : "opacity-0",
              )}
              aria-hidden
            >
              {course.coverEmoji}
            </div>
            <div className="absolute left-2 top-2 flex flex-wrap gap-1">
              {course.isHot && (
                <span className="rounded-md bg-orange-500/95 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                  HOT
                </span>
              )}
              {course.isNew && (
                <span className="rounded-md bg-emerald-500/95 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                  NEW
                </span>
              )}
            </div>
            <div className="absolute bottom-3 left-3 right-3 rounded-md border border-white/15 bg-black/25 px-2 py-1 text-[11px] font-medium text-white/95 backdrop-blur">
              {course.categoryLabel}
              {course.isVipFree ? " · 会员免费" : ""}
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-col p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-[11px] font-normal">
                {course.categoryLabel}
              </Badge>
              {course.tags.map((t) => (
                <Badge
                  key={t}
                  variant="secondary"
                  className={tagBadgeClass(course.category)}
                >
                  {t}
                </Badge>
              ))}
            </div>
            <h3 className="mt-3 text-lg font-semibold leading-snug tracking-tight">
              <TitleHighlight title={course.title} keyword={highlightKeyword} />
            </h3>
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {course.subtitle}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              {course.rating.toFixed(1)} 分 · {formatStudentCount(course.studentCount)}
              人学习 · {course.totalDuration} · {course.chapterCount} 章 · 更新{" "}
              {course.updatedAt}
            </p>
            <div className="mt-3 flex flex-wrap items-baseline gap-2">
              <span className="text-lg font-bold text-foreground">
                {formatCoursePrice(course.price)}
              </span>
              {course.originalPrice > course.price && (
                <>
                  <span className="text-sm text-muted-foreground line-through">
                    {formatCoursePrice(course.originalPrice)}
                  </span>
                  <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
                    省 {discount}%
                  </span>
                </>
              )}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className={cn(buttonVariants({ size: "sm" }), "pointer-events-none")}>
                查看详情
              </span>
              <span
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "text-muted-foreground pointer-events-none",
                )}
              >
                加入学习计划
              </span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
