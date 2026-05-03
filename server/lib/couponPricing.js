"use strict";

/**
 * 平台分成：创作者 80%，平台 20%（与现有支付逻辑一致）
 * @param {number} totalYuan
 */
function splitCreatorPlatform(totalYuan) {
  const t = Number(totalYuan);
  if (!Number.isFinite(t) || t <= 0) {
    return { creator_amount: 0, platform_amount: 0 };
  }
  const creator = Math.round(t * 0.8 * 100) / 100;
  const platform = Math.round((t - creator) * 100) / 100;
  return { creator_amount: creator, platform_amount: platform };
}

/**
 * @param {{ type: string, value: number, condition_amount: number }} coupon
 * @param {number} priceYuan 原价
 * @returns {number} 减免金额（元）
 */
function discountFromCoupon(coupon, priceYuan) {
  const p = Number(priceYuan);
  if (!Number.isFinite(p) || p <= 0) return 0;
  const cond = Number(coupon.condition_amount) || 0;
  if (p < cond) return 0;
  const t = String(coupon.type || "fixed").toLowerCase();
  if (t === "percent") {
    const pct = Math.min(100, Math.max(0, Number(coupon.value) || 0));
    const d = Math.round(((p * pct) / 100) * 100) / 100;
    return Math.min(d, p);
  }
  const fixed = Math.max(0, Number(coupon.value) || 0);
  return Math.min(fixed, p);
}

/**
 * 优惠券与秒杀不可叠加：取最大优惠（价更低者）
 * @param {number} listPrice
 * @param {{ type: string, value: number, condition_amount: number } | null} couponRow
 * @param {number | null} seckillPrice
 */
function bestCheckout(listPrice, couponRow, seckillPrice) {
  const list = Number(listPrice);
  const sk =
    seckillPrice != null && Number.isFinite(Number(seckillPrice)) && Number(seckillPrice) > 0
      ? Number(seckillPrice)
      : null;
  const couponDisc = couponRow ? discountFromCoupon(couponRow, list) : 0;
  const couponPay = Math.max(0, list - couponDisc);
  if (sk == null) {
    return {
      mode: couponDisc > 0 ? "coupon" : "none",
      finalPrice: couponPay,
      savings: couponDisc,
      couponDiscount: couponDisc,
      seckillPrice: null,
    };
  }
  if (couponPay <= sk) {
    return {
      mode: "coupon",
      finalPrice: couponPay,
      savings: list - couponPay,
      couponDiscount: couponDisc,
      seckillPrice: sk,
    };
  }
  return {
    mode: "seckill",
    finalPrice: sk,
    savings: list - sk,
    couponDiscount: couponDisc,
    seckillPrice: sk,
  };
}

module.exports = { splitCreatorPlatform, discountFromCoupon, bestCheckout };
