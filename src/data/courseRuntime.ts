import type {
  Course,
  CourseCategory,
  CourseChapter,
  CourseChapterType,
  CourseContentSection,
  CourseReview,
} from "@/data/courses";
import { COURSES } from "@/data/courses";

export const ADMIN_COURSES_STORAGE_KEY = "admin_courses";

const CHAPTER_TYPES: CourseChapterType[] = ["video", "doc", "live", "quiz"];

function isChapterType(v: string): v is CourseChapterType {
  return CHAPTER_TYPES.includes(v as CourseChapterType);
}

function defaultReviews(): [CourseReview, CourseReview, CourseReview] {
  const base = (name: string, avatar: string, tag: CourseReview["tag"]): CourseReview => ({
    name,
    avatar,
    rating: 5,
    content: "课程内容充实，讲解清晰，推荐学习。",
    date: new Date().toISOString().slice(0, 10),
    tag,
  });
  return [
    base("学**", "学", "学习中"),
    { ...base("用**", "用", "已完课"), rating: 5 },
    { ...base("新**", "新", "学习中"), rating: 4 },
  ];
}

function defaultContentSections(): CourseContentSection[] {
  return [
    { heading: "你将获得", body: "课程内容持续更新中。" },
    { heading: "适合谁", body: "适合希望系统学习的学员。" },
    { heading: "学习路径建议", body: "建议按章节顺序学习并完成练习。" },
  ];
}

function categoryLabelFor(cat: CourseCategory): string {
  if (cat === "money") return "AI赚钱项目";
  if (cat === "prompt") return "AI提示词";
  return "AI工具教程";
}

/** 将 localStorage / 表单合并为合法 Course */
export function normalizeCourse(raw: Partial<Course> & { id?: string }): Course {
  const id = String(raw.id ?? "").trim() || `c-${Date.now()}`;
  const category = (["money", "prompt", "tools"] as const).includes(
    raw.category as CourseCategory,
  )
    ? (raw.category as CourseCategory)
    : "tools";
  const chapters: CourseChapter[] = Array.isArray(raw.chapters)
    ? raw.chapters.map((ch, i) => ({
        id: String(ch.id || `${id}-ch-${i + 1}`),
        title: String(ch.title ?? ""),
        duration: String(ch.duration ?? ""),
        isFree: Boolean(ch.isFree),
        type: isChapterType(String(ch.type)) ? ch.type : "video",
      }))
    : [];
  const highlightsIn = Array.isArray(raw.highlights) ? raw.highlights : [];
  const highlights: Course["highlights"] = [
    String(highlightsIn[0] ?? ""),
    String(highlightsIn[1] ?? ""),
    String(highlightsIn[2] ?? ""),
    String(highlightsIn[3] ?? ""),
    String(highlightsIn[4] ?? ""),
  ];
  let reviews: [CourseReview, CourseReview, CourseReview] = defaultReviews();
  if (Array.isArray(raw.reviews) && raw.reviews.length >= 3) {
    reviews = [raw.reviews[0], raw.reviews[1], raw.reviews[2]] as typeof reviews;
  }
  const chapterCount = chapters.length;
  return {
    id,
    title: String(raw.title ?? "未命名课程"),
    subtitle: String(raw.subtitle ?? ""),
    category,
    categoryLabel: String(raw.categoryLabel ?? categoryLabelFor(category)),
    price: Number(raw.price) || 0,
    originalPrice: Number(raw.originalPrice) || Number(raw.price) || 0,
    isVipFree: Boolean(raw.isVipFree),
    isHot: Boolean(raw.isHot),
    isNew: Boolean(raw.isNew),
    coverEmoji: String(raw.coverEmoji ?? "📚"),
    instructorName: String(raw.instructorName ?? "讲师"),
    instructorTitle: String(raw.instructorTitle ?? ""),
    studentCount: Math.max(0, Math.floor(Number(raw.studentCount) || 0)),
    rating: Math.min(5, Math.max(1, Number(raw.rating) || 4.8)),
    totalDuration: String(raw.totalDuration ?? ""),
    chapterCount,
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
    highlights,
    chapters,
    samplePrompt: String(raw.samplePrompt ?? ""),
    contentSections: Array.isArray(raw.contentSections) && raw.contentSections.length
      ? raw.contentSections.map((s) => ({
          heading: String(s.heading ?? ""),
          body: String(s.body ?? ""),
        }))
      : defaultContentSections(),
    reviews,
    reviewCount: Math.max(
      reviews.length,
      Math.floor(Number(raw.reviewCount) || reviews.length),
    ),
    updatedAt: String(raw.updatedAt ?? new Date().toISOString().slice(0, 10)),
  };
}

export function loadCatalogCourses(): Course[] {
  if (typeof window === "undefined") {
    return COURSES;
  }
  try {
    const raw = window.localStorage.getItem(ADMIN_COURSES_STORAGE_KEY);
    if (!raw) return COURSES;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return COURSES;
    return parsed.map((item) => normalizeCourse(item as Partial<Course>));
  } catch {
    return COURSES;
  }
}

export function saveCatalogCourses(courses: Course[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ADMIN_COURSES_STORAGE_KEY, JSON.stringify(courses));
}

export function getCourseById(id: string): Course | undefined {
  return loadCatalogCourses().find((c) => c.id === id);
}
