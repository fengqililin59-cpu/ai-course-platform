"use strict";

const crypto = require("node:crypto");
const express = require("express");
const router = express.Router();
const db = require("../db");
const { signSitePayload } = require("../lib/siteJwt");

const { sendPhoneOtp, verifyPhoneOtp } = require("../lib/phoneOtp");

// ─── JWT 简易实现（无需额外依赖）────────────────────────────
const JWT_SECRET = process.env.CREATOR_JWT_SECRET || "aike-creator-secret-2026";

function signToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ ...payload, iat: Date.now() })).toString("base64url");
  const sig = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

function verifyToken(token) {
  try {
    const [header, body, sig] = token.split(".");
    const expected = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
    if (sig !== expected) return null;
    return JSON.parse(Buffer.from(body, "base64url").toString());
  } catch {
    return null;
  }
}

// ─── 中间件：验证创作者 token ────────────────────────────────
function requireCreator(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ success: false, message: "未登录" });
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ success: false, message: "token 无效或已过期" });

  const creator = db.prepare("SELECT * FROM creators WHERE id = ?").get(payload.id);
  if (!creator) return res.status(401).json({ success: false, message: "账号不存在" });

  req.creator = creator;
  next();
}

// ─── 发送验证码 ──────────────────────────────────────────────
router.post("/send-code", async (req, res) => {
  try {
    const raw = req.body != null ? req.body.phone : null;
    const phone = String(raw != null ? raw : "")
      .trim()
      .replace(/\s+/g, "");
    if (!phone || !/^1\d{10}$/.test(phone)) {
      console.error(
        `[creator/send-code] 手机号格式错误 raw=${JSON.stringify(raw)} normalized=${JSON.stringify(phone)}`,
      );
      return res.status(400).json({
        success: false,
        data: null,
        message: "手机号格式错误（需 11 位且以 1 开头）",
      });
    }
    const result = await sendPhoneOtp(phone);
    return res.status(result.status).json({
      success: result.ok,
      data: null,
      message: result.message || (result.ok ? "ok" : "发送失败"),
    });
  } catch (err) {
    console.error("[creator/send-code] 未捕获异常", err);
    return res.status(500).json({
      success: false,
      data: null,
      message: err instanceof Error ? err.message : "服务器内部错误",
    });
  }
});

// ─── 登录 / 注册 ─────────────────────────────────────────────
router.post("/login", (req, res) => {
  const phone = String(req.body && req.body.phone != null ? req.body.phone : "").trim();
  const code = String(req.body && req.body.code != null ? req.body.code : "").trim();
  if (!phone || !code) {
    return res.status(400).json({ success: false, data: null, message: "参数不完整" });
  }

  const v = verifyPhoneOtp(phone, code);
  if (!v.ok) {
    return res.status(400).json({ success: false, data: null, message: v.message });
  }

  let creator = db.prepare("SELECT * FROM creators WHERE phone = ?").get(phone);
  if (!creator) {
    const result = db
      .prepare("INSERT INTO creators (phone, status) VALUES (?, 'pending')")
      .run(phone);
    creator = db.prepare("SELECT * FROM creators WHERE id = ?").get(result.lastInsertRowid);
  }

  const token = signToken({ id: creator.id, phone: creator.phone });

  let siteUser = db.prepare("SELECT id, phone FROM site_users WHERE phone = ?").get(phone);
  if (!siteUser) {
    try {
      const ins = db
        .prepare(
          `INSERT INTO site_users (phone, email_verified, updated_at) VALUES (?, 0, datetime('now','localtime'))`,
        )
        .run(phone);
      siteUser = { id: Number(ins.lastInsertRowid), phone };
    } catch {
      siteUser = db.prepare("SELECT id, phone FROM site_users WHERE phone = ?").get(phone);
    }
  }
  const siteToken =
    siteUser && siteUser.phone
      ? signSitePayload({
          typ: "site",
          sub: "phone",
          phone: siteUser.phone,
          exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
        })
      : null;

  res.json({
    success: true,
    data: {
      token,
      siteToken,
      creator: {
        id: creator.id,
        phone: creator.phone,
        displayName: creator.display_name,
        status: creator.status,
        joinedAt: creator.created_at,
      },
    },
    message: "ok",
    token,
    siteToken,
    creator: {
      id: creator.id,
      phone: creator.phone,
      displayName: creator.display_name,
      status: creator.status,
      joinedAt: creator.created_at,
    },
  });
});

