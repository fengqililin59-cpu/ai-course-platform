import { resolveApiUrl } from "@/lib/apiBase";
import { getSiteUserToken } from "@/lib/siteUserAuth";

export async function postUserCourseProgress(courseId: string, progressPercent: number): Promise<void> {
  const token = getSiteUserToken();
  if (!token) return;
  const pct = Math.max(0, Math.min(100, Math.round(progressPercent)));
  const res = await fetch(resolveApiUrl("/api/user/progress"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ courseId, progressPercent: pct }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text.slice(0, 200) || `上报失败 ${res.status}`);
  }
}

export async function postLearningSession(courseId: string, durationSeconds: number): Promise<void> {
  const token = getSiteUserToken();
  if (!token) return;
  const sec = Math.max(5, Math.floor(durationSeconds));
  const res = await fetch(resolveApiUrl("/api/user/learning-session"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ courseId, durationSeconds: sec }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text.slice(0, 200) || `上报失败 ${res.status}`);
  }
}

export async function fetchUserCourseProgress(courseId: string): Promise<number | null> {
  const token = getSiteUserToken();
  if (!token) return null;
  const res = await fetch(resolveApiUrl(`/api/user/progress/${encodeURIComponent(courseId)}`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const j = (await res.json()) as { success?: boolean; data?: { progress_percent?: number } };
  if (!j.success || !j.data) return null;
  const p = Number(j.data.progress_percent);
  return Number.isFinite(p) ? Math.max(0, Math.min(100, Math.round(p))) : null;
}
