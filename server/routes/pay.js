"use strict";

const path = require("node:path");
const express = require("express");
const { AlipaySdk } = require("alipay-sdk");

const router = express.Router();
const rootDir = path.join(__dirname, "..");
const db = require("../db");
const {
  advanceSettledCommissions,
  computeCommissionAvailableAt,
} = require("../lib/distributionSettlement");
const {
  parseRefundFeeYuan,
  tryCancelDistributionCommissionOnRefund,
} = require("../lib/distributionRefund");
const { discountFromCoupon, bestCheckout } = require("../lib/couponPricing");
const { markUserCouponUsed, restoreUserCouponAfterRefund } = require("../lib/userCouponPay");

/**
 * 退款通知处理时：若库中已有该 out_trade_no 的订单且为 paid，则标为 refunded，
 * 使 /api/admin/dashboard/analytics 等仅统计 paid 的口径与退款一致。
 */
function markPersistedOrderRefunded(outTradeNo) {
  const no = String(outTradeNo || "").trim();
  if (!no) return;
  try {
    const row = db
      .prepare(
        `SELECT status, seckill_activity_id FROM orders WHERE out_trade_no = ?`,
      )
      .get(no);
    const info = db
      .prepare(
        `UPDATE orders SET status = 'refunded' WHERE out_trade_no = ? AND status = 'paid'`,
      )
      .run(no);
    if (info.changes > 0) {
      console.log("[pay] orders.sqlite marked refunded", no);
      restoreUserCouponAfterRefund(db, no);
      if (row?.seckill_activity_id) {
        db.prepare(`UPDATE seckill_activities SET stock = stock + 1 WHERE id = ?`).run(row.seckill_activity_id);
      }
    }
  } catch (e) {
    console.error("[pay] markPersistedOrderRefunded", no, e);
  }
}

function persistPaySideEffects(order, outTradeNo) {
  if (!order) return;
  try {
    if (order.userCouponId) {
      markUserCouponUsed(db, order.userCouponId, outTradeNo, order.userId);
    }
    db.prepare(
      `UPDATE orders SET status = 'paid', paid_at = datetime('now','localtime')
       WHERE out_trade_no = ? AND status = 'pending_seckill'`,
    ).run(outTradeNo);
  } catch (e) {
    console.error("[pay] persistPaySideEffects", outTradeNo, e);
  }
}

/** @type {Map<string, { courseId: string, userId: string, courseName: string, amount: string, status: string, distributorRef?: string | null, distributorPhone?: string | null, distributorRatePercent?: number | null }>} */
const orders = new Map();

/**
 * 支付成功后写入分销佣金（幂等：INSERT OR IGNORE + out_trade_no UNIQUE）
 * 下单时已快照 distributorPhone / distributorRatePercent，避免链接过期后无法归因。
 * @param {{ courseId: string, userId: string, amount: string, distributorRef?: string | null, distributorPhone?: string | null, distributorRatePercent?: number | null }} order
 * @param {string} outTradeNo
 */
function tryRecordDistributionCommission(order, outTradeNo) {
  advanceSettledCommissions();

  const ref =
    order.distributorRef != null
      ? String(order.distributorRef).trim()
      : "";
  if (!ref || !order.distributorPhone) return;

  const buyer = String(order.userId || "").trim();
  if (buyer && buyer === String(order.distributorPhone).trim()) return;

  const amount = parseFloat(order.amount);
  if (!Number.isFinite(amount) || amount <= 0) return;

  const ratePct = Math.min(
    100,
    Math.max(1, Math.floor(Number(order.distributorRatePercent) || 20)),
  );
  const commission = Math.round(((amount * ratePct) / 100) * 100) / 100;
  const commissionRate = ratePct / 100;
  const amountCents = Math.round(amount * 100);
  const availableAt = computeCommissionAvailableAt();

  const stmt = db.prepare(
    `
    INSERT OR IGNORE INTO distribution_commissions (
      out_trade_no, ref_token, course_id, buyer_phone, distributor_phone,
      order_amount, order_amount_cents, commission_rate, rate_percent, commission_amount,
      status, available_at, paid_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_settlement', ?, NULL, datetime('now','localtime'))
  `,
  );

  const info = stmt.run(
    outTradeNo,
    ref,
    String(order.courseId),
    buyer || null,
    String(order.distributorPhone),
    amount,
    amountCents,
    commissionRate,
    ratePct,
    commission,
    availableAt,
  );

  if (info.changes > 0) {
    advanceSettledCommissions();
  }
}

let alipaySdk;

function normalizePrivateKey(key) {
  if (!key) return "";
  return String(key).replace(/\\n/g, "\n").trim();
}

