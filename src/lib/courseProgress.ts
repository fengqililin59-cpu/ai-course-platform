/** 与详情页、个人中心共用的学习进度存储 */
export const COURSE_PROGRESS_UPDATED_EVENT = "course-progress-updated";

export function courseProgressStorageKey(courseId: string): string {
  return `progress_${courseId}`;
}

export function readCourseProgress(courseId: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(courseProgressStorageKey(courseId));
    if (raw === null || raw === "") return 0;
    const n = Number(raw);
    if (!Number.isFinite(n)) return 0;
    return Math.min(100, Math.max(0, Math.round(n)));
  } catch {
    return 0;
  }
}

export function writeCourseProgress(courseId: string, value: number): void {
  if (typeof window === "undefined") return;
  const n = Math.min(100, Math.max(0, Math.round(Number(value))));
  localStorage.setItem(courseProgressStorageKey(courseId), String(n));
  window.dispatchEvent(new Event(COURSE_PROGRESS_UPDATED_EVENT));
}
