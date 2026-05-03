"use strict";

const express = require("express");
const path = require("node:path");
const { AlipaySdk } = require("alipay-sdk");
const db = require("../db");
const { requireSiteUser } = require("../middleware/requireSiteUser");
const { splitCreatorPlatform } = require("../lib/couponPricing");
const { decrMirror, incrMirror } = require("../lib/redisSeckill");

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Aike@2026#Ai";

function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token || token !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: "未授权" });
  }
  next();
}

const rootDir = path.join(__dirname, "..");

function normalizePrivateKey(key) {
  return String(key || "").replace(/\\n/g, "\n").trim();
}

function buildAlipaySdk() {
  const appId = process.env.ALIPAY_APP_ID;
  const privateKey = normalizePrivateKey(process.env.ALIPAY_PRIVATE_KEY);
  if (!appId || !privateKey) throw new Error("缺少 ALIPAY_APP_ID 或 ALIPAY_PRIVATE_KEY");
  const keyType = process.env.ALIPAY_KEY_TYPE === "PKCS1" ? "PKCS1" : "PKCS8";
  const config = {
    appId,
    privateKey,
    keyType,
    gateway: process.env.ALIPAY_GATEWAY || "https://openapi.alipay.com/gateway.do",
    endpoint: process.env.ALIPAY_ENDPOINT || "https://openapi.alipay.com",
  };
  const appCertPath = process.env.ALIPAY_APP_CERT_PATH;
  const alipayPublicCertPath = process.env.ALIPAY_PUBLIC_CERT_PATH;
  const alipayRootCertPath = process.env.ALIPAY_ROOT_CERT_PATH;
  if (appCertPath && alipayPublicCertPath && alipayRootCertPath) {
    config.appCertPath = path.resolve(rootDir, appCertPath);
    config.alipayPublicCertPath = path.resolve(rootDir, alipayPublicCertPath);
    config.alipayRootCertPath = path.resolve(rootDir, alipayRootCertPath);
  } else if (process.env.ALIPAY_PUBLIC_KEY) {
    config.alipayPublicKey = normalizePrivateKey(process.env.ALIPAY_PUBLIC_KEY);
  } else {
    throw new Error("请配置支付宝证书或公钥");
  }
  return new AlipaySdk(config);
}

function frontendBase() {
  return (process.env.FRONTEND_PUBLIC_URL || "https://ai.syzs.top").replace(/\/$/, "");
}

function syncReturnUrl() {
  return (
    process.env.SYNC_RETURN_URL ||
    `${(process.env.PUBLIC_API_ORIGIN || "https://ai.syzs.top").replace(/\/$/, "")}/api/pay/callback`
  );
}

function notifyUrl() {
  return (
    process.env.NOTIFY_URL ||
    `${(process.env.PUBLIC_API_ORIGIN || "https://ai.syzs.top").replace(/\/$/, "")}/api/pay/notify`
  );
}

function newOutTradeNo() {
  return `C${Date.now()}${Math.random().toString(36).slice(2, 10)}`.slice(0, 64);
}

function isPayDevSimulate() {
  return String(process.env.PAY_DEV_SIMULATE || "").trim() === "1";
}

const router = express.Router();

/** 当前进行中秒杀 */
router.get("/activities", (_req, res) => {
  try {
    const rows = db
      .prepare(
        `
      SELECT a.*, c.title AS course_title
      FROM seckill_activities a
      JOIN courses c ON c.id = a.course_id
      WHERE a.status = 'active'
        AND datetime('now','localtime') >= datetime(a.start_time)
        AND datetime('now','localtime') <= datetime(a.end_time)
        AND a.stock > 0
      ORDER BY a.id DESC
    `,
      )
      .all();
    return res.json({ success: true, data: rows });
  } catch (e) {
    console.error("[seckill/activities]", e);
    return res.status(500).json({ success: false, message: "服务器错误" });
  }
});

router.get("/by-course/:courseId", (req, res) => {
  try {
    const courseId = Number(req.params.courseId);
    if (!Number.isFinite(courseId)) {
      return res.status(400).json({ success: false, message: "课程 ID 无效" });
    }
    const row = db
      .prepare(
        `
      SELECT a.*, c.title AS course_title
      FROM seckill_activities a
      JOIN courses c ON c.id = a.course_id
      WHERE a.course_id = ? AND a.status = 'active'
        AND datetime('now','localtime') >= datetime(a.start_time)
        AND datetime('now','localtime') <= datetime(a.end_time)
      ORDER BY a.id DESC LIMIT 1
    `,
      )
      .get(courseId);
    return res.json({ success: true, data: row || null });
  } catch (e) {
    console.error("[seckill/by-course]", e);
    return res.status(500).json({ success: false, message: "服务器错误" });
  }
});