function buildAlipaySdk() {
  const appId = process.env.ALIPAY_APP_ID;
  const privateKey = normalizePrivateKey(process.env.ALIPAY_PRIVATE_KEY);
  if (!appId || !privateKey) {
    throw new Error("缺少 ALIPAY_APP_ID 或 ALIPAY_PRIVATE_KEY");
  }

  const keyType =
    process.env.ALIPAY_KEY_TYPE === "PKCS1" ? "PKCS1" : "PKCS8";

  const config = {
    appId,
    privateKey,
    keyType,
    gateway:
      process.env.ALIPAY_GATEWAY ||
      "https://openapi.alipay.com/gateway.do",
    endpoint:
      process.env.ALIPAY_ENDPOINT || "https://openapi.alipay.com",
  };

  const appCertPath = process.env.ALIPAY_APP_CERT_PATH;
  const alipayPublicCertPath = process.env.ALIPAY_PUBLIC_CERT_PATH;
  const alipayRootCertPath = process.env.ALIPAY_ROOT_CERT_PATH;

  if (appCertPath && alipayPublicCertPath && alipayRootCertPath) {
    config.appCertPath = path.resolve(rootDir, appCertPath);
    config.alipayPublicCertPath = path.resolve(
      rootDir,
      alipayPublicCertPath,
    );
    config.alipayRootCertPath = path.resolve(rootDir, alipayRootCertPath);
  } else if (process.env.ALIPAY_PUBLIC_KEY) {
    config.alipayPublicKey = normalizePrivateKey(
      process.env.ALIPAY_PUBLIC_KEY,
    );
  } else {
    throw new Error(
      "请配置证书：ALIPAY_APP_CERT_PATH、ALIPAY_PUBLIC_CERT_PATH、ALIPAY_ROOT_CERT_PATH，或配置 ALIPAY_PUBLIC_KEY（公钥模式）",
    );
  }

  return new AlipaySdk(config);
}

function getSdk() {
  if (!alipaySdk) {
    alipaySdk = buildAlipaySdk();
  }
  return alipaySdk;
}

function frontendBase() {
  return (process.env.FRONTEND_PUBLIC_URL || "https://ai.syzs.top").replace(
    /\/$/,
    "",
  );
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
  return `C${Date.now()}${Math.random().toString(36).slice(2, 10)}`.slice(
    0,
    64,
  );
}

/** 仅当 PAY_DEV_SIMULATE=1 时启用：跳过支付宝、用 test-simulate-paid 完成入账与分销佣金 */
function isPayDevSimulate() {
  return String(process.env.PAY_DEV_SIMULATE || "").trim() === "1";
}

