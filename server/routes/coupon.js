"use strict";

const express = require("express");
const db = require("../db");
const { requireSiteUser } = require("../middleware/requireSiteUser");
const { discountFromCoupon, bestCheckout } = require("../lib/couponPricing");

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Aike@2026#Ai";

function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token || token !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: "未授权" });
  }
  next();
}

const publicRouter = express.Router();

function parseJsonCourses(raw) {
  try {
    const a = JSON.parse(String(raw || "[]"));
    return Array.isArray(a) ? a.map((x) => String(x)) : [];
  } catch {
    return [];
  }
}

function couponTemplateRow(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    value: row.value,
    condition_amount: row.condition_amount,
    applicable_courses: parseJsonCourses(row.applicable_courses),
    stock: row.stock,
    used_count: row.used_count,
    claim_limit_per_user: row.claim_limit_per_user,
    start_time: row.start_time,
    end_time: row.end_time,
    status: row.status,
  };
}

function isCouponActiveRow(row, now = new Date()) {
  if (String(row.status) !== "active") return false;
  const t = now.getTime();
  const s = new Date(String(row.start_time).replace(" ", "T")).getTime();
  const e = new Date(String(row.end_time).replace(" ", "T")).getTime();
  if (!Number.isFinite(s) || !Number.isFinite(e)) return false;
  return t >= s && t <= e;
}

/** 用户可领取的模板（未满总库存、未超个人限领、在有效期内） */
publicRouter.get("/available", requireSiteUser, (req, res) => {
  try {
    const uid = req.siteUserId;
    const rows = db
      .prepare(
        `
      SELECT c.*
      FROM coupons c
      WHERE c.status = 'active'
        AND datetime('now','localtime') >= datetime(c.start_time)
        AND datetime('now','localtime') <= datetime(c.end_time)
    `,
      )
      .all();
    const issued = db
      .prepare(`SELECT coupon_id, CAST(COUNT(*) AS INTEGER) AS n FROM user_coupons GROUP BY coupon_id`)
      .all();
    /** @type {Record<number, number>} */
    const issuedMap = {};
    for (const r of issued) issuedMap[r.coupon_id] = r.n;
    const mine = db
      .prepare(
        `SELECT coupon_id, CAST(COUNT(*) AS INTEGER) AS n FROM user_coupons WHERE user_id = ? GROUP BY coupon_id`,
      )
      .all(uid);
    /** @type {Record<number, number>} */
    const mineMap = {};
    for (const r of mine) mineMap[r.coupon_id] = r.n;

    const list = [];
    for (const row of rows) {
      const totalIssued = issuedMap[row.id] ?? 0;
      if (totalIssued >= row.stock) continue;
      const myCount = mineMap[row.id] ?? 0;
      if (myCount >= (row.claim_limit_per_user || 1)) continue;
      list.push(couponTemplateRow(row));
    }
    return res.json({ success: true, data: list });
  } catch (e) {
    console.error("[coupons/available]", e);
    return res.status(500).json({ success: false, message: "服务器错误" });
  }
});

/** 我的优惠券（含模板信息） */
publicRouter.get("/mine", requireSiteUser, (req, res) => {
  try {
    const uid = req.siteUserId;
    const rows = db
      .prepare(
        `
      SELECT uc.*, c.name, c.type, c.value, c.condition_amount, c.applicable_courses, c.start_time, c.end_time
      FROM user_coupons uc
      JOIN coupons c ON c.id = uc.coupon_id
      WHERE uc.user_id = ?
      ORDER BY uc.assigned_at DESC, uc.id DESC
    `,
      )
      .all(uid);
    const now = Date.now();
    const data = rows.map((r) => {
      let st = String(r.status);
      if (st === "unused") {
        const e = new Date(String(r.end_time).replace(" ", "T")).getTime();
        if (Number.isFinite(e) && now > e) st = "expired";
      }
      return {
        id: r.id,
        coupon_id: r.coupon_id,
        status: st,
        assigned_method: r.assigned_method,
        assigned_at: r.assigned_at,
        used_at: r.used_at,
        order_id: r.order_id,
        out_trade_no: r.out_trade_no,
        coupon: {
          name: r.name,
          type: r.type,
          value: r.value,
          condition_amount: r.condition_amount,
          applicable_courses: parseJsonCourses(r.applicable_courses),
          start_time: r.start_time,
          end_time: r.end_time,
        },
      };
    });
    return res.json({ success: true, data });
  } catch (e) {
    console.error("[coupons/mine]", e);
    return res.status(500).json({ success: false, message: "服务器错误" });
  }
});