/**
 * 秒杀下单：SQLite 事务扣减库存为权威；Redis 仅可选镜像（见 redisSeckill.js）。
 * 写入 orders.status = pending_seckill，并在 pay 模块内存 Map 登记供拉起支付。
 */
router.post("/:activityId/purchase", requireSiteUser, async (req, res) => {
  const registerPayOrder = req.app.get("registerPayOrder");
  if (typeof registerPayOrder !== "function") {
    return res.status(500).json({ success: false, message: "支付模块未初始化" });
  }
  try {
    const activityId = Number(req.params.activityId);
    if (!Number.isFinite(activityId)) {
      return res.status(400).json({ success: false, message: "活动无效" });
    }
    const uid = req.siteUserId;
    const user = db.prepare(`SELECT id, phone FROM site_users WHERE id = ?`).get(uid);
    const buyerPhone = user?.phone ? String(user.phone).trim() : "";
    if (!/^1\d{10}$/.test(buyerPhone)) {
      return res.status(400).json({ success: false, message: "请先绑定手机号后再参与秒杀" });
    }

    const redisVal = await decrMirror(activityId);
    if (redisVal !== null && redisVal < 0) {
      await incrMirror(activityId);
      return res.status(400).json({ success: false, message: "库存不足" });
    }

    const outTradeNo = newOutTradeNo();
    let courseIdNum;
    let totalAmount;
    let courseName;
    let creatorId;
    let actRow;

    const tx = db.transaction(() => {
      actRow = db
        .prepare(`SELECT * FROM seckill_activities WHERE id = ?`)
        .get(activityId);
      if (!actRow || String(actRow.status) !== "active") {
        throw new Error("活动不存在或未开始");
      }
      const now = db.prepare(`SELECT datetime('now','localtime') AS t`).get().t;
      if (now < String(actRow.start_time) || now > String(actRow.end_time)) {
        throw new Error("不在活动时间");
      }
      if (actRow.stock <= 0) {
        throw new Error("库存不足");
      }
      const bought = db
        .prepare(
          `
        SELECT CAST(COUNT(*) AS INTEGER) AS n
        FROM orders
        WHERE seckill_activity_id = ?
          AND buyer_phone = ?
          AND status IN ('pending_seckill', 'paid')
      `,
        )
        .get(activityId, buyerPhone).n;
      if (bought >= (actRow.limit_per_user || 1)) {
        throw new Error("已达限购数量");
      }
      const course = db
        .prepare(`SELECT id, title, creator_id, price_yuan FROM courses WHERE id = ?`)
        .get(actRow.course_id);
      if (!course) throw new Error("课程不存在");
      courseIdNum = course.id;
      courseName = String(course.title);
      creatorId = course.creator_id;
      totalAmount = Number(actRow.seckill_price);
      if (!Number.isFinite(totalAmount) || totalAmount <= 0) throw new Error("价格无效");

      const u = db
        .prepare(
          `
        UPDATE seckill_activities SET stock = stock - 1 WHERE id = ? AND stock > 0 AND status = 'active'
      `,
        )
        .run(activityId);
      if (u.changes !== 1) {
        throw new Error("库存不足");
      }
      const { creator_amount, platform_amount } = splitCreatorPlatform(totalAmount);
      db.prepare(
        `
        INSERT INTO orders (
          out_trade_no, course_id, creator_id, buyer_phone,
          total_amount, creator_amount, platform_amount,
          status, paid_at, created_at, user_coupon_id, seckill_activity_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_seckill', NULL, datetime('now','localtime'), NULL, ?)
      `,
      ).run(
        outTradeNo,
        courseIdNum,
        creatorId,
        buyerPhone,
        totalAmount,
        creator_amount,
        platform_amount,
        activityId,
      );
    });

    try {
      tx();
    } catch (e) {
      if (redisVal !== null) await incrMirror(activityId);
      const msg = e instanceof Error ? e.message : String(e);
      return res.status(400).json({ success: false, message: msg });
    }

    registerPayOrder(outTradeNo, {
      courseId: String(courseIdNum),
      userId: buyerPhone,
      courseName,
      amount: totalAmount.toFixed(2),
      status: "pending",
      distributorRef: null,
      distributorPhone: null,
      distributorRatePercent: null,
      userCouponId: null,
      seckillActivityId: activityId,
      pendingSeckill: true,
    });

    if (isPayDevSimulate()) {
      return res.json({
        success: true,
        data: {
          devSimulate: true,
          outTradeNo,
          amount: totalAmount.toFixed(2),
          courseId: String(courseIdNum),
          courseName,
        },
      });
    }

    const sdk = buildAlipaySdk();
    const payUrl = sdk.pageExecute("alipay.trade.wap.pay", "GET", {
      notifyUrl: notifyUrl(),
      returnUrl: syncReturnUrl(),
      bizContent: {
        out_trade_no: outTradeNo,
        product_code: "QUICK_WAP_WAY",
        total_amount: totalAmount.toFixed(2),
        subject: String(courseName).slice(0, 128),
        body: `courseId:${courseIdNum};userId:${encodeURIComponent(buyerPhone)};seckill=1`,
      },
    });
    return res.json({ success: true, data: { payUrl, outTradeNo, amount: totalAmount.toFixed(2) } });
  } catch (e) {
    console.error("[seckill/purchase]", e);
    return res.status(500).json({ success: false, message: e instanceof Error ? e.message : "服务器错误" });
  }
});

