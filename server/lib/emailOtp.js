"use strict";

/** @type {Map<string, { code: string, exp: number }>} */
const emailCodes = new Map();
/** @type {Map<string, number>} */
const lastSendAt = new Map();

const RESEND_MS = 55_000;
const TTL_MS = 5 * 60 * 1000;
const DEV_FIXED = "888888";

function normalizeEmail(email) {
  return String(email ?? "")
    .trim()
    .toLowerCase();
}

function isValidEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

/**
 * @param {string} email
 * @returns {Promise<{ ok: boolean, status: number, message: string }>}
 */
async function sendEmailOtp(email) {
  const em = normalizeEmail(email);
  if (!em || !isValidEmail(em)) {
    return { ok: false, status: 400, message: "邮箱格式不正确" };
  }
  const prev = lastSendAt.get(em);
  if (prev && Date.now() - prev < RESEND_MS) {
    return { ok: false, status: 429, message: "发送过于频繁，请稍后再试" };
  }

  if (process.env.NODE_ENV !== "production") {
    emailCodes.set(em, { code: DEV_FIXED, exp: Date.now() + TTL_MS });
    lastSendAt.set(em, Date.now());
    console.log(`[邮箱验证码·开发模式] email=${em} 固定码=${DEV_FIXED}`);
    return {
      ok: true,
      status: 200,
      message: `验证码已发送（开发环境固定为 ${DEV_FIXED}）`,
    };
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  emailCodes.set(em, { code, exp: Date.now() + TTL_MS });
  lastSendAt.set(em, Date.now());

  const { sendMailOptional } = require("./mailer");
  const sent = await sendMailOptional({
    to: em,
    subject: "您的验证码",
    text: `验证码：${code}，5 分钟内有效。`,
  });
  if (!sent.ok) {
    emailCodes.delete(em);
    lastSendAt.delete(em);
    console.error("[邮箱验证码] 发送失败:", sent.message);
    return { ok: false, status: sent.status || 503, message: sent.message };
  }
  return { ok: true, status: 200, message: "验证码已发送，请查收邮箱" };
}

function verifyEmailOtp(email, code) {
  const em = normalizeEmail(email);
  const c = String(code ?? "").trim();
  if (!em || !c) return { ok: false, message: "参数不完整" };

  if (
    process.env.NODE_ENV !== "production" &&
    (c === DEV_FIXED || (process.env.CREATOR_DEV_SMS_CODE && c === process.env.CREATOR_DEV_SMS_CODE))
  ) {
    return { ok: true, devBypass: true };
  }

  const row = emailCodes.get(em);
  if (!row) return { ok: false, message: "验证码未发送或已过期" };
  if (Date.now() > row.exp) {
    emailCodes.delete(em);
    return { ok: false, message: "验证码已过期" };
  }
  if (row.code !== c) return { ok: false, message: "验证码错误" };
  emailCodes.delete(em);
  return { ok: true, devBypass: false };
}

module.exports = { sendEmailOtp, verifyEmailOtp, normalizeEmail, isValidEmail };
