"use strict";

const express = require("express");
const router = express.Router();
const { validate: validateCronExpr } = require("node-cron");
const db = require("../db");
const { refreshHotSkillsSnapshot } = require("../lib/jobsHotSkillsSnapshot");
const { getDashboardMetrics } = require("../lib/metricsDashboardQuery");
const { encryptWebhookUrl } = require("../lib/metricsWebhookCrypto");
const { reloadMetricsPushCron, effectiveCronExpr } = require("../lib/metricsPushCron");
const { envPushDisabled } = require("../lib/metricsDailyPush");
const { attachCouponAdmin } = require("./coupon");
const { attachSeckillAdmin } = require("./seckill");
const { logWithdrawAudit } = require("../lib/withdrawAudit");
const { maskSiteUserDisplay } = require("../lib/siteUserMask");

/** @param {number} current @param {number} previous */
function monthOverMonthPercent(current, previous) {
  const c = Number(current);
  const p = Number(previous);
  if (!Number.isFinite(c) || !Number.isFinite(p)) return 0;
  if (p === 0) return c === 0 ? 0 : 100;
  return ((c - p) / p) * 100;
}

/** @param {unknown} s @returns {string | null} */
function parseYmdQuery(s) {
  if (s == null) return null;
  const t = String(s).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return t;
}

/** @param {string} ymd */
function ymdToLocalDate(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd).trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return dt;
}

/** @param {Date} d */
function localDateToYmd(d) {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

/**
 * 与 [startYmd, endYmd] 包含的日历天数相同、且紧邻其前的上一段日期（用于热门词环比）
 * @param {string} startYmd
 * @param {string} endYmd
 * @returns {{ from: string, to: string } | null}
 */
function previousIdenticalCalendarRange(startYmd, endYmd) {
  const s0 = ymdToLocalDate(startYmd);
  const e0 = ymdToLocalDate(endYmd);
  if (!s0 || !e0 || s0 > e0) return null;
  const n = Math.floor((e0.getTime() - s0.getTime()) / 86400000) + 1;
  const prevEnd = new Date(s0);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - (n - 1));
  return { from: localDateToYmd(prevStart), to: localDateToYmd(prevEnd) };
}

// 与前端 localStorage `admin_token` 对齐（可用环境变量覆盖）
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Aike@2026#Ai";

function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token || token !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: "未授权" });
  }
  next();
}

/** 审计 actor：优先请求头 X-Admin-Name；否则 Bearer 若为 user:secret 形式取 user；否则 admin */
function resolveAdminActor(req) {
  const raw = req.get("X-Admin-Name") || req.headers["x-admin-name"];
  if (raw != null && String(raw).trim()) return String(raw).trim().slice(0, 128);
  const auth = String(req.headers.authorization || "");
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (token && token.includes(":")) {
    const userPart = token.split(":")[0];
    if (userPart) return userPart.slice(0, 128);
  }
  return "admin";
}

function parseWithdrawCommissionIds(raw) {
  try {
    const a = JSON.parse(String(raw || "[]"));
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

function pickWithdrawalApplicantContact(row) {
  const d = String(row.distributor_phone || "");
  const low = d.toLowerCase();
  if (low.startsWith("mail:") && row.join_su_email) return String(row.join_su_email);
  if (row.join_su_phone) return String(row.join_su_phone);
  if (row.join_su_email) return String(row.join_su_email);
  if (row.join_cr_phone) return String(row.join_cr_phone);
  return d || null;
}

router.get("/join-applications", requireAdmin, (req, res) => {
  const { status } = req.query;
  let sql = "SELECT * FROM join_applications";
  const params = [];
  if (status && ["pending", "approved", "rejected"].includes(status)) {
    sql += " WHERE status = ?";
    params.push(status);
  }
  sql += " ORDER BY created_at DESC";
  const rows = db.prepare(sql).all(...params);
  res.json({ success: true, data: rows });
});

router.put("/join-applications/:id", requireAdmin, (req, res) => {
  const { status } = req.body;
  if (!["approved", "rejected", "pending"].includes(status)) {
    return res.status(400).json({ success: false, message: "状态值无效" });
  }

  const app = db.prepare("SELECT * FROM join_applications WHERE id=?").get(req.params.id);
  if (!app) return res.status(404).json({ success: false, message: "申请不存在" });

  db.prepare("UPDATE join_applications SET status=? WHERE id=?").run(status, app.id);

  res.json({ success: true });
});

router.get("/creators", requireAdmin, (req, res) => {
  const rows = db
    .prepare(
      `
    SELECT c.*,
      (SELECT COUNT(*) FROM courses WHERE creator_id=c.id) as course_count,
      (SELECT COUNT(*) FROM orders o WHERE o.creator_id=c.id AND o.status='paid') as order_count,
      (SELECT COALESCE(SUM(creator_amount),0) FROM orders o WHERE o.creator_id=c.id AND o.status='paid') as total_earnings
    FROM creators c
    ORDER BY c.created_at DESC
  `,
    )
    .all();
  res.json({ success: true, data: rows });
});

router.put("/creators/:id", requireAdmin, (req, res) => {
  const { status } = req.body;
  if (!["pending", "approved", "rejected"].includes(status)) {
    return res.status(400).json({ success: false, message: "状态值无效" });
  }
  const creator = db.prepare("SELECT id FROM creators WHERE id=?").get(req.params.id);
  if (!creator) return res.status(404).json({ success: false, message: "创作者不存在" });

  db.prepare("UPDATE creators SET status=?, updated_at=datetime('now','localtime') WHERE id=?").run(
    status,
    creator.id,
  );
  res.json({ success: true });
});

router.get("/courses", requireAdmin, (req, res) => {
  const { status } = req.query;
  let sql = `
    SELECT c.*, cr.phone as creator_phone, cr.display_name as creator_name
    FROM courses c
    JOIN creators cr ON cr.id = c.creator_id
  `;
  const params = [];
  if (status && ["draft", "pending", "published", "offline"].includes(status)) {
    sql += " WHERE c.status = ?";
    params.push(status);
  }
  sql += " ORDER BY c.created_at DESC";
  const rows = db.prepare(sql).all(...params);
  res.json({ success: true, data: rows });
});

/** 更新数据库课程（用于 tags 等，供就业雷达推荐匹配） */
router.put("/courses/:id", requireAdmin, (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ success: false, message: "无效的课程 ID" });
  }
  const course = db.prepare("SELECT id FROM courses WHERE id=?").get(id);
  if (!course) {
    return res.status(404).json({ success: false, message: "课程不存在" });
  }

  const { tags, title, description } = req.body;
  const sets = [];
  const vals = [];
  if (typeof tags === "string") {
    sets.push("tags=?");
    vals.push(tags.trim().slice(0, 2000));
  }
  if (typeof title === "string" && title.trim()) {
    sets.push("title=?");
    vals.push(title.trim().slice(0, 500));
  }
  if (typeof description === "string") {
    sets.push("description=?");
    vals.push(String(description).slice(0, 8000));
  }
  if (sets.length === 0) {
    return res.status(400).json({
      success: false,
      message: "请至少提供 tags、title 或 description 之一",
    });
  }
  sets.push("updated_at=datetime('now','localtime')");
  vals.push(id);
  db.prepare(`UPDATE courses SET ${sets.join(", ")} WHERE id=?`).run(...vals);
  res.json({ success: true });
});

