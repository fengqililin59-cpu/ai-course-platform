"use strict";

/**
 * 头寸口径（与 routes/distribution.js summary / withdraw 一致）：
 * - settledAvailableYuan：status=available 的佣金合计
 * - lockedWithdrawalsYuan：提现 status ∈ (pending, approved, paid) 的金额合计
 * - withdrawableHeadroomYuan = max(0, settled − locked)
 * 对账前统一先 advanceSettledCommissions()，将到期的 pending_settlement 推进为 available。
 */
const db = require("../db");
const { advanceSettledCommissions } = require("./distributionSettlement");
const { logWithdrawAudit } = require("./withdrawAudit");

function settledAvailableYuan(distributorPhone) {
  const phone = String(distributorPhone || "").trim();
  if (!phone) return 0;
  return Number(
    db
      .prepare(
        `
      SELECT COALESCE(SUM(commission_amount), 0) AS v
      FROM distribution_commissions
      WHERE distributor_phone = ? AND status = 'available'
    `,
      )
      .get(phone).v,
  );
}

function lockedWithdrawalsYuan(distributorPhone) {
  const phone = String(distributorPhone || "").trim();
  if (!phone) return 0;
  return Number(
    db
      .prepare(
        `
      SELECT COALESCE(SUM(amount), 0) AS v
      FROM distribution_withdrawals
      WHERE distributor_phone = ? AND status IN ('pending', 'approved', 'paid')
    `,
      )
      .get(phone).v,
  );
}

/** 与 distribution /summary 一致：已入账佣金 − 冻结中的提现（非负） */
function withdrawableHeadroomYuan(distributorPhone) {
  advanceSettledCommissions();
  const settled = settledAvailableYuan(distributorPhone);
  const locked = lockedWithdrawalsYuan(distributorPhone);
  return Math.max(0, Math.round((settled - locked) * 100) / 100);
}

function pendingWithdrawalsTotalYuan(distributorPhone) {
  const phone = String(distributorPhone || "").trim();
  if (!phone) return 0;
  return Number(
    db
      .prepare(
        `
      SELECT COALESCE(SUM(amount), 0) AS v
      FROM distribution_withdrawals
      WHERE distributor_phone = ? AND status = 'pending'
    `,
      )
      .get(phone).v,
  );
}

function rejectAllPending(distributorPhone, meta, pendingSum, headroom) {
  const phone = String(distributorPhone || "").trim();
  if (!phone) return;
  const reason = meta?.reason || "commission_reduced";
  const otn = meta?.outTradeNo ? ` out_trade_no=${meta.outTradeNo}` : "";
  const rows = db
    .prepare(
      `
    SELECT id, amount
    FROM distribution_withdrawals
    WHERE distributor_phone = ? AND status = 'pending'
    ORDER BY id ASC
  `,
    )
    .all(phone);

  for (const r of rows) {
    const info = db
      .prepare(
        `
      UPDATE distribution_withdrawals
      SET status = 'rejected'
      WHERE id = ? AND status = 'pending'
    `,
      )
      .run(r.id);
    if (info.changes > 0) {
      logWithdrawAudit({
        withdrawalId: r.id,
        action: "auto_reject_refund",
        actor: "system",
        detail: `${reason}${otn} pending_total=${pendingSum} headroom=${headroom} row_amount=${r.amount}`,
      });
    }
  }
}

/**
 * 佣金减少（如全额退款撤销 available）后：若「冻结提现」>「available 佣金合计」，先拒 pending，再按 LIFO 拒 approved，直至头寸平衡（paid 不动）。
 * @param {string} distributorPhone
 * @param {{ reason?: string; outTradeNo?: string }} [meta]
 */
function reconcileWithdrawalsAfterCommissionDrop(distributorPhone, meta) {
  const phone = String(distributorPhone || "").trim();
  if (!phone) return;

  const reason = meta?.reason || "commission_reduced";
  const otn = meta?.outTradeNo ? ` out_trade_no=${meta.outTradeNo}` : "";

  let guard = 0;
  while (guard++ < 80) {
    advanceSettledCommissions();
    const settled = settledAvailableYuan(phone);
    const locked = lockedWithdrawalsYuan(phone);
    if (locked <= settled + 1e-6) return;

    const pendingSum = pendingWithdrawalsTotalYuan(phone);
    const headroom = withdrawableHeadroomYuan(phone);

    if (pendingSum > 1e-6) {
      rejectAllPending(phone, meta, pendingSum, headroom);
      continue;
    }

    const approved = db
      .prepare(
        `
      SELECT id, amount
      FROM distribution_withdrawals
      WHERE distributor_phone = ? AND status = 'approved'
      ORDER BY id DESC
      LIMIT 1
    `,
      )
      .get(phone);

    if (!approved) {
      console.error(
        "[distribution] overcommit: locked>settled but no pending/approved to unwind",
        JSON.stringify({ phone, settled, locked }),
      );
      return;
    }

    const info = db
      .prepare(
        `
      UPDATE distribution_withdrawals
      SET status = 'rejected'
      WHERE id = ? AND status = 'approved'
    `,
      )
      .run(approved.id);
    if (info.changes > 0) {
      logWithdrawAudit({
        withdrawalId: approved.id,
        action: "auto_reject_approved_overcommit",
        actor: "system",
        detail: `${reason}${otn} settled=${settled} locked=${locked} row_amount=${approved.amount}`,
      });
    }
  }
}

/** @deprecated 名称保留，内部转调统一对账 */
function reconcilePendingWithdrawalsAfterCommissionChange(distributorPhone, meta) {
  reconcileWithdrawalsAfterCommissionDrop(distributorPhone, meta);
}

module.exports = {
  reconcileWithdrawalsAfterCommissionDrop,
  reconcilePendingWithdrawalsAfterCommissionChange,
  withdrawableHeadroomYuan,
  settledAvailableYuan,
  lockedWithdrawalsYuan,
};