// ─── 数据概览 ────────────────────────────────────────────────
router.get("/stats", requireCreator, (req, res) => {
  const cid = req.creator.id;

  const totalEarnings = db
    .prepare(
      "SELECT COALESCE(SUM(creator_amount),0) as v FROM orders WHERE creator_id=? AND status='paid'",
    )
    .get(cid).v;

  const thisMonth = new Date().toISOString().slice(0, 7);
  const thisMonthEarnings = db
    .prepare(
      "SELECT COALESCE(SUM(creator_amount),0) as v FROM orders WHERE creator_id=? AND status='paid' AND strftime('%Y-%m', paid_at)=?",
    )
    .get(cid, thisMonth).v;

  const totalStudents = db
    .prepare(
      "SELECT COUNT(DISTINCT buyer_phone) as v FROM orders WHERE creator_id=? AND status='paid'",
    )
    .get(cid).v;

  const totalCourses = db.prepare("SELECT COUNT(*) as v FROM courses WHERE creator_id=?").get(cid).v;

  const publishedCourses = db
    .prepare(
      "SELECT COUNT(*) as v FROM courses WHERE creator_id=? AND status='published'",
    )
    .get(cid).v;

  const draftCourses = db
    .prepare(
      "SELECT COUNT(*) as v FROM courses WHERE creator_id=? AND status!='published'",
    )
    .get(cid).v;

  const totalOrders = db
    .prepare("SELECT COUNT(*) as v FROM orders WHERE creator_id=? AND status='paid'")
    .get(cid).v;

  const withdrawn = db
    .prepare(
      "SELECT COALESCE(SUM(amount),0) as v FROM withdrawals WHERE creator_id=? AND status IN ('approved','paid')",
    )
    .get(cid).v;
  const pendingWithdraw = Math.max(0, totalEarnings - withdrawn);

  res.json({
    success: true,
    data: {
      totalEarnings,
      thisMonthEarnings,
      totalStudents,
      totalCourses,
      publishedCourses,
      draftCourses,
      totalOrders,
      pendingWithdraw,
    },
  });
});

// ─── 最近订单 ────────────────────────────────────────────────
router.get("/orders", requireCreator, (req, res) => {
  const cid = req.creator.id;
  const limit = Math.min(parseInt(String(req.query.limit ?? "10"), 10) || 10, 50);

  const orders = db
    .prepare(
      `
    SELECT o.id, c.title as course_name, o.total_amount, o.creator_amount,
           o.buyer_phone, o.paid_at as created_at
    FROM orders o
    JOIN courses c ON c.id = o.course_id
    WHERE o.creator_id = ? AND o.status = 'paid'
    ORDER BY o.paid_at DESC
    LIMIT ?
  `,
    )
    .all(cid, limit);

  res.json({
    success: true,
    data: orders.map((o) => ({
      id: String(o.id),
      courseName: o.course_name,
      amount: o.creator_amount,
      buyerPhone: o.buyer_phone
        ? o.buyer_phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2")
        : "匿名",
      createdAt: o.created_at ? o.created_at.slice(0, 10) : "",
    })),
  });
});

