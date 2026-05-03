"use strict";

const express = require("express");
const db = require("../db");
const { requireSiteUser } = require("../middleware/requireSiteUser");

const router = express.Router();

/**
 * POST /api/user/progress
 * Body: { courseId: string|number, progressPercent: number }
 */
router.post("/progress", requireSiteUser, (req, res) => {
  try {
    const courseId = String(req.body?.courseId ?? "").trim().slice(0, 64);
    if (!courseId) {
      return res.status(400).json({ success: false, message: "缺少 courseId" });
    }
    let pct = parseInt(String(req.body?.progressPercent ?? ""), 10);
    if (!Number.isFinite(pct)) pct = 0;
    pct = Math.max(0, Math.min(100, pct));

    db.prepare(
      `
      INSERT INTO user_course_progress (user_id, course_id, progress_percent, last_watch_at, updated_at, completed_at)
      VALUES (?, ?, ?, datetime('now','localtime'), datetime('now','localtime'),
        CASE WHEN ? >= 80 THEN datetime('now','localtime') ELSE NULL END)
      ON CONFLICT(user_id, course_id) DO UPDATE SET
        progress_percent = excluded.progress_percent,
        last_watch_at = excluded.last_watch_at,
        updated_at = excluded.updated_at,
        completed_at = CASE
          WHEN excluded.progress_percent >= 80
            AND (trim(coalesce(user_course_progress.completed_at, '')) = '')
            THEN datetime('now','localtime')
          ELSE user_course_progress.completed_at
        END
    `,
    ).run(req.siteUserId, courseId, pct, pct);

    return res.json({ success: true, message: "ok" });
  } catch (e) {
    console.error("[user/progress]", e);
    return res.status(500).json({ success: false, message: "服务器错误" });
  }
});

/**
 * GET /api/user/progress/:courseId
 */
router.get("/progress/:courseId", requireSiteUser, (req, res) => {
  try {
    const courseId = String(req.params.courseId ?? "").trim().slice(0, 64);
    if (!courseId) {
      return res.status(400).json({ success: false, message: "无效课程" });
    }
    const row = db
      .prepare(
        `
      SELECT progress_percent, last_watch_at, updated_at
      FROM user_course_progress
      WHERE user_id = ? AND course_id = ?
    `,
      )
      .get(req.siteUserId, courseId);
    return res.json({
      success: true,
      data: row
        ? {
            progress_percent: row.progress_percent ?? 0,
            last_watch_at: row.last_watch_at ?? null,
            updated_at: row.updated_at ?? null,
          }
        : { progress_percent: 0, last_watch_at: null, updated_at: null },
    });
  } catch (e) {
    console.error("[user/progress/:courseId]", e);
    return res.status(500).json({ success: false, message: "服务器错误" });
  }
});

/**
 * POST /api/user/learning-session
 * Body: { courseId: string, durationSeconds: number }（≥5 秒）
 */
router.post("/learning-session", requireSiteUser, (req, res) => {
  try {
    const courseId = String(req.body?.courseId ?? "").trim().slice(0, 64);
    const dur = parseInt(String(req.body?.durationSeconds ?? req.body?.duration ?? ""), 10);
    if (!courseId || !Number.isFinite(dur) || dur < 5) {
      return res.status(400).json({ success: false, message: "参数错误" });
    }
    const capped = Math.min(Math.max(5, dur), 86400 * 4);
    db.prepare(
      `
      INSERT INTO user_learning_sessions (user_id, course_id, start_at, end_at, duration_seconds, created_at)
      VALUES (
        ?, ?,
        datetime('now','localtime', printf('-%d seconds', ?)),
        datetime('now','localtime'),
        ?,
        datetime('now','localtime')
      )
    `,
    ).run(req.siteUserId, courseId, capped, capped);
    return res.json({ success: true, message: "ok" });
  } catch (e) {
    console.error("[user/learning-session]", e);
    return res.status(500).json({ success: false, message: "服务器错误" });
  }
});

module.exports = router;
