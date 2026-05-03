import { resolveApiUrl } from "@/lib/apiBase";
import { getSiteUserToken } from "@/lib/siteUserAuth";

export interface CourseReview {
  id: number;
  rating: number;
  content: string;
  author_display: string;
  created_at: string;
  helpful_count: number;
  reply_content?: string | null;
  reply_at?: string | null;
}

export interface ReviewListResponse {
  success: boolean;
  data: {
    reviews: CourseReview[];
    total: number;
    page: number;
    pageSize: number;
    avgRating: number;
    totalReviews: number;
  };
}

export interface ReviewCheckResponse {
  success: boolean;
  data: {
    canSubmit: boolean;
    hasReviewed: boolean;
    purchased: boolean;
  };
}

function authHeaders(): HeadersInit {
  const t = getSiteUserToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export async function fetchCourseReviews(
  courseId: string,
  page = 1,
  pageSize = 5,
): Promise<ReviewListResponse> {
  const q = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  const url = resolveApiUrl(`/api/reviews/course/${encodeURIComponent(courseId)}?${q.toString()}`);
  const res = await fetch(url);
  const j = (await res.json()) as ReviewListResponse & { message?: string };
  if (!res.ok || j.success === false) {
    throw new Error((j as { message?: string }).message || "获取评价失败");
  }
  return j;
}

export async function fetchReviewCheck(courseId: string): Promise<ReviewCheckResponse["data"]> {
  const res = await fetch(resolveApiUrl(`/api/reviews/check/${encodeURIComponent(courseId)}`), {
    headers: authHeaders(),
  });
  if (res.status === 401) {
    return { canSubmit: false, hasReviewed: false, purchased: false };
  }
  const j = (await res.json()) as ReviewCheckResponse & { message?: string };
  if (!res.ok || j.success === false) {
    throw new Error(j.message || "加载评价资格失败");
  }
  return j.data;
}

export async function submitReview(courseId: string, rating: number, content: string): Promise<void> {
  const token = getSiteUserToken();
  if (!token) throw new Error("请先登录");
  const res = await fetch(resolveApiUrl("/api/reviews"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ courseId, rating, content }),
  });
  const data = (await res.json()) as { success?: boolean; message?: string };
  if (!res.ok || data.success === false) {
    throw new Error(data.message || "提交失败");
  }
}

export async function markHelpful(
  reviewId: number,
): Promise<{ helpful_count: number; alreadyMarked: boolean }> {
  const token = getSiteUserToken();
  if (!token) throw new Error("请先登录");
  const res = await fetch(resolveApiUrl(`/api/reviews/${reviewId}/helpful`), {
    method: "POST",
    headers: authHeaders(),
  });
  const data = (await res.json()) as {
    success?: boolean;
    message?: string;
    data?: { helpful_count: number; alreadyMarked: boolean };
  };
  if (!res.ok || data.success === false) {
    throw new Error(data.message || "操作失败");
  }
  return data.data ?? { helpful_count: 0, alreadyMarked: false };
}
