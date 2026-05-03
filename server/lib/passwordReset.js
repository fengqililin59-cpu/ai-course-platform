"use strict";

const { isSmsConfigured, sendVerificationCode } = require("./aliyunSms");
const { sendMailOptional } = require("./mailer");
const { normalizeEmail } = require("./emailOtp");

/** @type {Map<string, { code: string; exp: number; userId: number }>} */
const resetCodes = new Map();
/** @type {Map<string, number>} */
const lastSendAt = new Map();

const RESEND_MS = 55_000;
const TTL_MS = 10 * 60 * 1000;
const DEV_CODE = "888888";

function resetKey(account, isPhone) {
  return isPhone ? `p:${String(account).trim()}` : `e:${normalizeEmail(account)}`;
}

/**
 * @param {string} account
 * @param {boolean} isPhone
 * @param {number} userId
 * @returns {Promise<{ ok: boolean, status?: number, message: string }>}
 */
async function issueAndDeliverResetCode(account, isPhone, userId) {
  const key = resetKey(account, isPhone);
  const prev = lastSendAt.get(key);
  if (prev && Date.now() - prev < RESEND_MS) {
    return { ok: false, status: 429, message: "发送过于频繁，请稍后再试" };
  }

  if (isPhone && isSmsConfigured()) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    resetCodes.set(key, { code, exp: Date.now() + TTL_MS, userId });
    lastSendAt.set(key, Date.now());
    try {
      await sendVerificationCode(String(account).trim(), code);
      return { ok: true, status: 200, message: "验证码已发送，请查收" };
    } catch (e) {
      resetCodes.delete(key);
      lastSendAt.delete(key);
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, status: 502, message: msg || "短信发送失败" };
    }
  }

  if (isPhone && process.env.NODE_ENV !== "production") {
    const code = DEV_CODE;
    resetCodes.set(key, { code, exp: Date.now() + TTL_MS, userId });
    lastSendAt.set(key, Date.now());
    console.log(`[password-reset·开发] ${key} 固定码=${code}（未配置阿里云短信）`);
    return { ok: true, status: 200, message: "验证码已发送（开发环境固定 888888）" };
  }

  if (isPhone) {
    resetCodes.delete(key);
    lastSendAt.delete(key);
    return { ok: false, status: 503, message: "短信服务未配置，无法发送验证码" };
  }

  const code =
    process.env.NODE_ENV === "production"
      ? Math.floor(100000 + Math.random() * 900000).toString()
      : DEV_CODE;
  resetCodes.set(key, { code, exp: Date.now() + TTL_MS, userId });
  lastSendAt.set(key, Date.now());

  if (process.env.NODE_ENV !== "production") {
    console.log(`[password-reset·开发] ${key} 固定码=${code}`);
    return { ok: true, status: 200, message: "验证码已发送（开发环境固定 888888）" };
  }

  const em = normalizeEmail(account);
  const sent = await sendMailOptional({
    to: em,
    subject: "重置密码验证码",
    text: `您的验证码为：${code}，10 分钟内有效。如非本人操作请忽略。`,
  });
  if (!sent.ok) {
    resetCodes.delete(key);
    lastSendAt.delete(key);
    return { ok: false, status: sent.status || 503, message: sent.message };
  }
  return { ok: true, status: 200, message: "验证码已发送，请查收邮箱" };
}

/**
 * @param {string} account
 * @param {boolean} isPhone
 * @param {string} codeInput
 * @returns {{ ok: true, userId: number } | { ok: false, message: string }}
 */
function verifyResetCode(account, isPhone, codeInput) {
  const key = resetKey(account, isPhone);
  const c = String(codeInput ?? "").trim();
  const row = resetCodes.get(key);
  if (!row) {
    return { ok: false, message: "验证码未发送或已过期" };
  }
  if (Date.now() > row.exp) {
    resetCodes.delete(key);
    return { ok: false, message: "验证码已过期" };
  }
  const devBypass =
    process.env.NODE_ENV !== "production" &&
    (!isPhone || !isSmsConfigured()) &&
    (c === DEV_CODE || (process.env.CREATOR_DEV_SMS_CODE && c === process.env.CREATOR_DEV_SMS_CODE));
  if (!devBypass && row.code !== c) {
    return { ok: false, message: "验证码错误" };
  }
  return { ok: true, userId: row.userId };
}

function consumeResetCode(account, isPhone) {
  resetCodes.delete(resetKey(account, isPhone));
}

module.exports = {
  issueAndDeliverResetCode,
  verifyResetCode,
  consumeResetCode,
  resetKey,
};
