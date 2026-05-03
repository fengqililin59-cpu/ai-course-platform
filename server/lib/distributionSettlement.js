"use strict";

const db = require("../db");

/** 将已到「可提现日」的佣金从 pending_settlement 推进为 available（懒结算，无独立定时任务） */
function advanceSettledCommissions() {
  db.prepare(
    `
    UPDATE distribution_commissions
    SET
      status = 'available',
      paid_at = COALESCE(paid_at, datetime('now','localtime'))
    WHERE status = 'pending_settlement'
      AND available_at IS NOT NULL
      AND datetime(available_at) <= datetime('now','localtime')
  `,
  ).run();
}

/** 新佣金记录的「可提现」起始时间（DISTRIBUTION_SETTLE_DAYS，0 表示支付后立即可提现） */
function computeCommissionAvailableAt() {
  const n = Math.floor(Number(process.env.DISTRIBUTION_SETTLE_DAYS));
  const sd = !Number.isFinite(n) || n < 0 ? 7 : Math.min(90, n);
  if (sd <= 0) {
    return db.prepare(`SELECT datetime('now','localtime') AS d`).get().d;
  }
  const mod = `+${sd} days`;
  return db.prepare(`SELECT datetime('now','localtime', ?) AS d`).get(mod).d;
}

module.exports = {
  advanceSettledCommissions,
  computeCommissionAvailableAt,
};