/** 课程页：最优价预览（不可叠加） */
publicRouter.get("/preview/:courseId", requireSiteUser, (req, res) => {
  try {
    const courseId = Number(req.params.courseId);
    if (!Number.isFinite(courseId)) {
      return res.status(400).json({ success: false, message: "课程 ID 无效" });
    }
    const course = db
      .prepare(`SELECT id, price_yuan, title FROM courses WHERE id = ? AND status = 'published'`)
      .get(courseId);
    if (!course) return res.status(404).json({ success: false, message: "课程不存在或未上架" });
    const listPrice = Number(course.price_yuan) || 0;

    const act = db
      .prepare(
        `
      SELECT * FROM seckill_activities
      WHERE course_id = ? AND status = 'active'
        AND datetime('now','localtime') >= datetime(start_time)
        AND datetime('now','localtime') <= datetime(end_time)
        AND stock > 0
      ORDER BY id DESC LIMIT 1
    `,
      )
      .get(courseId);

    const uid = req.siteUserId;
    const userCoupons = db
      .prepare(
        `
      SELECT uc.id AS user_coupon_id, c.*
      FROM user_coupons uc
      JOIN coupons c ON c.id = uc.coupon_id
      WHERE uc.user_id = ? AND uc.status = 'unused'
        AND c.status = 'active'
        AND datetime('now','localtime') >= datetime(c.start_time)
        AND datetime('now','localtime') <= datetime(c.end_time)
    `,
      )
      .all(uid);

    const sk = act ? Number(act.seckill_price) : null;
    let best = { mode: "none", finalPrice: listPrice, savings: 0, user_coupon_id: null };
    const base = bestCheckout(listPrice, null, sk);
    best = {
      mode: base.mode,
      finalPrice: base.finalPrice,
      savings: base.savings,
      user_coupon_id: null,
    };
    for (const row of userCoupons) {
      const apps = parseJsonCourses(row.applicable_courses);
      if (apps.length > 0 && !apps.includes(String(courseId))) continue;
      const b = bestCheckout(listPrice, row, sk);
      if (b.finalPrice < best.finalPrice - 1e-6) {
        best = {
          mode: b.mode,
          finalPrice: b.finalPrice,
          savings: b.savings,
          user_coupon_id: b.mode === "coupon" ? row.user_coupon_id : null,
        };
      }
    }

    return res.json({
      success: true,
      data: {
        courseId,
        title: course.title,
        listPrice,
        best,
        seckill: act
          ? {
              id: act.id,
              seckill_price: act.seckill_price,
              original_price: act.original_price,
              stock: act.stock,
              limit_per_user: act.limit_per_user,
              start_time: act.start_time,
              end_time: act.end_time,
            }
          : null,
        applicableUserCoupons: userCoupons.map((r) => ({
          user_coupon_id: r.user_coupon_id,
          name: r.name,
          type: r.type,
          value: r.value,
          condition_amount: r.condition_amount,
          discount: discountFromCoupon(r, listPrice),
          pay_price: Math.max(0, listPrice - discountFromCoupon(r, listPrice)),
        })),
      },
    });
  } catch (e) {
    console.error("[coupons/preview]", e);
    return res.status(500).json({ success: false, message: "服务器错误" });
  }
});

publicRouter.post("/claim", requireSiteUser, (req, res) => {
  try {
    const couponId = Number((req.body || {}).couponId);
    if (!Number.isFinite(couponId)) {
      return res.status(400).json({ success: false, message: "couponId 无效" });
    }
    const uid = req.siteUserId;
    const row = db.prepare(`SELECT * FROM coupons WHERE id = ?`).get(couponId);
    if (!row) return res.status(404).json({ success: false, message: "优惠券不存在" });
    if (!isCouponActiveRow(row)) {
      return res.status(400).json({ success: false, message: "优惠券不可领取" });
    }
    const totalIssued = db
      .prepare(`SELECT CAST(COUNT(*) AS INTEGER) AS n FROM user_coupons WHERE coupon_id = ?`)
      .get(couponId).n;
    if (totalIssued >= row.stock) {
      return res.status(400).json({ success: false, message: "已领完" });
    }
    const myCount = db
      .prepare(`SELECT CAST(COUNT(*) AS INTEGER) AS n FROM user_coupons WHERE user_id = ? AND coupon_id = ?`)
      .get(uid, couponId).n;
    if (myCount >= (row.claim_limit_per_user || 1)) {
      return res.status(400).json({ success: false, message: "已达个人限领次数" });
    }
    const info = db
      .prepare(
        `
      INSERT INTO user_coupons (user_id, coupon_id, status, assigned_method, assigned_at)
      VALUES (?, ?, 'unused', 'claim', datetime('now','localtime'))
    `,
      )
      .run(uid, couponId);
    return res.json({ success: true, data: { id: info.lastInsertRowid } });
  } catch (e) {
    console.error("[coupons/claim]", e);
    return res.status(500).json({ success: false, message: "服务器错误" });
  }
});

