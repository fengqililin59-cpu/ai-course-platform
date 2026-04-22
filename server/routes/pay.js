"use strict";

const path = require("node:path");
const express = require("express");
const { AlipaySdk } = require("alipay-sdk");

const router = express.Router();
const rootDir = path.join(__dirname, "..");

/** @type {Map<string, { courseId: string, userId: string, courseName: string, amount: string, status: string }>} */
const orders = new Map();

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

router.post("/create-order", (req, res) => {
  try {
    const { courseId, userId, amount, courseName } = req.body || {};

    if (!courseId || typeof courseId !== "string") {
      return res.status(400).json({ message: "courseId 必填" });
    }
    if (courseName == null || String(courseName).trim() === "") {
      return res.status(400).json({ message: "courseName 必填" });
    }
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0 || n > 1_000_000) {
      return res.status(400).json({ message: "amount 无效" });
    }

    const totalAmount = n.toFixed(2);
    const outTradeNo = newOutTradeNo();
    const subject = String(courseName).slice(0, 128);
    const uid = userId != null ? String(userId) : "guest";

    orders.set(outTradeNo, {
      courseId,
      userId: uid,
      courseName: String(courseName),
      amount: totalAmount,
      status: "pending",
    });

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

    const order = orders.get(outTradeNo);
    if (!order) {
      return res.status(404).send("订单不存在");
    }

    if (totalAmount && totalAmount !== order.amount) {
      return res.status(400).send("金额不一致");
    }

    if (tradeStatus === "TRADE_SUCCESS" || tradeStatus === "TRADE_FINISHED") {
      order.status = "paid";
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
    }

    return res.type("text/plain").status(200).send("success");
  } catch (err) {
    console.error("[notify]", err);
    return res.type("text/plain").status(500).send("fail");
  }
});

module.exports = router;