// ─── 课程列表 ────────────────────────────────────────────────
router.get("/courses", requireCreator, (req, res) => {
  const courses = db
    .prepare(
      `
    SELECT c.*,
      (SELECT COUNT(*) FROM orders o WHERE o.course_id=c.id AND o.status='paid') as students,
      (SELECT COALESCE(SUM(o.creator_amount),0) FROM orders o WHERE o.course_id=c.id AND o.status='paid') as earnings
    FROM courses c
    WHERE c.creator_id = ?
    ORDER BY c.created_at DESC
  `,
    )
    .all(req.creator.id);

  res.json({
    success: true,
    data: courses.map((c) => ({
      id: String(c.id),
      title: c.title,
      price: c.price_yuan,
      status: c.status,
      students: c.students,
      earnings: c.earnings,
      coverUrl: c.cover_url,
      description: c.description ?? "",
      videoUrl: c.video_url ?? "",
      tags: c.tags ?? "",
      createdAt: c.created_at.slice(0, 10),
    })),
  });
});

// ─── 新建课程 ────────────────────────────────────────────────
router.post("/courses", requireCreator, (req, res) => {
  const { title, price, description, videoUrl, tags } = req.body;
  if (!title || price == null) {
    return res.status(400).json({ success: false, message: "课程名称和价格必填" });
  }

  const tagsStr =
    typeof tags === "string" ? tags.trim().slice(0, 2000) : tags != null ? String(tags) : "";

  const result = db
    .prepare(
      `
    INSERT INTO courses (creator_id, title, price_yuan, description, video_url, tags, status)
    VALUES (?, ?, ?, ?, ?, ?, 'draft')
  `,
    )
    .run(
      req.creator.id,
      title.trim(),
      parseFloat(price) || 0,
      description || "",
      videoUrl || "",
      tagsStr,
    );

  res.json({ success: true, id: String(result.lastInsertRowid) });
});

// ─── 编辑课程 ────────────────────────────────────────────────
router.put("/courses/:id", requireCreator, (req, res) => {
  const course = db
    .prepare("SELECT * FROM courses WHERE id=? AND creator_id=?")
    .get(req.params.id, req.creator.id);
  if (!course) return res.status(404).json({ success: false, message: "课程不存在" });

  const { title, price, description, videoUrl, tags } = req.body;
  const tagsNext =
    typeof tags === "string"
      ? tags.trim().slice(0, 2000)
      : tags === undefined
        ? (course.tags ?? "")
        : String(tags);
  db.prepare(
    `
    UPDATE courses SET title=?, price_yuan=?, description=?, video_url=?, tags=?,
    updated_at=datetime('now','localtime') WHERE id=?
  `,
  ).run(
    title ?? course.title,
    price != null ? parseFloat(price) : course.price_yuan,
    description ?? course.description,
    videoUrl ?? course.video_url,
    tagsNext,
    course.id,
  );

  res.json({ success: true });
});

// ─── 上下架课程 ──────────────────────────────────────────────
router.put("/courses/:id/status", requireCreator, (req, res) => {
  const course = db
    .prepare("SELECT * FROM courses WHERE id=? AND creator_id=?")
    .get(req.params.id, req.creator.id);
  if (!course) return res.status(404).json({ success: false, message: "课程不存在" });

  const { status } = req.body;
  if (!["published", "offline", "draft"].includes(status)) {
    return res.status(400).json({ success: false, message: "状态值无效" });
  }

  db.prepare("UPDATE courses SET status=?, updated_at=datetime('now','localtime') WHERE id=?").run(
    status,
    course.id,
  );

  res.json({ success: true });
});

