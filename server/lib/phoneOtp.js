"use strict";

/**
 * 前台登录 / 创作者登录共用的手机验证码（内存；多实例部署需改 Redis）
 */
const { isSmsConfigured, sendVerificationCode } = require("./aliyunSms");

/** @type {Map<string, { code: string, exp: number }>} */
const phoneCodes = new Map();

/** @type {Map<string, number>} */
const lastSendAt = new Map();

const CODE_RESEND_INTERVAL_MS = 55_000;
const CODE_TTL_MS = 5 * 60 * 1000;

const DEV_FIXED_SMS_CODE = "888888";

function normalizePhone(phone) {
  return String(phone ?? "")
    .trim()
    .replace(/\s+/g, "");
}

/**
 * @param {string} phone
 * @returns {Promise<{ ok: boolean, status: number, message: string }>}
 */
async function sendPhoneOtp(phone) {
  const p = normalizePhone(phone);
  if (!p || !/^1\d{10}$/.test(p)) {
    return { ok: false, status: 400, message: "手机号格式错误（需 11 位且以 1 开头）" };
  }

  const prev = lastSendAt.get(p);
  if (prev && Date.now() - prev < CODE_RESEND_INTERVAL_MS) {
    return { ok: false, status: 429, message: "发送过于频繁，请稍后再试" };
  }

  /** 已配置阿里云短信时：任意 NODE_ENV 均下发随机码并真实发送 */
  if (isSmsConfigured()) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const exp = Date.now() + CODE_TTL_MS;
    phoneCodes.set(p, { code, exp });
    try {
      await sendVerificationCode(p, code);
      lastSendAt.set(p, Date.now());
      console.log(`[短信验证码·已发送] ${p}`);
      return { ok: true, status: 200, message: "验证码已发送" };
    } catch (e) {
      phoneCodes.delete(p);
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[短信发送失败] phone=", p, "error=", e);
      if (msg.includes("isv.DAY_LIMIT_CONTROL")) {
        return {
          ok: false,
          status: 429,
          message: "该手机号今日短信已达上限，请明天再试",
        };
      }
      return {
        ok: false,
        status: 502,
        message: `短信发送失败：${msg}`,
      };
    }
  }

  /** 未配置短信且非生产：本地开发固定码，不调第三方 */
  if (process.env.NODE_ENV !== "production") {
    phoneCodes.set(p, { code: DEV_FIXED_SMS_CODE, exp: Date.now() + CODE_TTL_MS });
    lastSendAt.set(p, Date.now());
    console.log(
      `[短信验证码·开发模式] phone=${p} 固定码=${DEV_FIXED_SMS_CODE}，已跳过真实短信（未配置阿里云短信）`,
    );
    return {
      ok: true,
      status: 200,
      message: `验证码已发送（开发环境固定为 ${DEV_FIXED_SMS_CODE}）`,
    };
  }

  return {
    ok: false,
    status: 503,
    message: "短信服务未配置，无法发送验证码（请配置阿里云短信环境变量）",
  };
}

/**
 * @param {string} phone
 * @param {string} code
 * @returns {{ ok: true, devBypass?: boolean } | { ok: false, message: string }}
 */
function verifyPhoneOtp(phone, code) {
  const p = normalizePhone(phone);
  const c = String(code ?? "").trim();
  if (!p || !c) {
    return { ok: false, message: "参数不完整" };
  }

  const allowDevBypass =
    process.env.NODE_ENV !== "production" &&
    !isSmsConfigured() &&
    (c === DEV_FIXED_SMS_CODE ||
      (process.env.CREATOR_DEV_SMS_CODE && c === process.env.CREATOR_DEV_SMS_CODE));

  if (allowDevBypass) {
    return { ok: true, devBypass: true };
  }

  const record = phoneCodes.get(p);
  if (!record) {
    return { ok: false, message: "验证码未发送或已过期" };
  }
  if (Date.now() > record.exp) {
    phoneCodes.delete(p);
    return { ok: false, message: "验证码已过期" };
  }
  if (record.code !== c) {
    return { ok: false, message: "验证码错误" };
  }
  phoneCodes.delete(p);
  return { ok: true, devBypass: false };
}

/** 注册等场景在验证成功后强制清除该号码的待发验证码（含开发环境已写入的缓存） */
function clearPhoneOtpForPhone(phone) {
  const p = normalizePhone(phone);
  if (p) phoneCodes.delete(p);
}

module.exports = {
  sendPhoneOtp,
  verifyPhoneOtp,
  clearPhoneOtpForPhone,
  phoneCodes,
  lastSendAt,
};
