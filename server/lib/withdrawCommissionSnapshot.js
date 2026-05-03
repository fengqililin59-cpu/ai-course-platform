"use strict";

const db = require("../db");

/**
 * 按 FIFO（created_at）从 available 佣金中拆分「本次提现实际占用」的金额，写入 JSON。
 * 格式：`[{"id":1,"amount":20},{"id":2,"amount":10}]` — amount 为从该笔佣金中占用的元（最后一笔可为部分占用）。
 * 余额仍以差额法为准；本字段供财务对账与退款归因参考。
 *
 * @param {string} distributorPhone
 * @param {number} amountYuan
 * @returns {string} JSON 数组字符串
 */
function buildCommissionIdsJson(distributorPhone, amountYuan) {
  const phone = String(distributorPhone || "").trim();
  if (!phone || !Number.isFinite(amountYuan) || amountYuan <= 0) {
    return "[]";
  }
  const rows = db
    .prepare(
      `
    SELECT id, commission_amount
    FROM distribution_commissions
    WHERE distributor_phone = ? AND status = 'available'
    ORDER BY datetime(created_at) ASC, id ASC
  `,
    )
    .all(phone);

  let remaining = Math.round(amountYuan * 100) / 100;
  /** @type {{ id: number; amount: number }[]} */
  const parts = [];
  for (const r of rows) {
    if (remaining <= 1e-6) break;
    const comm = Math.round(Number(r.commission_amount) * 100) / 100;
    if (!Number.isFinite(comm) || comm <= 0) continue;
    const use = Math.min(comm, remaining);
    const useR = Math.round(use * 100) / 100;
    parts.push({ id: r.id, amount: useR });
    remaining = Math.round((remaining - useR) * 100) / 100;
  }
  return JSON.stringify(parts);
}

module.exports = { buildCommissionIdsJson };
