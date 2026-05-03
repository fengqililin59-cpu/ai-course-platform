"use strict";

/**
 * 与支付回调里写入的 buyer_phone / userId 对齐（手机号、mail:、wx:、gh:、google: 等）。
 * @param {import("better-sqlite3").Database} db
 * @param {number} siteUserId
 * @returns {string[]}
 */
function siteUserBuyerIdentityStrings(db, siteUserId) {
  const uid = Math.floor(Number(siteUserId));
  if (!Number.isFinite(uid) || uid < 1) return [];
  const u = db
    .prepare(
      `SELECT phone, email, wechat_openid, github_id, google_sub FROM site_users WHERE id = ?`,
    )
    .get(uid);
  if (!u) return [];
  const out = [];
  if (u.phone) out.push(String(u.phone).trim());
  if (u.email) out.push(`mail:${String(u.email).trim()}`);
  if (u.wechat_openid) out.push(`wx:${String(u.wechat_openid).trim()}`);
  if (u.github_id) out.push(`gh:${String(u.github_id).trim()}`);
  if (u.google_sub) out.push(`google:${String(u.google_sub).trim()}`);
  return [...new Set(out.filter(Boolean))];
}

/**
 * 是否可认定用户「已购该课」从而允许提交评价。
 *
 * 说明（与当前 Aike 支付实现一致）：
 * - `orders` 表含 `course_id`（INTEGER）与 `buyer_phone`，目前主要覆盖 **秒杀落库订单** 及需持久化的订单；
 *   普通支付宝单在多数情况下仅存内存 Map，**未必有 orders 行**，不能单靠 orders。
 * - 带推广归因时，`distribution_commissions` 会写入 `buyer_phone` + `course_id`（与下单 courseId 字符串一致），
 *   可作为 **已支付** 的旁证；**无推广链接的纯购买** 可能不产生佣金行，此时服务端无法从库中校验，
 *   需后续在支付成功时落库订单或购买凭证后再收紧策略。
 *
 * @param {import("better-sqlite3").Database} db
 * @param {number} siteUserId
 * @param {string} courseIdStr 与前台 courses.id 一致，如 "12"
 */
function userHasPurchasedCourseForReview(db, siteUserId, courseIdStr) {
  const buyers = siteUserBuyerIdentityStrings(db, siteUserId);
  if (!buyers.length) return false;
  const placeholders = buyers.map(() => "?").join(", ");
  const cidInt = parseInt(String(courseIdStr), 10);

  if (Number.isFinite(cidInt)) {
    const hitOrder = db
      .prepare(
        `
      SELECT 1 AS ok
      FROM orders
      WHERE status = 'paid'
        AND course_id = ?
        AND buyer_phone IN (${placeholders})
      LIMIT 1
    `,
      )
      .get(cidInt, ...buyers);
    if (hitOrder) return true;
  }

  const hitComm = db
    .prepare(
      `
    SELECT 1 AS ok
    FROM distribution_commissions
    WHERE course_id = ?
      AND buyer_phone IN (${placeholders})
      AND IFNULL(status, '') != 'cancelled'
    LIMIT 1
  `,
    )
    .get(String(courseIdStr), ...buyers);
  return Boolean(hitComm);
}

module.exports = {
  siteUserBuyerIdentityStrings,
  userHasPurchasedCourseForReview,
};