router.put("/courses/:id/status", requireAdmin, (req, res) => {
  const { status } = req.body;
  if (!["published", "offline", "pending", "draft"].includes(status)) {
    return res.status(400).json({ success: false, message: "状态值无效" });
  }
  db.prepare("UPDATE courses SET status=?, updated_at=datetime('now','localtime') WHERE id=?").run(
    status,
    req.params.id,
  );
  res.json({ success: true });
});

router.get("/stats", requireAdmin, (req, res) => {
  const totalCreators = db.prepare("SELECT COUNT(*) as v FROM creators").get().v;
  const pendingApps = db
    .prepare("SELECT COUNT(*) as v FROM join_applications WHERE status='pending'")
    .get().v;
  const pendingCourses = db.prepare("SELECT COUNT(*) as v FROM courses WHERE status='pending'").get().v;
  const totalOrders = db.prepare("SELECT COUNT(*) as v FROM orders WHERE status='paid'").get().v;
  const totalRevenue = db
    .prepare("SELECT COALESCE(SUM(platform_amount),0) as v FROM orders WHERE status='paid'")
    .get().v;
  res.json({
    success: true,
    data: { totalCreators, pendingApps, pendingCourses, totalOrders, totalRevenue },
  });
});

/**
 * 数据分析看板：用户、订单、分销、销售趋势、课程 Top5、提现汇总
 * 可选查询 paidFrom、paidTo（YYYY-MM-DD）：按 paid_at 筛订单与图表；按 created_at 同日筛
 * 分销链接数、佣金合计、提现分组、视觉咨询条数；不提供环比
 * GET /api/admin/dashboard/analytics
 */
