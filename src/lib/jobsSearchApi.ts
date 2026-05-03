import { resolveApiUrl } from "@/lib/apiBase";

/** 岗位关联的站内课程推荐（来自 /api/jobs/search） */
export type RelatedCourse = {
  id: string;
  title: string;
  price: number;
  coverUrl: string;
  url: string;
  tags: string[];
};

export type JobSearchItem = {
  id: string;
  title: string;
  company: string;
  salary: string;
  city: string;
  description: string;
  skills: string[];
  url: string;
  source: string;
  published_at: string | null;
  relatedCourses?: RelatedCourse[];
};

export type JobSearchResponse = {
  total: number;
  page: number;
  pageSize?: number;
  jobs: JobSearchItem[];
  source: string;
  cached_at: string;
  degraded?: boolean;
  cache_hit?: boolean;
};

export type HotSkillItem = {
  name: string;
  jobCount: number;
  avgSalary: string;
  trend: string;
};

/** GET /api/jobs/hot-skills 响应（兼容历史：纯 JSON 数组视为静态 skills） */
export type HotSkillsResponse = {
  skills: HotSkillItem[];
  snapshotUpdatedAt: string | null;
  source: "db" | "static";
};

export function parseHotSkillsResponse(data: unknown): HotSkillsResponse {
  if (Array.isArray(data)) {
    return {
      skills: data as HotSkillItem[],
      snapshotUpdatedAt: null,
      source: "static",
    };
  }
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    const skills = Array.isArray(o.skills) ? (o.skills as HotSkillItem[]) : [];
    return {
      skills,
      snapshotUpdatedAt:
        typeof o.snapshotUpdatedAt === "string" ? o.snapshotUpdatedAt : null,
      source: o.source === "db" ? "db" : "static",
    };
  }
  return { skills: [], snapshotUpdatedAt: null, source: "static" };
}

export async function fetchHotSkills(): Promise<HotSkillsResponse> {
  const res = await fetch(jobsHotSkillsUrl());
  const raw = await res.json().catch(() => null);
  return parseHotSkillsResponse(raw);
}

export function jobsSearchUrl(
  keyword: string,
  city: string,
  page: number,
  pageSize = 20,
): string {
  const q = new URLSearchParams({
    keyword: keyword.trim(),
    city: city.trim() || "全国",
    page: String(page),
    pageSize: String(pageSize),
  });
  return resolveApiUrl(`/api/jobs/search?${q.toString()}`);
}

export function jobsHotSkillsUrl(): string {
  return resolveApiUrl("/api/jobs/hot-skills");
}
