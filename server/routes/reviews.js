"use strict";

const express = require("express");
const db = require("../db");
const { requireSiteUser } = require("../middleware/requireSiteUser");
const { maskSiteUserDisplay } = require("../lib/siteUserMask");
const { userHasPurchasedCourseForReview } = require("../lib/courseReviewEligibility");

const router = express.Router();

const MAX_CONTENT = 2000;

/** 前台：已通过的评价列表（分页 + 平均分、总条数） */
router.get("/course/:courseId", (req, res) => {
  try {
    const courseId = String(req.params.courseId || "").trim();
    if (!courseId) {
      return res.status(400).json({ success: false, message: "课程 ID 无效" });
    }
    const page = Math.max(1, Math.floor(Number(req.query.page)) || 1);
    const pageSize = Math.min(50, Math.max(1, Math.floor(Number(req.query.pageSize)) || 5));
    const offset = (page - 1) * pageSize;

    const agg = db
      .prepare(
        `
      SELECT
        CAST(COUNT(*) AS INTEGER) AS total_reviews,
        CAST(COALESCE(AVG(rating), 0) AS REAL) AS avg_rating
      FROM course_reviews
      WHERE course_id = ? AND status = 'approved'
    `,
      )
      .get(courseId);

    const totalReviews = Number(agg?.total_reviews) || 0;
    const avgRating = totalReviews > 0 ? Math.round(Number(agg.avg_rating) * 10) / 10 : 0;

    const rows = db
      .prepare(
        `
      SELECT
        r.id,
        r.rating,
        r.content,
        r.reply_content,
        r.reply_at,
        r.helpful_count,
        r.created_at,
        u.phone AS author_phone,
        u.email AS author_email
      FROM course_reviews r
      JOIN site_users u ON u.id = r.user_id
      WHERE r.course_id = ? AND r.status = 'approved'
      ORDER BY datetime(r.created_at) DESC, r.id DESC
      LIMIT ? OFFSET ?
    `,
      )
      .all(courseId, pageSize, offset);

    const reviews = rows.map((row) => ({
      id: row.id,
      rating: row.rating,
      content: row.content,
      reply_content: row.reply_content ?? null,
      reply_at: row.reply_at ?? null,
      helpful_count: row.helpful_count ?? 0,
      created_at: row.created_at,
      author_display: maskSiteUserDisplay(row.author_phone, row.author_email),
    }));

    return res.json({
      success: true,
      data: {
        reviews,
        total: totalReviews,
        page,
        pageSize,
        avgRating,
        totalReviews,
      },
    });
  } catch (e) {
    console.error("[reviews/course]", e);
    return res.status(500).json({ success: false, message: "服务器错误" });
  }
});

/** 是否可写评价（已购且无待审/已通过记录） */
router.get("/check/:courseId", requireSiteUser, (req, res) => {
  try {
    const uid = req.siteUserId;
    const courseId = String(req.params.courseId || "").trim();
    if (!courseId) {
      return res.status(400).json({ success: false, message: "课程 ID 无效" });
    }
    const purchased = userHasPurchasedCourseForReview(db, uid, courseId);
    const dup = db
      .prepare(
        `
      SELECT id FROM course_reviews
      WHERE user_id = ? AND course_id = ? AND status IN ('pending', 'approved')
      LIMIT 1
    `,
      )
      .get(uid, courseId);
    const hasReviewed = Boolean(dup);
    return res.json({
      success: true,
      data: {
        canSubmit: purchased && !hasReviewed,
        hasReviewed,
        purchased,
      },
    });
  } catch (e) {
    console.error("[reviews/check]", e);
    return res.status(500).json({ success: false, message: "服务器错误" });
  }
});

/** 标记有用（登录、幂等：重复点击不重复加分） */
router.post("/:reviewId/helpful", requireSiteUser, (req, res) => {
  try {
    const uid = req.siteUserId;
    const reviewId = Math.floor(Number(req.params.reviewId));
    if (!Number.isFinite(reviewId) || reviewId < 1) {
      return res.status(400).json({ success: false, message: "reviewId 无效" });
    }
    const rev = db
      .prepare(`SELECT id, helpful_count, status FROM course_reviews WHERE id = ?`)
      .get(reviewId);
    if (!rev || String(rev.status) !== "approved") {
      return res.status(404).json({ success: false, message: "评价不存在或未展示" });
    }

    let incremented = false;
    const tx = db.transaction(() => {
      const ins = db
        .prepare(
          `
        INSERT OR IGNORE INTO course_review_helpful (user_id, review_id)
        VALUES (?, ?)
      `,
        )
        .run(uid, reviewId);
      if (ins.changes === 1) {
        incremented = true;
        db.prepare(`UPDATE course_reviews SET helpful_count = helpful_count + 1 WHERE id = ?`).run(
          reviewId,
        );
      }
    });
    tx();

    const row = db.prepare(`SELECT helpful_count FROM course_reviews WHERE id = ?`).get(reviewId);

    return res.json({
      success: true,
      data: {
        helpful_count: Number(row?.helpful_count) || 0,
        alreadyMarked: !incremented,
      },
    });
  } catch (e) {
    console.error("[reviews/helpful]", e);
    return res.status(500).json({ success: false, message: "服务器错误" });
  }
});

/** 登录用户提交评价（默认 pending，管理员审核） */
router.post("/", requireSiteUser, (req, res) => {
  try {
    const uid = req.siteUserId;
    const b = req.body || {};
    const courseId = String(b.courseId ?? "").trim();
    const rating = Math.floor(Number(b.rating));
    const content = String(b.content ?? "").trim();

    if (!courseId) {
      return res.status(400).json({ success: false, message: "courseId 必填" });
    }
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: "rating 须为 1–5" });
    }
    if (!content) {
      return res.status(400).json({ success: false, message: "评价内容不能为空" });
    }
    if (content.length > MAX_CONTENT) {
      return res.status(400).json({ success: false, message: `内容请控制在 ${MAX_CONTENT} 字以内` });
    }

    if (!userHasPurchasedCourseForReview(db, uid, courseId)) {
      return res.status(403).json({
        success: false,
        message:
          "仅已购课用户可评价；若您已支付仍提示失败，可能是订单未写入数据库（如无推广归因的支付），请联系管理员或稍后再试。",
      });
    }

    const dup = db
      .prepare(
        `
      SELECT id FROM course_reviews
      WHERE user_id = ? AND course_id = ? AND status IN ('pending', 'approved')
      LIMIT 1
    `,
      )
      .get(uid, courseId);
    if (dup) {
      return res.status(400).json({ success: false, message: "该课程已有待审核或通过的评价" });
    }

    const info = db
      .prepare(
        `
      INSERT INTO course_reviews (course_id, user_id, rating, content, status, helpful_count, created_at)
      VALUES (?, ?, ?, ?, 'pending', 0, datetime('now','localtime'))
    `,
      )
      .run(courseId, uid, rating, content);

    return res.json({ success: true, data: { id: info.lastInsertRowid } });
  } catch (e) {
    console.error("[reviews/post]", e);
    return res.status(500).json({ success: false, message: "服务器错误" });
  }
});

module.exports = { router };
