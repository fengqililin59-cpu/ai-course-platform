"use strict";

/**
 * 支付成功：标记用户券已用并增加模板 used_count
 * @param {import('better-sqlite3').Database} db
 * @param {number} userCouponId
 * @param {string} outTradeNo
 * @param {string} buyerPhone
 */
function markUserCouponUsed(db, userCouponId, outTradeNo, buyerPhone) {
  const uid = db.prepare(`SELECT id FROM site_users WHERE phone = ?`).get(String(buyerPhone || "").trim());
  if (!uid?.id) return;
  const uc = db
    .prepare(`SELECT id, coupon_id, user_id, status FROM user_coupons WHERE id = ?`)
    .get(userCouponId);
  if (!uc || Number(uc.user_id) !== Number(uid.id)) return;
  if (String(uc.status) !== "unused") return;
  db.prepare(
    `
    UPDATE user_coupons
    SET status = 'used',
        used_at = datetime('now','localtime'),
        out_trade_no = ?
    WHERE id = ? AND status = 'unused'
  `,
  ).run(outTradeNo, userCouponId);
  db.prepare(`UPDATE coupons SET used_count = used_count + 1 WHERE id = ?`).run(uc.coupon_id);
}

/**
 * 订单退款：恢复用户券（与 pay 退款路径配合）
 * @param {import('better-sqlite3').Database} db
 * @param {string} outTradeNo
 */
function restoreUserCouponAfterRefund(db, outTradeNo) {
  const no = String(outTradeNo || "").trim();
  if (!no) return;
  const row = db
    .prepare(`SELECT id, coupon_id FROM user_coupons WHERE out_trade_no = ? AND status = 'used'`)
    .get(no);
  if (!row) return;
  db.prepare(
    `
    UPDATE user_coupons
    SET status = 'unused', used_at = NULL, out_trade_no = NULL
    WHERE id = ?
  `,
  ).run(row.id);
  db.prepare(
    `UPDATE coupons SET used_count = CASE WHEN used_count > 0 THEN used_count - 1 ELSE 0 END WHERE id = ?`,
  ).run(row.coupon_id);
}

module.exports = { markUserCouponUsed, restoreUserCouponAfterRefund };
