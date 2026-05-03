import { resolveApiUrl } from "@/lib/apiBase";
import { getSiteUserToken } from "@/lib/siteUserAuth";

function authHeaders(): HeadersInit {
  const t = getSiteUserToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export type CouponMineRow = {
  id: number;
  coupon_id: number;
  status: string;
  assigned_method: string;
  assigned_at: string;
  used_at: string | null;
  order_id: number | null;
  out_trade_no: string | null;
  coupon: {
    name: string;
    type: string;
    value: number;
    condition_amount: number;
    applicable_courses: string[];
    start_time: string;
    end_time: string;
  };
};

export async function fetchCouponMine(): Promise<CouponMineRow[]> {
  const res = await fetch(resolveApiUrl("/api/coupons/mine"), { headers: authHeaders() });
  const j = (await res.json()) as { success?: boolean; data?: CouponMineRow[] };
  if (!res.ok || j.success === false) throw new Error("加载优惠券失败");
  return j.data ?? [];
}

export type CouponApplicableRow = {
  user_coupon_id: number;
  name: string;
  type: string;
  value: number;
  condition_amount: number;
  discount: number;
  pay_price: number;
};

export type CouponPreview = {
  courseId: number;
  title: string;
  listPrice: number;
  best: { mode: string; finalPrice: number; savings: number; user_coupon_id: number | null };
  seckill: {
    id: number;
    seckill_price: number;
    original_price: number;
    stock: number;
    limit_per_user: number;
    start_time: string;
    end_time: string;
  } | null;
  applicableUserCoupons?: CouponApplicableRow[];
};

export type CouponTemplate = {
  id: number;
  name: string;
  type: string;
  value: number;
  condition_amount: number;
  applicable_courses: string[];
  stock: number;
  used_count: number;
  claim_limit_per_user: number;
  start_time: string;
  end_time: string;
  status: string;
};

export async function fetchCouponsAvailable(): Promise<CouponTemplate[]> {
  const res = await fetch(resolveApiUrl("/api/coupons/available"), { headers: authHeaders() });
  if (res.status === 401) return [];
  const j = (await res.json()) as { success?: boolean; data?: CouponTemplate[] };
  if (!res.ok || j.success === false) return [];
  return j.data ?? [];
}

export async function fetchCouponPreview(courseId: string): Promise<CouponPreview | null> {
  const res = await fetch(resolveApiUrl(`/api/coupons/preview/${encodeURIComponent(courseId)}`), {
    headers: { ...authHeaders(), "Content-Type": "application/json" },
  });
  if (res.status === 401) return null;
  const j = (await res.json()) as { success?: boolean; data?: CouponPreview };
  if (!res.ok || j.success === false) return null;
  return j.data ?? null;
}

export async function claimCoupon(couponId: number): Promise<void> {
  const res = await fetch(resolveApiUrl("/api/coupons/claim"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ couponId }),
  });
  const j = (await res.json()) as { success?: boolean; message?: string };
  if (!res.ok || j.success === false) throw new Error(j.message || "领取失败");
}