router.get("/dashboard/analytics", requireAdmin, (req, res) => {
  try {
    const paidFrom = parseYmdQuery(req.query.paidFrom);
    const paidTo = parseYmdQuery(req.query.paidTo);
    const useRange = Boolean(paidFrom && paidTo && paidFrom <= paidTo);
    const paidDateSql = useRange
      ? ` AND paid_at IS NOT NULL AND TRIM(paid_at) != '' AND date(paid_at) >= ? AND date(paid_at) <= ?`
      : "";
    const paidArgs = useRange ? [paidFrom, paidTo] : [];

    const siteUsersCount = db.prepare("SELECT COUNT(*) as v FROM site_users").get().v;

    const createdDateSql = useRange
      ? ` AND date(created_at) >= ? AND date(created_at) <= ?`
      : "";
    const createdArgs = useRange ? [paidFrom, paidTo] : [];

    const visionConsultationsCount = db
      .prepare(`SELECT COUNT(*) as v FROM vision_consultations WHERE 1=1${createdDateSql}`)
      .get(...createdArgs).v;

    const paidOrders = db
      .prepare(
        `
      SELECT
        COUNT(*) AS count,
        CAST(COALESCE(SUM(total_amount), 0) AS REAL) AS gross_revenue,
        CAST(COALESCE(SUM(creator_amount), 0) AS REAL) AS creator_payouts,
        CAST(COALESCE(SUM(platform_amount), 0) AS REAL) AS platform_revenue
      FROM orders
      WHERE status = 'paid'${paidDateSql}
    `,
      )
      .get(...paidArgs);

    let monthlyComparison = null;
    if (!useRange) {
      const paidThisMonth = db
        .prepare(
          `
      SELECT
        CAST(COALESCE(SUM(total_amount), 0) AS REAL) AS gross_revenue,
        CAST(COALESCE(SUM(creator_amount), 0) AS REAL) AS creator_payouts,
        CAST(COALESCE(SUM(platform_amount), 0) AS REAL) AS platform_revenue
      FROM orders
      WHERE status = 'paid'
        AND paid_at IS NOT NULL
        AND TRIM(paid_at) != ''
        AND date(paid_at) >= date('now', 'localtime', 'start of month')
        AND date(paid_at) <= date('now', 'localtime')
    `,
        )
        .get();

      const paidLastMonth = db
        .prepare(
          `
      SELECT
        CAST(COALESCE(SUM(total_amount), 0) AS REAL) AS gross_revenue,
        CAST(COALESCE(SUM(creator_amount), 0) AS REAL) AS creator_payouts,
        CAST(COALESCE(SUM(platform_amount), 0) AS REAL) AS platform_revenue
      FROM orders
      WHERE status = 'paid'
        AND paid_at IS NOT NULL
        AND TRIM(paid_at) != ''
        AND date(paid_at) >= date('now', 'localtime', 'start of month', '-1 month')
        AND date(paid_at) < date('now', 'localtime', 'start of month')
    `,
        )
        .get();

      const siteUsersEndLastMonth = db
        .prepare(
          `
      SELECT COUNT(*) AS v
      FROM site_users
      WHERE date(created_at) <= date('now', 'localtime', 'start of month', '-1 day')
    `,
        )
        .get().v;

      monthlyComparison = {
        siteUsers: monthOverMonthPercent(siteUsersCount, siteUsersEndLastMonth),
        grossRevenue: monthOverMonthPercent(
          paidThisMonth.gross_revenue ?? 0,
          paidLastMonth.gross_revenue ?? 0,
        ),
        platformRevenue: monthOverMonthPercent(
          paidThisMonth.platform_revenue ?? 0,
          paidLastMonth.platform_revenue ?? 0,
        ),
        creatorPayouts: monthOverMonthPercent(
          paidThisMonth.creator_payouts ?? 0,
          paidLastMonth.creator_payouts ?? 0,
        ),
      };
    }

    const dailySales = useRange
      ? db
          .prepare(
            `
      SELECT
        date(o.paid_at) AS date,
        CAST(SUM(o.total_amount) AS REAL) AS revenue,
        CAST(SUM(o.platform_amount) AS REAL) AS platform_revenue,
        CAST(COUNT(*) AS INTEGER) AS order_count
      FROM orders o
      WHERE o.status = 'paid'
        AND o.paid_at IS NOT NULL
        AND TRIM(o.paid_at) != ''
        AND date(o.paid_at) >= ? AND date(o.paid_at) <= ?
      GROUP BY date(o.paid_at)
      ORDER BY date ASC
    `,
          )
          .all(paidFrom, paidTo)
      : db
          .prepare(
            `
      SELECT
        date(o.paid_at) AS date,
        CAST(SUM(o.total_amount) AS REAL) AS revenue,
        CAST(SUM(o.platform_amount) AS REAL) AS platform_revenue,
        CAST(COUNT(*) AS INTEGER) AS order_count
      FROM orders o
      WHERE o.status = 'paid'
        AND o.paid_at IS NOT NULL
        AND TRIM(o.paid_at) != ''
        AND date(o.paid_at) >= date('now', 'localtime', '-30 days')
      GROUP BY date(o.paid_at)
      ORDER BY date ASC
    `,
          )
          .all();

    const topCourses = useRange
      ? db
          .prepare(
            `
      SELECT
        c.id AS course_id,
        c.title AS title,
        CAST(COUNT(o.id) AS INTEGER) AS order_count,
        CAST(COALESCE(SUM(o.total_amount), 0) AS REAL) AS revenue
      FROM orders o
      JOIN courses c ON c.id = o.course_id
      WHERE o.status = 'paid'
        AND o.paid_at IS NOT NULL
        AND TRIM(o.paid_at) != ''
        AND date(o.paid_at) >= ? AND date(o.paid_at) <= ?
      GROUP BY c.id
      ORDER BY revenue DESC
      LIMIT 5
    `,
          )
          .all(paidFrom, paidTo)
      : db
          .prepare(
            `
      SELECT
        c.id AS course_id,
        c.title AS title,
        CAST(COUNT(o.id) AS INTEGER) AS order_count,
        CAST(COALESCE(SUM(o.total_amount), 0) AS REAL) AS revenue
      FROM orders o
      JOIN courses c ON c.id = o.course_id
      WHERE o.status = 'paid'
      GROUP BY c.id
      ORDER BY revenue DESC
      LIMIT 5
    `,
          )
          .all();

    const distributionLinksCount = db
      .prepare(`SELECT COUNT(*) as v FROM distribution_links WHERE 1=1${createdDateSql}`)
      .get(...createdArgs).v;

    const distributionCommissionTotal = db
      .prepare(
        `
      SELECT CAST(COALESCE(SUM(commission_amount), 0) AS REAL) AS v
      FROM distribution_commissions
      WHERE IFNULL(status, '') != 'cancelled'${createdDateSql}
    `,
      )
      .get(...createdArgs).v;

    const withdrawalRows = db
      .prepare(
        `
      SELECT status, COUNT(*) AS count, CAST(COALESCE(SUM(amount), 0) AS REAL) AS amount
      FROM distribution_withdrawals
      WHERE 1=1${createdDateSql}
      GROUP BY status
    `,
      )
      .all(...createdArgs);

    return res.json({
      success: true,
      data: {
        siteUsersCount,
        visionConsultationsCount,
        paidOrders: {
          count: paidOrders.count ?? 0,
          grossRevenue: paidOrders.gross_revenue ?? 0,
          creatorPayouts: paidOrders.creator_payouts ?? 0,
          platformRevenue: paidOrders.platform_revenue ?? 0,
        },
        dailySales,
        topCourses,
        distribution: {
          linksCount: distributionLinksCount,
          commissionTotalYuan: distributionCommissionTotal,
          withdrawalsByStatus: withdrawalRows,
        },
        monthlyComparison,
        ordersDateRange: useRange ? { from: paidFrom, to: paidTo } : null,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("[admin dashboard/analytics]", err);
    return res.status(500).json({ success: false, message: "服务器错误" });
  }
});

/**
 * 学习进度汇总（进度表 + 学习会话）
 * GET /api/admin/dashboard/learning-stats
 */
router.get("/dashboard/learning-stats", requireAdmin, (_req, res) => {
  try {
    const avgRow = db
      .prepare(
        `
      SELECT CAST(COALESCE(AVG(progress_percent), 0) AS REAL) AS v
      FROM user_course_progress
    `,
      )
      .get();
    const activeProgressRow = db
      .prepare(
        `
      SELECT CAST(COUNT(DISTINCT user_id) AS INTEGER) AS c
      FROM user_course_progress
      WHERE datetime(updated_at) >= datetime('now', 'localtime', '-7 days')
    `,
      )
      .get();
    const totalSecsRow = db
      .prepare(
        `
      SELECT CAST(COALESCE(SUM(duration_seconds), 0) AS INTEGER) AS v
      FROM user_learning_sessions
    `,
      )
      .get();
    const activeSessionsRow = db
      .prepare(
        `
      SELECT CAST(COUNT(DISTINCT user_id) AS INTEGER) AS c
      FROM user_learning_sessions
      WHERE date(start_at) >= date('now', 'localtime', '-7 days')
    `,
      )
      .get();
    const sessionLearnerCountRow = db
      .prepare(
        `
      SELECT CAST(COUNT(DISTINCT user_id) AS INTEGER) AS c
      FROM user_learning_sessions
    `,
      )
      .get();
    const totalSecs = totalSecsRow?.v ?? 0;
    const sessionLearnerCount = sessionLearnerCountRow?.c ?? 0;
    const avgLearningSecondsPerUser =
      sessionLearnerCount === 0 ? 0 : totalSecs / sessionLearnerCount;
    return res.json({
      success: true,
      data: {
        avgCompletionPercent: avgRow?.v ?? 0,
        activeLearners7d: activeProgressRow?.c ?? 0,
        totalLearningSeconds: totalSecs,
        sessionLearnerCount,
        avgLearningSecondsPerUser,
        activeLearnersSessions7d: activeSessionsRow?.c ?? 0,
      },
    });
  } catch (err) {
    console.error("[admin dashboard/learning-stats]", err);
    return res.status(500).json({ success: false, message: "服务器错误" });
  }
});

/**
 * 近 30 日课程完成人数（progress ≥80% 且 completed_at 落在当日）
 * GET /api/admin/dashboard/completion-trend
 */
router.get("/dashboard/completion-trend", requireAdmin, (_req, res) => {
  try {
    const rows = db
      .prepare(
        `
      SELECT
        date(completed_at) AS date,
        CAST(COUNT(DISTINCT user_id) AS INTEGER) AS completions
      FROM user_course_progress
      WHERE completed_at IS NOT NULL
        AND TRIM(completed_at) != ''
        AND date(completed_at) >= date('now', 'localtime', '-30 days')
      GROUP BY date(completed_at)
      ORDER BY date ASC
    `,
      )
      .all();
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error("[admin dashboard/completion-trend]", err);
    return res.status(500).json({ success: false, message: "服务器错误" });
  }
});

/**
 * 已上架课程学习进度排行（与 user_course_progress 关联）
 * GET /api/admin/dashboard/course-progress-stats
 */
router.get("/dashboard/course-progress-stats", requireAdmin, (_req, res) => {
  try {
    const stats = db
      .prepare(
        `
      SELECT
        c.id AS id,
        c.title AS title,
        CAST(COUNT(DISTINCT p.user_id) AS INTEGER) AS learner_count,
        CAST(COALESCE(AVG(p.progress_percent), 0) AS REAL) AS avg_completion,
        MAX(p.updated_at) AS last_activity
      FROM courses c
      LEFT JOIN user_course_progress p ON p.course_id = CAST(c.id AS TEXT)
      WHERE c.status = 'published'
      GROUP BY c.id, c.title
      ORDER BY learner_count DESC, avg_completion DESC
      LIMIT 10
    `,
      )
      .all();
    return res.json({ success: true, data: stats });
  } catch (err) {
    console.error("[admin dashboard/course-progress-stats]", err);
    return res.status(500).json({ success: false, message: "服务器错误" });
  }
});

/**
 * 就业雷达热门搜索关键词 TOP10（按日期区间）
 * GET /api/admin/dashboard/hot-keywords?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&compare=true
 */
router.get("/dashboard/hot-keywords", requireAdmin, (req, res) => {
  try {
    const startDate = parseYmdQuery(req.query.startDate);
    const endDate = parseYmdQuery(req.query.endDate);
    if (!startDate || !endDate || startDate > endDate) {
      return res.status(400).json({
        success: false,
        message: "请提供有效的 startDate、endDate（YYYY-MM-DD），且开始≤结束",
      });
    }

    const current = db
      .prepare(
        `
      SELECT
        keyword,
        CAST(COUNT(*) AS INTEGER) AS search_count,
        CAST(COUNT(DISTINCT user_id) AS INTEGER) AS unique_users
      FROM jobs_search_logs
      WHERE date(created_at) >= ? AND date(created_at) <= ?
      GROUP BY keyword
      ORDER BY search_count DESC
      LIMIT 10
    `,
      )
      .all(startDate, endDate);

    const payload = { current };
    const wantCompare = String(req.query.compare || "").toLowerCase() === "true";
    if (wantCompare) {
      const prev = previousIdenticalCalendarRange(startDate, endDate);
      /** @type {Record<string, number>} */
      const previous = {};
      if (prev) {
        const previousRows = db
          .prepare(
            `
          SELECT keyword, CAST(COUNT(*) AS INTEGER) AS search_count
          FROM jobs_search_logs
          WHERE date(created_at) >= ? AND date(created_at) <= ?
          GROUP BY keyword
        `,
          )
          .all(prev.from, prev.to);
        for (const row of previousRows) {
          previous[row.keyword] = row.search_count;
        }
      }
      payload.previous = previous;
    }

    return res.json({ success: true, data: payload });
  } catch (err) {
    console.error("[admin dashboard/hot-keywords]", err);
    return res.status(500).json({ success: false, message: "服务器错误" });
  }
});

/** AI 视觉定制页咨询记录（POST /api/contact/ai-vision 写入） */
router.get("/vision-consultations", requireAdmin, (req, res) => {
  let limit = parseInt(String(req.query.limit ?? "100"), 10);
  if (!Number.isFinite(limit) || limit < 1) limit = 100;
  limit = Math.min(500, limit);
  try {
    const rows = db
      .prepare(
        `
      SELECT id, name, contact, service_type, budget_range, description, created_at
      FROM vision_consultations
      ORDER BY datetime(created_at) DESC, id DESC
      LIMIT ?
    `,
      )
      .all(limit);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error("[admin vision-consultations]", err);
    return res.status(500).json({ success: false, message: "服务器错误" });
  }
});

/** 分享短链列表（点击次数统计） */
router.get("/share-links", requireAdmin, (req, res) => {
  let limit = parseInt(String(req.query.limit ?? "100"), 10);
  if (!Number.isFinite(limit) || limit < 1) limit = 100;
  limit = Math.min(500, limit);
  try {
    const rows = db
      .prepare(
        `
        SELECT id, short_code, target_url, title, user_id, click_count, unique_visitors, created_at
        FROM share_links
        ORDER BY datetime(created_at) DESC, id DESC
        LIMIT ?
      `,
      )
      .all(limit);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error("[admin share-links]", err);
    return res.status(500).json({ success: false, message: "服务器错误" });
  }
});

/** 手动触发就业雷达「热门技能」快照刷新（等同 npm run jobs:refresh-hot-skills） */
router.post("/jobs/refresh-hot-skills", requireAdmin, async (_req, res) => {
  try {
    const count = await refreshHotSkillsSnapshot(db);
    const maxU = db
      .prepare(`SELECT MAX(updated_at) AS t FROM jobs_hot_skills_snapshot`)
      .get();
    res.json({
      success: true,
      count,
      snapshotUpdatedAt: maxU?.t ?? null,
    });
  } catch (e) {
    console.error("[admin] refresh-hot-skills", e);
    res.status(500).json({
      success: false,
      message: e instanceof Error ? e.message : String(e),
    });
  }
});

/** 核心指标仪表盘（昨日 + 累计 + 近7日趋势） */
router.get("/dashboard-metrics", requireAdmin, (_req, res) => {
  try {
    const data = getDashboardMetrics(db);
    return res.json({ success: true, data });
  } catch (e) {
    console.error("[admin dashboard-metrics]", e);
    return res.status(500).json({ success: false, message: "服务器错误" });
  }
});

/** 日报推送设置（Webhook 仅存密文，不回传明文） */
router.get("/notification-settings", requireAdmin, (_req, res) => {
  try {
    const row = db
      .prepare(
        `SELECT enabled, cron_expr,
                CASE WHEN webhook_cipher IS NOT NULL AND TRIM(webhook_cipher) != '' THEN 1 ELSE 0 END AS has_stored
         FROM admin_metrics_push_settings WHERE id = 1`,
      )
      .get();
    const hasDing = Boolean(String(process.env.DINGTALK_WEBHOOK_URL || "").trim());
    const hasWx = Boolean(String(process.env.WECHAT_WEBHOOK_URL || "").trim());
    return res.json({
      success: true,
      data: {
        enabled: Boolean(row?.enabled),
        cronExpr: String(row?.cron_expr || "0 9 * * *"),
        hasStoredWebhook: Boolean(row?.has_stored),
        envWebhookDingtalk: hasDing,
        envWebhookWecom: hasWx,
        envPushMasterOn: !envPushDisabled(),
        effectiveCron: effectiveCronExpr(),
      },
    });
  } catch (e) {
    console.error("[admin notification-settings get]", e);
    return res.status(500).json({ success: false, message: "服务器错误" });
  }
});

router.put("/notification-settings", requireAdmin, (req, res) => {
  try {
    const row = db
      .prepare(`SELECT enabled, cron_expr, webhook_cipher FROM admin_metrics_push_settings WHERE id = 1`)
      .get();
    if (!row) {
      return res.status(500).json({ success: false, message: "配置表缺失" });
    }
    const body = req.body || {};
    let nextEnabled = row.enabled ? 1 : 0;
    if (typeof body.enabled === "boolean") nextEnabled = body.enabled ? 1 : 0;
    else if (body.enabled === 1 || body.enabled === 0) nextEnabled = Number(body.enabled) ? 1 : 0;

    let nextCron = String(row.cron_expr || "0 9 * * *").trim();
    if (body.cronExpr != null && String(body.cronExpr).trim()) {
      const c = String(body.cronExpr).trim();
      if (!validateCronExpr(c)) {
        return res.status(400).json({ success: false, message: "Cron 表达式无效" });
      }
      nextCron = c;
    }

    let nextCipher = row.webhook_cipher;
    if (Object.prototype.hasOwnProperty.call(body, "webhookUrl")) {
      const w = body.webhookUrl;
      if (w == null || String(w).trim() === "") {
        nextCipher = null;
      } else {
        const url = String(w).trim();
        if (!/^https:\/\//i.test(url)) {
          return res.status(400).json({ success: false, message: "Webhook 须为 https 开头" });
        }
        nextCipher = encryptWebhookUrl(url);
      }
    }

    db.prepare(
      `UPDATE admin_metrics_push_settings
       SET enabled = ?, cron_expr = ?, webhook_cipher = ?, updated_at = datetime('now','localtime')
       WHERE id = 1`,
    ).run(nextEnabled, nextCron, nextCipher);

    try {
      reloadMetricsPushCron();
    } catch (e) {
      console.error("[admin notification-settings] reload cron", e);
    }

    return res.json({ success: true, message: "已保存", data: { effectiveCron: effectiveCronExpr() } });
  } catch (e) {
    console.error("[admin notification-settings put]", e);
    return res.status(500).json({ success: false, message: "服务器错误" });
  }
});

/** 分销提现列表（管理后台） */
router.get("/withdrawals", requireAdmin, (req, res) => {
  try {
    const { status } = req.query;
    const page = Math.max(1, Math.floor(Number(req.query.page)) || 1);
    const pageSize = Math.min(100, Math.max(1, Math.floor(Number(req.query.pageSize)) || 20));
    const offset = (page - 1) * pageSize;

    const allowed = ["pending", "approved", "rejected", "paid"];
    const where = [];
    /** @type {unknown[]} */
    const params = [];
    if (status && String(status) !== "all" && allowed.includes(String(status))) {
      where.push("w.status = ?");
      params.push(String(status));
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const countRow = db
      .prepare(
        `
      SELECT COUNT(*) AS c
      FROM distribution_withdrawals w
      ${whereSql}
    `,
      )
      .get(...params);

    const rows = db
      .prepare(
        `
      SELECT
        w.id,
        w.distributor_phone,
        w.amount,
        w.alipay_account,
        w.wechat_account,
        w.commission_ids,
        w.status,
        w.created_at,
        w.updated_at,
        su.phone AS join_su_phone,
        su.email AS join_su_email,
        cr.phone AS join_cr_phone
      FROM distribution_withdrawals w
      LEFT JOIN site_users su
        ON su.phone = w.distributor_phone
        OR (
          w.distributor_phone LIKE 'mail:%'
          AND LOWER(TRIM(su.email)) = LOWER(TRIM(SUBSTR(w.distributor_phone, 6)))
        )
      LEFT JOIN creators cr ON cr.phone = w.distributor_phone
      ${whereSql}
      ORDER BY datetime(w.created_at) DESC, w.id DESC
      LIMIT ? OFFSET ?
    `,
      )
      .all(...params, pageSize, offset);

    const list = rows.map((row) => ({
      id: row.id,
      amount: row.amount,
      alipay_account: row.alipay_account ?? null,
      wechat_account: row.wechat_account ?? null,
      commission_ids: parseWithdrawCommissionIds(row.commission_ids),
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at ?? null,
      creator_phone: pickWithdrawalApplicantContact(row),
    }));

    return res.json({
      success: true,
      data: {
        list,
        total: Number(countRow.c) || 0,
        page,
        pageSize,
      },
    });
  } catch (e) {
    console.error("[admin/withdrawals list]", e);
    return res.status(500).json({ success: false, message: "服务器错误" });
  }
});

router.get("/withdrawals/:id/audits", requireAdmin, (req, res) => {
  try {
    const id = Math.floor(Number(req.params.id));
    if (!Number.isFinite(id) || id < 1) {
      return res.status(400).json({ success: false, message: "id 无效" });
    }
    const exists = db.prepare(`SELECT id FROM distribution_withdrawals WHERE id = ?`).get(id);
    if (!exists) return res.status(404).json({ success: false, message: "记录不存在" });
    const rows = db
      .prepare(
        `
      SELECT id, withdrawal_id, action, actor, detail, created_at
      FROM distribution_withdrawal_audits
      WHERE withdrawal_id = ?
      ORDER BY datetime(created_at) ASC, id ASC
    `,
      )
      .all(id);
    return res.json({ success: true, data: rows });
  } catch (e) {
    console.error("[admin/withdrawals audits]", e);
    return res.status(500).json({ success: false, message: "服务器错误" });
  }
});

router.post("/withdrawals/:id/approve", requireAdmin, (req, res) => {
  try {
    const id = Math.floor(Number(req.params.id));
    if (!Number.isFinite(id) || id < 1) {
      return res.status(400).json({ success: false, message: "id 无效" });
    }
    const row = db
      .prepare(`SELECT id, distributor_phone, amount, status FROM distribution_withdrawals WHERE id = ?`)
      .get(id);
    if (!row) return res.status(404).json({ success: false, message: "记录不存在" });
    if (String(row.status) !== "pending") {
      return res.status(400).json({ success: false, message: "仅待审核状态可通过" });
    }
    const info = db
      .prepare(
        `
      UPDATE distribution_withdrawals
      SET status = 'approved', updated_at = datetime('now','localtime')
      WHERE id = ? AND status = 'pending'
    `,
      )
      .run(id);
    if (info.changes !== 1) {
      return res.status(400).json({ success: false, message: "状态已变更，请刷新后重试" });
    }
    const actor = resolveAdminActor(req);
    logWithdrawAudit({
      withdrawalId: id,
      action: "approve",
      detail: `from=pending phone=${row.distributor_phone} amount=${row.amount}`,
      actorOverride: actor,
    });
    return res.json({ success: true });
  } catch (e) {
    console.error("[admin/withdrawals approve]", e);
    return res.status(500).json({ success: false, message: "服务器错误" });
  }
});

router.post("/withdrawals/:id/reject", requireAdmin, (req, res) => {
  try {
    const id = Math.floor(Number(req.params.id));
    if (!Number.isFinite(id) || id < 1) {
      return res.status(400).json({ success: false, message: "id 无效" });
    }
    const row = db
      .prepare(`SELECT id, distributor_phone, amount, status FROM distribution_withdrawals WHERE id = ?`)
      .get(id);
    if (!row) return res.status(404).json({ success: false, message: "记录不存在" });
    if (String(row.status) !== "pending") {
      return res.status(400).json({ success: false, message: "仅待审核状态可拒绝" });
    }
    const info = db
      .prepare(
        `
      UPDATE distribution_withdrawals
      SET status = 'rejected', updated_at = datetime('now','localtime')
      WHERE id = ? AND status = 'pending'
    `,
      )
      .run(id);
    if (info.changes !== 1) {
      return res.status(400).json({ success: false, message: "状态已变更，请刷新后重试" });
    }
    const actor = resolveAdminActor(req);
    logWithdrawAudit({
      withdrawalId: id,
      action: "reject",
      detail: `from=pending phone=${row.distributor_phone} amount=${row.amount}`,
      actorOverride: actor,
    });
    return res.json({ success: true });
  } catch (e) {
    console.error("[admin/withdrawals reject]", e);
    return res.status(500).json({ success: false, message: "服务器错误" });
  }
});

router.post("/withdrawals/:id/paid", requireAdmin, (req, res) => {
  try {
    const id = Math.floor(Number(req.params.id));
    if (!Number.isFinite(id) || id < 1) {
      return res.status(400).json({ success: false, message: "id 无效" });
    }
    const row = db
      .prepare(`SELECT id, distributor_phone, amount, status FROM distribution_withdrawals WHERE id = ?`)
      .get(id);
    if (!row) return res.status(404).json({ success: false, message: "记录不存在" });
    if (String(row.status) !== "approved") {
      return res.status(400).json({ success: false, message: "仅已通过状态可标记已打款" });
    }
    const info = db
      .prepare(
        `
      UPDATE distribution_withdrawals
      SET status = 'paid', updated_at = datetime('now','localtime')
      WHERE id = ? AND status = 'approved'
    `,
      )
      .run(id);
    if (info.changes !== 1) {
      return res.status(400).json({ success: false, message: "状态已变更，请刷新后重试" });
    }
    const actor = resolveAdminActor(req);
    logWithdrawAudit({
      withdrawalId: id,
      action: "paid",
      detail: `phone=${row.distributor_phone} amount=${row.amount}`,
      actorOverride: actor,
    });
    return res.json({ success: true });
  } catch (e) {
    console.error("[admin/withdrawals paid]", e);
    return res.status(500).json({ success: false, message: "服务器错误" });
  }
});

/**
 * 课程评价审核（course_reviews）
 * @param {import('express').Router} adminRouter
 */
function attachCourseReviewAdmin(adminRouter) {
  adminRouter.get("/course-reviews", requireAdmin, (req, res) => {
    try {
      const { status } = req.query;
      const page = Math.max(1, Math.floor(Number(req.query.page)) || 1);
      const pageSize = Math.min(100, Math.max(1, Math.floor(Number(req.query.pageSize)) || 20));
      const offset = (page - 1) * pageSize;
      const allowed = ["pending", "approved", "rejected"];
      const where = [];
      /** @type {unknown[]} */
      const params = [];
      if (status && String(status) !== "all" && allowed.includes(String(status))) {
        where.push("r.status = ?");
        params.push(String(status));
      }
      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

      const total = db
        .prepare(
          `
        SELECT COUNT(*) AS c FROM course_reviews r
        ${whereSql}
      `,
        )
        .get(...params).c;

      const rows = db
        .prepare(
          `
        SELECT
          r.*,
          u.phone AS author_phone,
          u.email AS author_email
        FROM course_reviews r
        JOIN site_users u ON u.id = r.user_id
        ${whereSql}
        ORDER BY datetime(r.created_at) DESC, r.id DESC
        LIMIT ? OFFSET ?
      `,
        )
        .all(...params, pageSize, offset);

      const list = rows.map((row) => ({
        id: row.id,
        course_id: row.course_id,
        user_id: row.user_id,
        rating: row.rating,
        content: row.content,
        status: row.status,
        reply_content: row.reply_content ?? null,
        reply_at: row.reply_at ?? null,
        helpful_count: row.helpful_count ?? 0,
        created_at: row.created_at,
        updated_at: row.updated_at ?? null,
        author_display: maskSiteUserDisplay(row.author_phone, row.author_email),
      }));

      return res.json({
        success: true,
        data: { list, total: Number(total) || 0, page, pageSize },
      });
    } catch (e) {
      console.error("[admin/course-reviews list]", e);
      return res.status(500).json({ success: false, message: "服务器错误" });
    }
  });

  adminRouter.post("/course-reviews/:id/approve", requireAdmin, (req, res) => {
    try {
      const id = Math.floor(Number(req.params.id));
      if (!Number.isFinite(id) || id < 1) {
        return res.status(400).json({ success: false, message: "id 无效" });
      }
      const info = db
        .prepare(
          `
        UPDATE course_reviews
        SET status = 'approved', updated_at = datetime('now','localtime')
        WHERE id = ? AND status = 'pending'
      `,
        )
        .run(id);
      if (info.changes !== 1) {
        return res.status(400).json({ success: false, message: "仅待审核可通过" });
      }
      return res.json({ success: true });
    } catch (e) {
      console.error("[admin/course-reviews approve]", e);
      return res.status(500).json({ success: false, message: "服务器错误" });
    }
  });

  adminRouter.post("/course-reviews/:id/reject", requireAdmin, (req, res) => {
    try {
      const id = Math.floor(Number(req.params.id));
      if (!Number.isFinite(id) || id < 1) {
        return res.status(400).json({ success: false, message: "id 无效" });
      }
      const info = db
        .prepare(
          `
        UPDATE course_reviews
        SET status = 'rejected', updated_at = datetime('now','localtime')
        WHERE id = ? AND status = 'pending'
      `,
        )
        .run(id);
      if (info.changes !== 1) {
        return res.status(400).json({ success: false, message: "仅待审核可拒绝" });
      }
      return res.json({ success: true });
    } catch (e) {
      console.error("[admin/course-reviews reject]", e);
      return res.status(500).json({ success: false, message: "服务器错误" });
    }
  });

  adminRouter.post("/course-reviews/:id/reply", requireAdmin, (req, res) => {
    try {
      const id = Math.floor(Number(req.params.id));
      if (!Number.isFinite(id) || id < 1) {
        return res.status(400).json({ success: false, message: "id 无效" });
      }
      const text = String((req.body || {}).replyContent ?? "").trim();
      if (!text) {
        return res.status(400).json({ success: false, message: "replyContent 必填" });
      }
      if (text.length > 2000) {
        return res.status(400).json({ success: false, message: "回复过长" });
      }
      const row = db.prepare(`SELECT id, status FROM course_reviews WHERE id = ?`).get(id);
      if (!row) return res.status(404).json({ success: false, message: "记录不存在" });
      if (String(row.status) !== "approved") {
        return res.status(400).json({ success: false, message: "仅已通过的评价可回复" });
      }
      db.prepare(
        `
        UPDATE course_reviews
        SET reply_content = ?, reply_at = datetime('now','localtime'), updated_at = datetime('now','localtime')
        WHERE id = ?
      `,
      ).run(text, id);
      return res.json({ success: true });
    } catch (e) {
      console.error("[admin/course-reviews reply]", e);
      return res.status(500).json({ success: false, message: "服务器错误" });
    }
  });
}

attachCourseReviewAdmin(router);
attachCouponAdmin(router);
attachSeckillAdmin(router);

module.exports = router;