router.post("/create-order", (req, res) => {
  try {
    const body = req.body || {};
    const {
      courseId,
      userId,
      amount,
      courseName,
      distributorRef,
      userCouponId: rawCoupon,
      seckillActivityId: rawSeckill,
    } = body;

    if (rawSeckill != null && String(rawSeckill).trim() !== "") {
      return res.status(400).json({ message: "秒杀请使用 POST /api/seckill/:activityId/purchase" });
    }

    if (!courseId || typeof courseId !== "string") {
      return res.status(400).json({ message: "courseId 必填" });
    }
    if (courseName == null || String(courseName).trim() === "") {
      return res.status(400).json({ message: "courseName 必填" });
    }

    const cidNum = Number(courseId);
    if (!Number.isFinite(cidNum)) {
      return res.status(400).json({ message: "courseId 无效" });
    }
    const courseRow = db
      .prepare(`SELECT id, title, creator_id, price_yuan FROM courses WHERE id = ?`)
      .get(cidNum);
    if (!courseRow) {
      return res.status(400).json({ message: "课程不存在" });
    }
    const listPrice = Number(courseRow.price_yuan);
    if (!Number.isFinite(listPrice) || listPrice < 0) {
      return res.status(400).json({ message: "课程价格无效" });
    }

    const uid = userId != null ? String(userId) : "guest";
    let userCouponId = null;
    let finalYuan = listPrice;

    if (rawCoupon != null && String(rawCoupon).trim() !== "") {
      userCouponId = Number(rawCoupon);
      if (!Number.isFinite(userCouponId)) {
        return res.status(400).json({ message: "userCouponId 无效" });
      }
      const su = db.prepare(`SELECT id FROM site_users WHERE phone = ?`).get(uid.trim());
      if (!su?.id) {
        return res.status(400).json({ message: "请先登录后再使用优惠券" });
      }
      const row = db
        .prepare(
          `
        SELECT uc.id AS uc_id, c.*, uc.status AS uc_status
        FROM user_coupons uc
        JOIN coupons c ON c.id = uc.coupon_id
        WHERE uc.id = ? AND uc.user_id = ?
      `,
        )
        .get(userCouponId, su.id);
      if (!row || String(row.uc_status) !== "unused") {
        return res.status(400).json({ message: "优惠券不可用" });
      }
      if (String(row.status) !== "active") {
        return res.status(400).json({ message: "优惠券未生效" });
      }
      const now = db.prepare(`SELECT datetime('now','localtime') AS t`).get().t;
      if (now < String(row.start_time) || now > String(row.end_time)) {
        return res.status(400).json({ message: "优惠券不在有效期内" });
      }
      let apps = [];
      try {
        apps = JSON.parse(String(row.applicable_courses || "[]"));
      } catch {
        apps = [];
      }
      if (Array.isArray(apps) && apps.length > 0 && !apps.map(String).includes(String(courseId))) {
        return res.status(400).json({ message: "优惠券不适用于该课程" });
      }
      const act = db
        .prepare(
          `
        SELECT seckill_price FROM seckill_activities
        WHERE course_id = ? AND status = 'active'
          AND datetime('now','localtime') >= datetime(start_time)
          AND datetime('now','localtime') <= datetime(end_time)
          AND stock > 0
        ORDER BY id DESC LIMIT 1
      `,
        )
        .get(cidNum);
      const sk = act ? Number(act.seckill_price) : null;
      const pick = bestCheckout(listPrice, row, sk);
      if (pick.mode === "seckill") {
        return res.status(400).json({
          message: "当前秒杀价更优，请使用秒杀下单",
        });
      }
      finalYuan = pick.finalPrice;
    }

    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0 || n > 1_000_000) {
      return res.status(400).json({ message: "amount 无效" });
    }
    if (Math.abs(n - finalYuan) > 0.02) {
      return res.status(400).json({
        message: `金额与服务器计算不一致，请刷新后重试（应付 ¥${finalYuan.toFixed(2)}）`,
      });
    }

    const totalAmount = finalYuan.toFixed(2);
    const outTradeNo = newOutTradeNo();
    const subject = String(courseName).slice(0, 128);

    const refRaw =
      distributorRef != null ? String(distributorRef).trim() : "";
    let distributorPhone = null;
    let distributorRatePercent = null;
    if (refRaw) {
      const row = db
        .prepare(
          `
        SELECT course_id, distributor_phone, rate_percent
        FROM distribution_links
        WHERE ref_token = ?
          AND (expires_at IS NULL OR datetime(expires_at) > datetime('now','localtime'))
      `,
        )
        .get(refRaw);
      if (!row || String(row.course_id) !== String(courseId)) {
        return res.status(400).json({ message: "推广链接无效、已过期或与课程不匹配" });
      }
      distributorPhone = String(row.distributor_phone);
      distributorRatePercent = Math.min(
        100,
        Math.max(1, Math.floor(Number(row.rate_percent) || 20)),
      );
    }

    orders.set(outTradeNo, {
      courseId,
      userId: uid,
      courseName: String(courseName),
      amount: totalAmount,
      status: "pending",
      distributorRef: refRaw || null,
      distributorPhone,
      distributorRatePercent,
      userCouponId: userCouponId || null,
      seckillActivityId: null,
      pendingSeckill: false,
    });

    if (isPayDevSimulate()) {
      return res.json({
        payUrl: null,
        devSimulate: true,
        outTradeNo,
        amount: totalAmount,
        courseId,
        courseName: String(courseName),
      });
    }

    const sdk = getSdk();
    const payUrl = sdk.pageExecute("alipay.trade.wap.pay", "GET", {
      notifyUrl: notifyUrl(),
      returnUrl: syncReturnUrl(),
      bizContent: {
        out_trade_no: outTradeNo,
        product_code: "QUICK_WAP_WAY",
        total_amount: totalAmount,
        subject,
        body: `courseId:${courseId};userId:${encodeURIComponent(uid)}`,
      },
    });

    return res.json({ payUrl });
  } catch (err) {
    console.error("[create-order]", err);
    return res.status(500).json({
      message: err.message || "下单失败",
    });
  }
});

/**
 * 开发联调：将内存订单标为已支付并写入分销佣金（与支付宝 notify 逻辑一致）。
 * 仅 PAY_DEV_SIMULATE=1 时可用；生产环境始终 404。
 */
