import { CREATOR_TOKEN_KEY } from "@/creator/CreatorAuth";
import type { CreatorProfile } from "@/creator/CreatorAuth";
import { resolveApiUrl } from "@/lib/apiBase";
import { setSiteUserToken } from "@/lib/siteUserAuth";

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(text || res.statusText || "请求失败");
  }
}

function errMessage(body: unknown, fallback: string): string {
  if (
    body &&
    typeof body === "object" &&
    "message" in body &&
    typeof (body as { message: unknown }).message === "string"
  ) {
    return (body as { message: string }).message;
  }
  return fallback;
}

function authHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem(CREATOR_TOKEN_KEY)
      : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function creatorSendCode(phone: string): Promise<void> {
  const res = await fetch(resolveApiUrl("/api/creator/send-code"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });
  const data = await parseJson<{ success?: boolean; message?: string }>(res);
  if (!res.ok || data.success === false) {
    throw new Error(errMessage(data, `发送失败 (${res.status})`));
  }
}

export type CreatorLoginResult = {
  token: string;
  creator: CreatorProfile;
  siteToken?: string;
};

export async function creatorLogin(
  phone: string,
  code: string,
): Promise<CreatorLoginResult> {
  const res = await fetch(resolveApiUrl("/api/creator/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, code }),
  });
  const data = await parseJson<{
    success?: boolean;
    message?: string;
    token?: string;
    siteToken?: string;
    creator?: CreatorProfile;
    data?: { token?: string; siteToken?: string; creator?: CreatorProfile };
  }>(res);
  if (!res.ok || data.success === false) {
    throw new Error(errMessage(data, "登录失败"));
  }
  const token = data.data?.token ?? data.token;
  const creator = data.data?.creator ?? data.creator;
  const siteToken = data.data?.siteToken ?? data.siteToken;
  if (!token || !creator) {
    throw new Error("登录响应异常");
  }
  if (siteToken) setSiteUserToken(siteToken);
  return { token, creator, siteToken };
}

export type CreatorStats = {
  totalRevenueYuan: number;
  monthRevenueYuan: number;
  totalOrders: number;
  totalStudents: number;
  publishedCourses: number;
  draftCourses: number;
};

type StatsPayload = {
  totalEarnings: number;
  thisMonthEarnings: number;
  totalStudents: number;
  totalCourses: number;
  publishedCourses: number;
  draftCourses: number;
  totalOrders: number;
  pendingWithdraw: number;
};

export async function fetchCreatorStats(): Promise<CreatorStats> {
  const res = await fetch(resolveApiUrl("/api/creator/stats"), { headers: authHeaders() });
  const data = await parseJson<{
    success?: boolean;
    data?: StatsPayload;
    message?: string;
  }>(res);
  if (!res.ok || data.success === false || !data.data) {
    throw new Error(errMessage(data, "加载失败"));
  }
  const d = data.data;
  return {
    totalRevenueYuan: Number(d.totalEarnings) || 0,
    monthRevenueYuan: Number(d.thisMonthEarnings) || 0,
    totalOrders: Number(d.totalOrders) || 0,
    totalStudents: Number(d.totalStudents) || 0,
    publishedCourses: Number(d.publishedCourses) || 0,
    draftCourses: Number(d.draftCourses) || 0,
  };
}

export type CreatorOrderRow = {
  id: string;
  courseTitle: string;
  amountYuan: number;
  buyerMask: string;
  createdAt: string;
};

type OrderApiRow = {
  id: string;
  courseName: string;
  amount: number;
  buyerPhone: string;
  createdAt: string;
};

export async function fetchCreatorOrders(): Promise<CreatorOrderRow[]> {
  const res = await fetch(resolveApiUrl("/api/creator/orders"), { headers: authHeaders() });
  const data = await parseJson<{
    success?: boolean;
    data?: OrderApiRow[];
    message?: string;
  }>(res);
  if (!res.ok || data.success === false) {
    throw new Error(errMessage(data, "加载失败"));
  }
  return (data.data ?? []).map((o) => ({
    id: String(o.id),
    courseTitle: o.courseName,
    amountYuan: Number(o.amount) || 0,
    buyerMask: o.buyerPhone,
    createdAt: o.createdAt,
  }));
}

export type CreatorCourseStatus = "draft" | "published" | "pending" | "offline";

export type CreatorCourseRow = {
  id: string;
  title: string;
  priceYuan: number;
  status: CreatorCourseStatus;
  salesCount: number;
  createdAt: string;
  /** 课程简介，对应库 description */
  description: string;
  videoUrl: string;
  /** 逗号分隔，供就业雷达岗位推荐匹配 */
  tags: string;
};

