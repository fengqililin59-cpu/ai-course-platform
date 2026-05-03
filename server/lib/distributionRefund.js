"use strict";

const db = require("../db");
const { advanceSettledCommissions } = require("./distributionSettlement");
const {
  reconcileWithdrawalsAfterCommissionDrop,
} = require("./distributionWithdrawReconcile");

/**
 * 从支付宝异步通知 body 中解析本次退款金额（元）。
 * 优先常见字段；否则遍历以 refund 开头的键取第一个可解析正数（兼容不同产品线字段名）。
 * @param {Record<string, unknown>} body
 */
function parseRefundFeeYuan(body) {
  const candidates = [
    body.refund_fee,
    body.refund_amount,
    body.refund_fee_amount,
    body.total_refund_amount,
  ];
  for (const raw of candidates) {
    const n = parseFloat(String(raw ?? ""));
    if (Number.isFinite(n) && n > 0) return n;
  }
  for (const [k, v] of Object.entries(body)) {
    if (!/^refund/i.test(k)) continue;
    const n = parseFloat(String(v ?? ""));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

/**
 * 支付退款成功后，作废对应分销佣金（幂等）。
 * 当前策略：仅当本次退款金额覆盖原实付（全额退款）时作废佣金，避免部分退款多笔异步通知误伤。
 *
 * 设计备忘（未实现）：若将来支持「部分退款按比例冲减佣金」，可结合
 * `distribution_withdrawals.commission_ids`（[{id,amount}]）与订单退款比例，调减对应
 * `distribution_commissions` 的 commission_amount / 状态，而非整笔 cancelled；并复用现有 reconcile。
 *
 * @param {string} outTradeNo
 * @param {Record<string, unknown>} body 支付宝 notify 原始字段
 */
function tryCancelDistributionCommissionOnRefund(outTradeNo, body) {
  if (!outTradeNo) return;

  advanceSettledCommissions();

  const refundFee = parseRefundFeeYuan(body);
  if (refundFee <= 0) return;

  const row = db
    .prepare(
      `SELECT id, distributor_phone, order_amount, commission_amount, status FROM distribution_commissions WHERE out_trade_no = ?`,
    )
    .get(outTradeNo);
  if (!row || row.status === "cancelled") return;

  const orderYuan = Number(row.order_amount);
  if (!Number.isFinite(orderYuan) || orderYuan <= 0) return;

  const notifyTotal = parseFloat(String(body.total_amount ?? ""));
  const baseline =
    Number.isFinite(notifyTotal) && notifyTotal > 0 ? notifyTotal : orderYuan;

  if (refundFee + 1e-2 < baseline - 1e-2) {
    console.warn(
      "[distribution] skip commission cancel (not full refund)",
      JSON.stringify({
        out_trade_no: outTradeNo,
        refund_fee: refundFee,
        baseline,
        order_yuan: orderYuan,
      }),
    );
    return;
  }

  const info = db
    .prepare(
      `
    UPDATE distribution_commissions
    SET status = 'cancelled',
        paid_at = NULL,
        available_at = NULL
    WHERE out_trade_no = ?
      AND status IN ('pending_settlement', 'available')
  `,
    )
    .run(outTradeNo);

  if (info.changes > 0) {
    console.log(
      "[distribution] commission cancelled after refund",
      outTradeNo,
    );
    // 仅已入账（available）的佣金撤销会减少可提现头寸；待结算撤销不改变 available 合计，避免误拒 pending 提现
    if (row.status === "available") {
      reconcileWithdrawalsAfterCommissionDrop(String(row.distributor_phone), {
        reason: "full_refund_commission_cancelled",
        outTradeNo,
      });
    }
  }
}

module.exports = {
  parseRefundFeeYuan,
  tryCancelDistributionCommissionOnRefund,
};
