import { resolveApiUrl } from "@/lib/apiBase";
import { getSiteUserToken } from "@/lib/siteUserAuth";

function authHeaders(): HeadersInit {
  const t = getSiteUserToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export type SeckillActivity = {
  id: number;
  course_id: number;
  original_price: number;
  seckill_price: number;
  stock: number;
  limit_per_user: number;
  start_time: string;
  end_time: string;
  status: string;
  course_title?: string;
};

export async function fetchSeckillByCourse(courseId: string): Promise<SeckillActivity | null> {
  const res = await fetch(resolveApiUrl(`/api/seckill/by-course/${encodeURIComponent(courseId)}`));
  const j = (await res.json()) as { success?: boolean; data?: SeckillActivity | null };
  if (!res.ok || j.success === false) return null;
  return j.data ?? null;
}

export async function purchaseSeckill(activityId: number): Promise<{
  payUrl?: string;
  devSimulate?: boolean;
  outTradeNo?: string;
  amount?: string;
  courseId?: string;
  courseName?: string;
}> {
  const res = await fetch(resolveApiUrl(`/api/seckill/${activityId}/purchase`), {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
  });
  const j = (await res.json()) as {
    success?: boolean;
    message?: string;
    data?: { payUrl?: string; devSimulate?: boolean; outTradeNo?: string; amount?: string; courseId?: string; courseName?: string };
  };
  if (!res.ok || j.success === false) throw new Error(j.message || "秒杀下单失败");
  return j.data ?? {};
}
