import { resolveApiUrl } from "@/lib/apiBase";

export type DistributionCommissionRow = {
  id: number;
  out_trade_no: string;
  course_id: string;
  buyer_phone: string | null;
  order_amount: number;
  order_amount_cents?: number;
  commission_amount: number;
  rate_percent?: number;
  status?: string;
  available_at?: string | null;
  paid_at: string | null;
  created_at: string;
};

export type DistributionSummary = {
  totalCommission: number;
  pendingSettlement: number;
  settledCommission: number;
  pendingAndPaidWithdrawals: number;
  available: number;
  commissions: DistributionCommissionRow[];
  withdrawals: Array<{
    id: number;
    amount: number;
    alipay_account: string | null;
    commission_ids?: string | null;
    status: string;
    created_at: string;
  }>;
  withdrawMinYuan: number;
  withdrawFeePercent: number;
  settleDays: number;
};

export async function createDistributionLink(
  courseId: string,
  distributorPhone: string,
  options?: { commissionRatePercent?: number },
): Promise<{ shareUrl: string; refToken: string }> {
  const body: Record<string, unknown> = { courseId, distributorPhone };
  if (options?.commissionRatePercent != null) {
    body.commissionRatePercent = options.commissionRatePercent;
  }
  const res = await fetch(resolveApiUrl("/api/distribution/create-link"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    message?: string;
    shareUrl?: string;
    refToken?: string;
  };
  if (!res.ok || !data.success || !data.shareUrl || !data.refToken) {
    throw new Error(data.message || `生成推广链接失败（${res.status}）`);
  }
  return { shareUrl: data.shareUrl, refToken: data.refToken };
}

export async function fetchDistributionSummary(
  phone: string,
): Promise<DistributionSummary> {
  const res = await fetch(resolveApiUrl("/api/distribution/summary"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    message?: string;
    data?: DistributionSummary;
  };
  if (!res.ok || !data.success || !data.data) {
    throw new Error(data.message || `加载推广收益失败（${res.status}）`);
  }
  return data.data;
}

export async function requestDistributionWithdraw(body: {
  phone: string;
  amount: number;
  alipayAccount?: string;
}): Promise<{ message: string }> {
  const res = await fetch(resolveApiUrl("/api/distribution/withdraw"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone: body.phone,
      amount: body.amount,
      alipayAccount: body.alipayAccount?.trim() || undefined,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    message?: string;
  };
  if (!res.ok || !data.success) {
    throw new Error(data.message || `申请失败（${res.status}）`);
  }
  return { message: data.message || "提现申请已提交" };
}
