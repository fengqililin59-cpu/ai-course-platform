"use strict";

const crypto = require("node:crypto");
const express = require("express");
const router = express.Router();
const db = require("../db");
const { advanceSettledCommissions } = require("../lib/distributionSettlement");
const { buildCommissionIdsJson } = require("../lib/withdrawCommissionSnapshot");

function frontendBase() {
  return (process.env.FRONTEND_PUBLIC_URL || "http://localhost:5174").replace(
    /\/$/,
    "",
  );
}

function isCnMobile(phone) {
  return /^1\d{10}$/.test(String(phone || "").trim());
}

function defaultRatePercent() {
  const n = Number(process.env.DISTRIBUTION_DEFAULT_RATE_PERCENT);
  if (!Number.isFinite(n) || n < 1 || n > 50) return 20;
  return Math.floor(n);
}

function linkExpireDays() {
  const n = Math.floor(Number(process.env.DISTRIBUTION_LINK_EXPIRE_DAYS));
  if (!Number.isFinite(n) || n < 1) return 30;
  return Math.min(366, n);
}

function withdrawMinYuan() {
  const n = Number(process.env.DISTRIBUTION_WITHDRAW_MIN_YUAN);
  if (!Number.isFinite(n) || n < 0.01) return 10;
  return n;
}

function withdrawFeePercent() {
  const n = Number(process.env.DISTRIBUTION_WITHDRAW_FEE_PERCENT);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(30, n);
}

function settleDays() {
  const n = Math.floor(Number(process.env.DISTRIBUTION_SETTLE_DAYS));
  if (!Number.isFinite(n) || n < 0) return 7;
  return Math.min(90, n);
}

function distributorMayCreateLinks(phone) {
  if (process.env.DISTRIBUTION_REQUIRE_CREATOR_APPROVED !== "1") return true;
  const row = db
    .prepare("SELECT status FROM creators WHERE phone = ? LIMIT 1")
    .get(String(phone).trim());
  return Boolean(row && row.status === "approved");
}

function computeLinkExpiresAt() {
  const days = linkExpireDays();
  const mod = `+${days} days`;
  return db.prepare("SELECT datetime('now','localtime', ?) AS d").get(mod).d;
}

/** POST /api/distribution/create-link */
router.post("/create-link", (req, res) => {
  const courseId = String(req.body?.courseId ?? "").trim();
  const distributorPhone = String(req.body?.distributorPhone ?? "").trim();
  let ratePercent = Math.floor(Number(req.body?.commissionRatePercent));
  if (!Number.isFinite(ratePercent)) {
    ratePercent = defaultRatePercent();
  }
  ratePercent = Math.min(50, Math.max(1, ratePercent));

  if (!courseId) {
    return res.status(400).json({ success: false, message: "courseId 必填" });
  }
  if (!isCnMobile(distributorPhone)) {
    return res
      .status(400)
      .json({ success: false, message: "请使用 11 位手机号作为推广账号" });
  }
  if (!distributorMayCreateLinks(distributorPhone)) {
    return res.status(403).json({
      success: false,
      message: "当前仅开放已审核通过的创作者生成推广链接",
    });
  }

  advanceSettledCommissions();

  const existing = db
    .prepare(
      `
    SELECT ref_token, rate_percent, expires_at
    FROM distribution_links
    WHERE course_id = ? AND distributor_phone = ?
      AND (expires_at IS NULL OR datetime(expires_at) > datetime('now','localtime'))
    ORDER BY id DESC
    LIMIT 1
  `,
    )
    .get(courseId, distributorPhone);

  if (existing && existing.ref_token) {
    const base = frontendBase();
    const shareUrl = `${base}/courses/${encodeURIComponent(courseId)}?ref=${encodeURIComponent(existing.ref_token)}`;
    return res.json({
      success: true,
      refToken: existing.ref_token,
      shareUrl,
      courseId,
      distributorPhone,
      reused: true,
      ratePercent: Number(existing.rate_percent) || defaultRatePercent(),
      expiresAt: existing.expires_at ?? null,
    });
  }

  const refToken = crypto.randomBytes(18).toString("base64url");
  const expiresAt = computeLinkExpiresAt();

  try {
    db.prepare(
      `
      INSERT INTO distribution_links (
        ref_token, course_id, distributor_phone, rate_percent, expires_at
      ) VALUES (?, ?, ?, ?, ?)
    `,
    ).run(refToken, courseId, distributorPhone, ratePercent, expiresAt);
  } catch (e) {
    console.error("[distribution/create-link]", e);
    return res.status(500).json({ success: false, message: "生成链接失败" });
  }

  const base = frontendBase();
  const shareUrl = `${base}/courses/${encodeURIComponent(courseId)}?ref=${encodeURIComponent(refToken)}`;

  res.json({
    success: true,
    refToken,
    shareUrl,
    courseId,
    distributorPhone,
    reused: false,
    ratePercent,
    expiresAt,
  });
});

