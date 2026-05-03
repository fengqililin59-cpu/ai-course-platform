"use strict";

const { schedule } = require("node-cron");

/** @type {ReturnType<typeof schedule> | null} */
let task = null;

/**
 * 释放超时未支付的秒杀订单库存（15 分钟）
 * @param {import('better-sqlite3').Database} db
 * @param {{ forgetPayOrder?: (outTradeNo: string) => void }} [hooks]
 */
function releaseExpiredSeckillOrders(db, hooks) {
  const forget = hooks?.forgetPayOrder;
  const rows = db
    .prepare(
      `
    SELECT id, out_trade_no, seckill_activity_id
    FROM orders
    WHERE status = 'pending_seckill'
      AND seckill_activity_id IS NOT NULL
      AND datetime(created_at) <= datetime('now', 'localtime', '-15 minutes')
  `,
    )
    .all();
  for (const row of rows) {
    const tx = db.transaction(() => {
      db.prepare(`UPDATE orders SET status = 'seckill_expired' WHERE id = ? AND status = 'pending_seckill'`).run(
        row.id,
      );
      if (row.seckill_activity_id) {
        db.prepare(`UPDATE seckill_activities SET stock = stock + 1 WHERE id = ?`).run(row.seckill_activity_id);
      }
    });
    try {
      tx();
      if (forget && row.out_trade_no) forget(String(row.out_trade_no));
    } catch (e) {
      console.error("[seckill-expire] row", row.id, e);
    }
  }
}

function startSeckillExpireCron(db, hooks) {
  if (task) {
    task.stop();
    task = null;
  }
  task = schedule(
    "* * * * *",
    () => {
      try {
        releaseExpiredSeckillOrders(db, hooks);
      } catch (e) {
        console.error("[seckill-expire]", e);
      }
    },
    { timezone: process.env.METRICS_PUSH_TZ || "Asia/Shanghai" },
  );
  console.log("[seckill-expire] cron: every minute");
}

module.exports = { startSeckillExpireCron, releaseExpiredSeckillOrders };