// ─── 收益明细 ────────────────────────────────────────────────
router.get("/earnings", requireCreator, (req, res) => {
  const cid = req.creator.id;

  const records = db
    .prepare(
      `
    SELECT o.id, c.title as course_name, o.total_amount, o.creator_amount,
           o.buyer_phone, o.paid_at as created_at,
           CASE WHEN s.status='settled' THEN 1 ELSE 0 END as settled
    FROM orders o
    JOIN courses c ON c.id = o.course_id
    LEFT JOIN settlements s ON s.creator_id=o.creator_id
      AND s.month = strftime('%Y-%m', o.paid_at)
    WHERE o.creator_id=? AND o.status='paid'
    ORDER BY o.paid_at DESC
    LIMIT 200
  `,
    )
    .all(cid);

  const summaries = db
    .prepare(
      `
    SELECT strftime('%Y-%m', paid_at) as month,
           SUM(creator_amount) as total,
           COUNT(*) as orders
    FROM orders
    WHERE creator_id=? AND status='paid'
    GROUP BY month
    ORDER BY month DESC
    LIMIT 12
  `,
    )
    .all(cid);

  const totalEarnings = db
    .prepare(
      "SELECT COALESCE(SUM(creator_amount),0) as v FROM orders WHERE creator_id=? AND status='paid'",
    )
    .get(cid).v;
  const withdrawn = db
    .prepare(
      "SELECT COALESCE(SUM(amount),0) as v FROM withdrawals WHERE creator_id=? AND status IN ('approved','paid')",
    )
    .get(cid).v;

  const settledMonths = new Set(
    db
      .prepare("SELECT month FROM settlements WHERE creator_id=? AND status='settled'")
      .all(cid)
      .map((r) => r.month),
  );

  res.json({
    success: true,
    pendingWithdraw: Math.max(0, totalEarnings - withdrawn),
    records: records.map((r) => ({
      id: String(r.id),
      courseName: r.course_name,
      orderAmount: r.total_amount,
      creatorAmount: r.creator_amount,
      buyerPhone: r.buyer_phone
        ? r.buyer_phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2")
        : "匿名",
      createdAt: r.created_at ? r.created_at.slice(0, 10) : "",
      settled: !!r.settled,
    })),
    summaries: summaries.map((s) => ({
      month: s.month,
      total: s.total,
      orders: s.orders,
      settled: settledMonths.has(s.month),
    })),
  });
});

// ─── 个人信息 ────────────────────────────────────────────────
router.get("/profile", requireCreator, (req, res) => {
  const c = req.creator;
  res.json({
    success: true,
    data: {
      id: c.id,
      phone: c.phone,
      displayName: c.display_name,
      status: c.status,
      joinedAt: c.created_at,
    },
  });
});

router.put("/profile", requireCreator, (req, res) => {
  const { displayName } = req.body;
  db.prepare(
    "UPDATE creators SET display_name=?, updated_at=datetime('now','localtime') WHERE id=?",
  ).run(displayName || null, req.creator.id);
  res.json({ success: true });
});

// ─── 申请提现 ────────────────────────────────────────────────
router.post("/withdraw", requireCreator, (req, res) => {
  const { amount, alipayAccount, wechatAccount } = req.body;
  if (!amount || amount < 100) {
    return res.status(400).json({ success: false, message: "最低提现100元" });
  }

  const totalEarnings = db
    .prepare(
      "SELECT COALESCE(SUM(creator_amount),0) as v FROM orders WHERE creator_id=? AND status='paid'",
    )
    .get(req.creator.id).v;
  const withdrawn = db
    .prepare(
      "SELECT COALESCE(SUM(amount),0) as v FROM withdrawals WHERE creator_id=? AND status IN ('approved','paid','pending')",
    )
    .get(req.creator.id).v;

  if (amount > totalEarnings - withdrawn) {
    return res.status(400).json({ success: false, message: "可提现余额不足" });
  }

  db.prepare(
    `
    INSERT INTO withdrawals (creator_id, amount, alipay_account, wechat_account)
    VALUES (?, ?, ?, ?)
  `,
  ).run(req.creator.id, amount, alipayAccount || null, wechatAccount || null);

  res.json({ success: true, message: "提现申请已提交，3个工作日内处理" });
});

// ─── 入驻申请保存（对接 /join 页面）─────────────────────────
router.post("/join", (req, res) => {
  const { name, wechat, expertise, courseName, price, bio, fans } = req.body;
  if (!name || !wechat) {
    return res.status(400).json({ success: false, message: "姓名和微信号必填" });
  }

  db.prepare(
    `
    INSERT INTO join_applications (name, wechat, expertise, course_name, price, bio, fans)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `,
  ).run(name, wechat, expertise || "", courseName || "", price || "", bio || "", fans || "");

  res.json({ success: true, message: "申请已提交" });
});

module.exports = router;