type CourseApiRow = {
  id: string;
  title: string;
  price: number;
  status: string;
  students: number;
  earnings: number;
  coverUrl: string | null;
  description?: string;
  videoUrl?: string;
  tags?: string;
  createdAt: string;
};

function normalizeCourseStatus(s: string): CreatorCourseStatus {
  if (s === "published" || s === "draft" || s === "pending" || s === "offline") {
    return s;
  }
  return "draft";
}

export async function fetchCreatorCourses(): Promise<CreatorCourseRow[]> {
  const res = await fetch(resolveApiUrl("/api/creator/courses"), { headers: authHeaders() });
  const data = await parseJson<{
    success?: boolean;
    data?: CourseApiRow[];
    message?: string;
  }>(res);
  if (!res.ok || data.success === false) {
    throw new Error(errMessage(data, "加载失败"));
  }
  return (data.data ?? []).map((c) => ({
    id: String(c.id),
    title: c.title,
    priceYuan: Number(c.price) || 0,
    status: normalizeCourseStatus(c.status),
    salesCount: Number(c.students) || 0,
    createdAt: c.createdAt,
    description: String(c.description ?? ""),
    videoUrl: String(c.videoUrl ?? ""),
    tags: String(c.tags ?? ""),
  }));
}

export async function createCreatorCourse(body: {
  title: string;
  priceYuan: number;
  summary?: string;
  videoUrl?: string;
  tags?: string;
}): Promise<void> {
  const res = await fetch(resolveApiUrl("/api/creator/courses"), {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      title: body.title,
      price: body.priceYuan,
      description: body.summary ?? "",
      videoUrl: body.videoUrl ?? "",
      tags: body.tags ?? "",
    }),
  });
  const data = await parseJson<{ success?: boolean; message?: string }>(res);
  if (!res.ok || data.success === false) {
    throw new Error(errMessage(data, "创建失败"));
  }
}

export async function updateCreatorCourse(
  id: string,
  body: {
    title: string;
    priceYuan: number;
    summary?: string;
    videoUrl?: string;
    tags?: string;
  },
): Promise<void> {
  const res = await fetch(resolveApiUrl(`/api/creator/courses/${encodeURIComponent(id)}`), {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({
      title: body.title,
      price: body.priceYuan,
      description: body.summary ?? "",
      videoUrl: body.videoUrl ?? "",
      tags: body.tags ?? "",
    }),
  });
  const data = await parseJson<{ success?: boolean; message?: string }>(res);
  if (!res.ok || data.success === false) {
    throw new Error(errMessage(data, "保存失败"));
  }
}

export async function updateCreatorCourseStatus(
  id: string,
  status: Extract<CreatorCourseStatus, "draft" | "published" | "offline">,
): Promise<void> {
  const res = await fetch(resolveApiUrl(`/api/creator/courses/${encodeURIComponent(id)}/status`), {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  });
  const data = await parseJson<{ success?: boolean; message?: string }>(res);
  if (!res.ok || data.success === false) {
    throw new Error(errMessage(data, "更新失败"));
  }
}

export type EarningRow = {
  id: string;
  courseTitle: string;
  amountYuan: number;
  settledAt: string;
  remark?: string;
};

export type MonthlyEarning = {
  month: string;
  amountYuan: number;
};

export type CreatorEarningsPayload = {
  rows: EarningRow[];
  monthly: MonthlyEarning[];
};

type EarningApiRecord = {
  id: string;
  courseName: string;
  creatorAmount: number;
  createdAt: string;
  settled: boolean;
};

type EarningApiSummary = {
  month: string;
  total: number;
  orders: number;
  settled: boolean;
};

export async function fetchCreatorEarnings(): Promise<CreatorEarningsPayload> {
  const res = await fetch(resolveApiUrl("/api/creator/earnings"), { headers: authHeaders() });
  const data = await parseJson<{
    success?: boolean;
    records?: EarningApiRecord[];
    summaries?: EarningApiSummary[];
    message?: string;
  }>(res);
  if (!res.ok || data.success === false) {
    throw new Error(errMessage(data, "加载失败"));
  }
  const rows: EarningRow[] = (data.records ?? []).map((r) => ({
    id: String(r.id),
    courseTitle: r.courseName,
    amountYuan: Number(r.creatorAmount) || 0,
    settledAt: r.createdAt,
    remark: r.settled ? "已结算" : "待结算",
  }));
  const monthly: MonthlyEarning[] = (data.summaries ?? []).map((s) => ({
    month: s.month,
    amountYuan: Number(s.total) || 0,
  }));
  return { rows, monthly };
}
