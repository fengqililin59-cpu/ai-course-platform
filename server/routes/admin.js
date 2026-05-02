"use strict";

const express = require("express");
const router = express.Router();
const db = require("../db");

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

module.exports = router;