/** POST /api/distribution/summary 推广收益汇总 */
router.post("/summary", (req, res) => {
  const phone = String(req.body?.phone ?? "").trim();
  if (!isCnMobile(phone)) {
    return res.status(400).json({ success: false, message: "手机号无效" });
  }

  advanceSettledCommissions();

  const commissions = db
    .prepare(
      `
    SELECT id, out_trade_no, course_id, buyer_phone, order_amount, order_amount_cents,
           commission_amount, rate_percent, status, available_at, paid_at, created_at
    FROM distribution_commissions
    WHERE distributor_phone = ? AND IFNULL(status, '') != 'cancelled'
    ORDER BY created_at DESC
    LIMIT 200
  `,
    )
    .all(phone);

  const totalEarned = db
    .prepare(
      `
    SELECT COALESCE(SUM(commission_amount), 0) AS v
    FROM distribution_commissions
    WHERE distributor_phone = ? AND IFNULL(status, '') != 'cancelled'
  `,
    )
    .get(phone).v;

  const pendingSettlement = db
    .prepare(
      `
    SELECT COALESCE(SUM(commission_amount), 0) AS v
    FROM distribution_commissions
    WHERE distributor_phone = ? AND status = 'pending_settlement'
  `,
    )
    .get(phone).v;

  const settledTotal = db
    .prepare(
      `
    SELECT COALESCE(SUM(commission_amount), 0) AS v
    FROM distribution_commissions
    WHERE distributor_phone = ? AND status = 'available'
  `,
    )
    .get(phone).v;

  const withdrawn = db
    .prepare(
      `
    SELECT COALESCE(SUM(amount), 0) AS v
    FROM distribution_withdrawals
    WHERE distributor_phone = ? AND status IN ('approved', 'paid', 'pending')
  `,
    )
    .get(phone).v;

  const withdrawals = db
    .prepare(
      `
    SELECT id, amount, alipay_account, commission_ids, status, created_at
    FROM distribution_withdrawals
    WHERE distributor_phone = ?
    ORDER BY created_at DESC
    LIMIT 50
  `,
    )
    .all(phone);

  const available = Math.max(0, Number(settledTotal) - Number(withdrawn));

  res.json({
    success: true,
    data: {
      totalCommission: Math.round(Number(totalEarned) * 100) / 100,
      pendingSettlement: Math.round(Number(pendingSettlement) * 100) / 100,
      settledCommission: Math.round(Number(settledTotal) * 100) / 100,
      pendingAndPaidWithdrawals: Math.round(Number(withdrawn) * 100) / 100,
      available: Math.round(available * 100) / 100,
      commissions,
      withdrawals,
      withdrawMinYuan: withdrawMinYuan(),
      withdrawFeePercent: withdrawFeePercent(),
      settleDays: settleDays(),
    },
  });
});

/** POST /api/distribution/withdraw 申请提现 */
router.post("/withdraw", (req, res) => {
  const phone = String(req.body?.phone ?? "").trim();
  const amount = Number(req.body?.amount);
  const alipayAccount = String(req.body?.alipayAccount ?? "").trim();

  if (!isCnMobile(phone)) {
    return res.status(400).json({ success: false, message: "手机号无效" });
  }
  if (!Number.isFinite(amount) || amount < withdrawMinYuan()) {
    return res.status(400).json({
      success: false,
      message: `单笔提现不得低于 ¥${withdrawMinYuan()}（可在环境变量 DISTRIBUTION_WITHDRAW_MIN_YUAN 调整）`,
    });
  }

  advanceSettledCommissions();

  const settledTotal = db
    .prepare(
      `
    SELECT COALESCE(SUM(commission_amount), 0) AS v
    FROM distribution_commissions
    WHERE distributor_phone = ? AND status = 'available'
  `,
    )
    .get(phone).v;
  const locked = db
    .prepare(
      `
    SELECT COALESCE(SUM(amount), 0) AS v
    FROM distribution_withdrawals
    WHERE distributor_phone = ? AND status IN ('pending','approved','paid')
  `,
    )
    .get(phone).v;
  const avail = Math.max(0, Number(settledTotal) - Number(locked));

  if (amount > avail + 1e-6) {
    return res.status(400).json({ success: false, message: "可提现余额不足" });
  }

  const feePct = withdrawFeePercent();
  const feeAmount =
    feePct > 0 ? Math.round((amount * feePct) / 100 * 100) / 100 : 0;
  const netAmount = Math.round((amount - feeAmount) * 100) / 100;

  /** FIFO 拆分占用金额，JSON：[{id,amount},…]，与差额法余额并行存证 */
  const commissionIdsJson = buildCommissionIdsJson(
    phone,
    Math.round(amount * 100) / 100,
  );

  db.prepare(
    `
    INSERT INTO distribution_withdrawals (distributor_phone, amount, alipay_account, commission_ids)
    VALUES (?, ?, ?, ?)
  `,
  ).run(
    phone,
    Math.round(amount * 100) / 100,
    alipayAccount || null,
    commissionIdsJson,
  );

  const feeHint =
    feeAmount > 0
      ? `（手续费约 ¥${feeAmount}，预计到账 ¥${netAmount}，以审核打款为准）`
      : "";

  res.json({
    success: true,
    message: `提现申请已提交，请等待审核打款${feeHint}`,
    feeAmount,
    netAmount,
  });
});

module.exports = router;