router.post("/test-simulate-paid", (req, res) => {
  if (!isPayDevSimulate()) {
    return res.status(404).json({ message: "not found" });
  }
  try {
    const raw =
      req.body?.outTradeNo ??
      req.body?.orderId ??
      req.query?.outTradeNo ??
      req.query?.orderId;
    const outTradeNo = String(raw ?? "").trim();
    if (!outTradeNo) {
      return res.status(400).json({ message: "outTradeNo 或 orderId 必填" });
    }
    const order = orders.get(outTradeNo);
    if (!order) {
      return res.status(404).json({ message: "订单不存在或已过期（仅保存在当前进程内存中）" });
    }
    const alreadyPaid = order.status === "paid";
    if (!alreadyPaid) {
      order.status = "paid";
    }
    tryRecordDistributionCommission(order, outTradeNo);
    persistPaySideEffects(order, outTradeNo);
    return res.json({
      ok: true,
      alreadyPaid,
      outTradeNo,
      courseId: order.courseId,
      amount: order.amount,
      courseName: order.courseName,
    });
  } catch (err) {
    console.error("[test-simulate-paid]", err);
    return res.status(500).json({ message: err.message || "模拟支付失败" });
  }
});

router.get("/callback", (req, res) => {
  try {
    const sdk = getSdk();
    const query = { ...req.query };
    const ok = sdk.checkNotifySign(query) || sdk.checkNotifySignV2(query);
    if (!ok) {
      return res.status(400).send("签名校验失败");
    }

    const outTradeNo = String(query.out_trade_no || "");
    const tradeStatus = String(query.trade_status || "");
    const totalAmount = String(query.total_amount || "");

    const refundFeeCb = parseRefundFeeYuan(query);
    if (refundFeeCb > 0 && outTradeNo) {
      tryCancelDistributionCommissionOnRefund(outTradeNo, query);
      markPersistedOrderRefunded(outTradeNo);
    }

    const order = orders.get(outTradeNo);
    if (!order) {
      return res.status(404).send("订单不存在");
    }

    if (totalAmount && totalAmount !== order.amount) {
      return res.status(400).send("金额不一致");
    }

    if (tradeStatus === "TRADE_SUCCESS" || tradeStatus === "TRADE_FINISHED") {
      order.status = "paid";
      tryRecordDistributionCommission(order, outTradeNo);
      persistPaySideEffects(order, outTradeNo);
    } else if (refundFeeCb > 0) {
      order.status = "refunded";
    }

    const base = frontendBase();
    const q = new URLSearchParams();
    q.set("orderId", outTradeNo);
    q.set("courseId", order.courseId);
    q.set("amount", order.amount);
    q.set("courseName", order.courseName);

    if (tradeStatus === "TRADE_SUCCESS" || tradeStatus === "TRADE_FINISHED") {
      return res.redirect(302, `${base}/pay/success?${q.toString()}`);
    }

    return res.redirect(302, `${base}/courses?pay=unfinished`);
  } catch (err) {
    console.error("[callback]", err);
    return res.status(500).send("处理失败");
  }
});

router.post("/notify", (req, res) => {
  try {
    const sdk = getSdk();
    const body = { ...req.body };
    const ok = sdk.checkNotifySign(body) || sdk.checkNotifySignV2(body);
    if (!ok) {
      return res.type("text/plain").status(400).send("fail");
    }

    const outTradeNo = String(body.out_trade_no || "");
    const tradeStatus = String(body.trade_status || "");
    const totalAmount = String(body.total_amount || "");

    const order = orders.get(outTradeNo);
    if (order && totalAmount && totalAmount !== order.amount) {
      return res.type("text/plain").status(400).send("fail");
    }

    if (
      order &&
      (tradeStatus === "TRADE_SUCCESS" || tradeStatus === "TRADE_FINISHED")
    ) {
      order.status = "paid";
      tryRecordDistributionCommission(order, outTradeNo);
      persistPaySideEffects(order, outTradeNo);
    }

    const refundFee = parseRefundFeeYuan(body);
    if (refundFee > 0 && outTradeNo) {
      tryCancelDistributionCommissionOnRefund(outTradeNo, body);
      markPersistedOrderRefunded(outTradeNo);
      const ord = orders.get(outTradeNo);
      if (ord) ord.status = "refunded";
    }

    return res.type("text/plain").status(200).send("success");
  } catch (err) {
    console.error("[notify]", err);
    return res.type("text/plain").status(500).send("fail");
  }
});

function registerPayOrder(outTradeNo, payload) {
  orders.set(outTradeNo, {
    ...payload,
    status: payload.status || "pending",
  });
}

function forgetPayOrder(outTradeNo) {
  orders.delete(String(outTradeNo || "").trim());
}

router.registerPayOrder = registerPayOrder;
router.forgetPayOrder = forgetPayOrder;
module.exports = router;