function attachSeckillAdmin(adminRouter) {
  adminRouter.get("/seckill-activities", requireAdmin, (_req, res) => {
    try {
      const rows = db
        .prepare(
          `
        SELECT a.*, c.title AS course_title
        FROM seckill_activities a
        JOIN courses c ON c.id = a.course_id
        ORDER BY a.id DESC
      `,
        )
        .all();
      return res.json({ success: true, data: rows });
    } catch (e) {
      console.error("[admin/seckill list]", e);
      return res.status(500).json({ success: false, message: "服务器错误" });
    }
  });

  adminRouter.post("/seckill-activities", requireAdmin, (req, res) => {
    try {
      const b = req.body || {};
      const course_id = Number(b.course_id);
      const original_price = Number(b.original_price);
      const seckill_price = Number(b.seckill_price);
      const stock = Math.max(0, Math.floor(Number(b.stock) || 0));
      const limit_per_user = Math.max(1, Math.floor(Number(b.limit_per_user) || 1));
      const start_time = String(b.start_time || "").trim();
      const end_time = String(b.end_time || "").trim();
      const status = ["pending", "active", "ended"].includes(String(b.status)) ? String(b.status) : "pending";
      if (!Number.isFinite(course_id)) {
        return res.status(400).json({ success: false, message: "course_id 无效" });
      }
      if (!Number.isFinite(original_price) || !Number.isFinite(seckill_price) || seckill_price <= 0) {
        return res.status(400).json({ success: false, message: "价格无效" });
      }
      if (!start_time || !end_time) {
        return res.status(400).json({ success: false, message: "start_time / end_time 必填" });
      }
      const c = db.prepare(`SELECT id FROM courses WHERE id = ?`).get(course_id);
      if (!c) return res.status(404).json({ success: false, message: "课程不存在" });
      const info = db
        .prepare(
          `
        INSERT INTO seckill_activities (course_id, original_price, seckill_price, stock, limit_per_user, start_time, end_time, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
        )
        .run(course_id, original_price, seckill_price, stock, limit_per_user, start_time, end_time, status);
      return res.json({ success: true, data: { id: info.lastInsertRowid } });
    } catch (e) {
      console.error("[admin/seckill create]", e);
      return res.status(500).json({ success: false, message: "服务器错误" });
    }
  });

  adminRouter.put("/seckill-activities/:id", requireAdmin, (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ success: false, message: "id 无效" });
      const b = req.body || {};
      const sets = [];
      const vals = [];
      if (b.original_price != null) {
        sets.push("original_price = ?");
        vals.push(Number(b.original_price));
      }
      if (b.seckill_price != null) {
        sets.push("seckill_price = ?");
        vals.push(Number(b.seckill_price));
      }
      if (b.stock != null) {
        sets.push("stock = ?");
        vals.push(Math.max(0, Math.floor(Number(b.stock))));
      }
      if (b.limit_per_user != null) {
        sets.push("limit_per_user = ?");
        vals.push(Math.max(1, Math.floor(Number(b.limit_per_user))));
      }
      if (b.start_time) {
        sets.push("start_time = ?");
        vals.push(String(b.start_time).trim());
      }
      if (b.end_time) {
        sets.push("end_time = ?");
        vals.push(String(b.end_time).trim());
      }
      if (b.status && ["pending", "active", "ended"].includes(String(b.status))) {
        sets.push("status = ?");
        vals.push(String(b.status));
      }
      if (sets.length === 0) {
        return res.status(400).json({ success: false, message: "无更新字段" });
      }
      vals.push(id);
      db.prepare(`UPDATE seckill_activities SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
      return res.json({ success: true });
    } catch (e) {
      console.error("[admin/seckill put]", e);
      return res.status(500).json({ success: false, message: "服务器错误" });
    }
  });
}

module.exports = { router, attachSeckillAdmin };