/**
 * @param {import('express').Router} adminRouter
 */
function attachCouponAdmin(adminRouter) {
  adminRouter.get("/coupons", requireAdmin, (_req, res) => {
    try {
      const rows = db.prepare(`SELECT * FROM coupons ORDER BY id DESC`).all();
      return res.json({ success: true, data: rows.map(couponTemplateRow) });
    } catch (e) {
      console.error("[admin/coupons list]", e);
      return res.status(500).json({ success: false, message: "服务器错误" });
    }
  });

  adminRouter.post("/coupons", requireAdmin, (req, res) => {
    try {
      const b = req.body || {};
      const name = String(b.name || "").trim();
      const type = String(b.type || "fixed").toLowerCase();
      if (!name) return res.status(400).json({ success: false, message: "name 必填" });
      if (!["fixed", "percent"].includes(type)) {
        return res.status(400).json({ success: false, message: "type 须为 fixed 或 percent" });
      }
      const value = Number(b.value);
      if (!Number.isFinite(value) || value < 0) {
        return res.status(400).json({ success: false, message: "value 无效" });
      }
      const condition_amount = Number(b.condition_amount) || 0;
      const applicable_courses = JSON.stringify(Array.isArray(b.applicable_courses) ? b.applicable_courses : []);
      const stock = Math.max(0, Math.floor(Number(b.stock) || 0));
      const claim_limit_per_user = Math.max(1, Math.floor(Number(b.claim_limit_per_user) || 1));
      const start_time = String(b.start_time || "").trim();
      const end_time = String(b.end_time || "").trim();
      if (!start_time || !end_time) {
        return res.status(400).json({ success: false, message: "start_time / end_time 必填" });
      }
      const status = ["active", "expired", "disabled"].includes(String(b.status)) ? String(b.status) : "active";
      const r = db
        .prepare(
          `
        INSERT INTO coupons (name, type, value, condition_amount, applicable_courses, stock, used_count, claim_limit_per_user, start_time, end_time, status)
        VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
      `,
        )
        .run(
          name,
          type,
          value,
          condition_amount,
          applicable_courses,
          stock,
          claim_limit_per_user,
          start_time,
          end_time,
          status,
        );
      return res.json({ success: true, data: { id: r.lastInsertRowid } });
    } catch (e) {
      console.error("[admin/coupons create]", e);
      return res.status(500).json({ success: false, message: "服务器错误" });
    }
  });

  adminRouter.post("/coupons/grant", requireAdmin, (req, res) => {
    try {
      const userId = Number((req.body || {}).userId);
      const couponId = Number((req.body || {}).couponId);
      if (!Number.isFinite(userId) || !Number.isFinite(couponId)) {
        return res.status(400).json({ success: false, message: "userId、couponId 必填" });
      }
      const u = db.prepare(`SELECT id FROM site_users WHERE id = ?`).get(userId);
      if (!u) return res.status(404).json({ success: false, message: "用户不存在" });
      const c = db.prepare(`SELECT * FROM coupons WHERE id = ?`).get(couponId);
      if (!c) return res.status(404).json({ success: false, message: "优惠券不存在" });
      const totalIssued = db
        .prepare(`SELECT CAST(COUNT(*) AS INTEGER) AS n FROM user_coupons WHERE coupon_id = ?`)
        .get(couponId).n;
      if (totalIssued >= c.stock) {
        return res.status(400).json({ success: false, message: "库存不足" });
      }
      const info = db
        .prepare(
          `
        INSERT INTO user_coupons (user_id, coupon_id, status, assigned_method, assigned_at)
        VALUES (?, ?, 'unused', 'admin', datetime('now','localtime'))
      `,
        )
        .run(userId, couponId);
      return res.json({ success: true, data: { id: info.lastInsertRowid } });
    } catch (e) {
      console.error("[admin/coupons/grant]", e);
      return res.status(500).json({ success: false, message: "服务器错误" });
    }
  });
}

module.exports = { publicRouter, attachCouponAdmin };
