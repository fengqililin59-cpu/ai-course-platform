"use strict";

/**
 * 聚合核心指标（订单仅 status='paid'，按本地日期）
 * @param {import('better-sqlite3').Database} db
 */
function getDashboardMetrics(db) {
  const yesterdayRow = db
    .prepare(
      `
    SELECT date('now', 'localtime', '-1 day') AS ymd
  `,
    )
    .get();
  const ymd = String(yesterdayRow?.ymd || "");

  const newUsers = db
    .prepare(`SELECT CAST(COUNT(*) AS INTEGER) AS v FROM site_users WHERE date(created_at) = ?`)
    .get(ymd)?.v;

  const orderAgg = db
    .prepare(
      `
    SELECT
      CAST(COUNT(*) AS INTEGER) AS order_count,
      CAST(COALESCE(SUM(total_amount), 0) AS REAL) AS order_revenue,
      CAST(COALESCE(SUM(platform_amount), 0) AS REAL) AS platform_revenue
    FROM orders
    WHERE status = 'paid'
      AND paid_at IS NOT NULL
      AND TRIM(paid_at) != ''
      AND date(paid_at) = ?
  `,
    )
    .get(ymd);

  const commissionPaid = db
    .prepare(
      `
    SELECT CAST(COALESCE(SUM(commission_amount), 0) AS REAL) AS v
    FROM distribution_commissions
    WHERE IFNULL(status, '') != 'cancelled'
      AND date(created_at) = ?
  `,
    )
    .get(ymd)?.v;

  const visionCount = db
    .prepare(`SELECT CAST(COUNT(*) AS INTEGER) AS v FROM vision_consultations WHERE date(created_at) = ?`)
    .get(ymd)?.v;

  const jobsSearchCount = db
    .prepare(`SELECT CAST(COUNT(*) AS INTEGER) AS v FROM jobs_search_logs WHERE date(created_at) = ?`)
    .get(ymd)?.v;

  const totalUsers = db.prepare(`SELECT CAST(COUNT(*) AS INTEGER) AS v FROM site_users`).get()?.v;
  const totalOrders = db.prepare(`SELECT CAST(COUNT(*) AS INTEGER) AS v FROM orders WHERE status = 'paid'`).get()
    ?.v;
  const totalRevenue = db
    .prepare(
      `SELECT CAST(COALESCE(SUM(total_amount), 0) AS REAL) AS v FROM orders WHERE status = 'paid'`,
    )
    .get()?.v;

  const courseCompleters7d = db
    .prepare(
      `
    SELECT CAST(COUNT(DISTINCT user_id) AS INTEGER) AS v
    FROM user_course_progress
    WHERE completed_at IS NOT NULL
      AND TRIM(completed_at) != ''
      AND date(completed_at) >= date('now', 'localtime', '-6 days')
      AND date(completed_at) <= date('now', 'localtime')
  `,
    )
    .get()?.v;

  const trendRows = db
    .prepare(
      `
    WITH RECURSIVE days(d) AS (
      SELECT date('now', 'localtime', '-6 days')
      UNION ALL
      SELECT date(d, '+1 day') FROM days WHERE d < date('now', 'localtime')
    )
    SELECT
      days.d AS date,
      (
        SELECT CAST(COUNT(*) AS INTEGER)
        FROM orders o
        WHERE o.status = 'paid'
          AND o.paid_at IS NOT NULL AND TRIM(o.paid_at) != ''
          AND date(o.paid_at) = days.d
      ) AS orders,
      (
        SELECT CAST(COUNT(*) AS INTEGER)
        FROM site_users u
        WHERE date(u.created_at) = days.d
      ) AS users,
      (
        SELECT CAST(COUNT(*) AS INTEGER)
        FROM jobs_search_logs j
        WHERE date(j.created_at) = days.d
      ) AS searches
    FROM days
    ORDER BY days.d ASC
  `,
    )
    .all();

  const dates = [];
  const orders = [];
  const users = [];
  const searches = [];
  for (const row of trendRows) {
    dates.push(String(row.date));
    orders.push(Number(row.orders) || 0);
    users.push(Number(row.users) || 0);
    searches.push(Number(row.searches) || 0);
  }

  return {
    yesterday: {
      newUsers: Number(newUsers) || 0,
      orderCount: Number(orderAgg?.order_count) || 0,
      orderRevenue: Number(orderAgg?.order_revenue) || 0,
      platformRevenue: Number(orderAgg?.platform_revenue) || 0,
      commissionPaid: Number(commissionPaid) || 0,
      visionCount: Number(visionCount) || 0,
      jobsSearchCount: Number(jobsSearchCount) || 0,
    },
    total: {
      users: Number(totalUsers) || 0,
      orders: Number(totalOrders) || 0,
      revenue: Number(totalRevenue) || 0,
    },
    last7Days: {
      courseCompleters: Number(courseCompleters7d) || 0,
    },
    weeklyTrend: { dates, orders, users, searches },
    meta: { yesterdayDate: ymd },
  };
}

module.exports = { getDashboardMetrics };
