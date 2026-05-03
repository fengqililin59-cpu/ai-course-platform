"use strict";

const crypto = require("node:crypto");
const express = require("express");
const db = require("../db");
const { signSitePayload, verifySitePayload, resolveSiteUserId } = require("../lib/siteJwt");
const { requireSiteUser } = require("../middleware/requireSiteUser");
const { issueOAuthState, consumeOAuthState } = require("../lib/oauthAuthorizeState");
const { verifyPhoneOtp, sendPhoneOtp, clearPhoneOtpForPhone } = require("../lib/phoneOtp");
const { sendEmailOtp, verifyEmailOtp, normalizeEmail, isValidEmail } = require("../lib/emailOtp");
const { hashPassword, verifyPassword } = require("../lib/passwordUtil");
const {
  issueAndDeliverResetCode,
  verifyResetCode,
  consumeResetCode,
} = require("../lib/passwordReset");
const { tryRecordResetRequest, normalizeRateLimitIp } = require("../lib/resetRateLimit");

const router = express.Router();

/** @type {Map<string, { exp: number; done: boolean; openid?: string }>} */
const wechatQrStates = new Map();

function ok(res, data = null, message = "ok", status = 200) {
  return res.status(status).json({ success: true, data, message });
}

function fail(res, status, message) {
  return res.status(status).json({ success: false, data: null, message });
}

/** 前台手机号验证码（与创作者通道共用内存 OTP；可选 type=register|login 供日志区分） */
router.post("/send-phone-code", async (req, res) => {
  try {
    const raw = req.body?.phone;
    const typeRaw = String(req.body?.type ?? "").toLowerCase();
    const p = String(raw ?? "")
      .trim()
      .replace(/\s+/g, "");
    if (!/^1\d{10}$/.test(p)) {
      return fail(res, 400, "手机号格式错误");
    }
    if (typeRaw && typeRaw !== "register" && typeRaw !== "login") {
      return fail(res, 400, "type 参数无效，仅支持 register 或 login");
    }
    if (typeRaw) {
      console.log(`[auth/send-phone-code] phone=${p} type=${typeRaw}`);
    }
    const r = await sendPhoneOtp(p);
    return res.status(r.status).json({
      success: r.ok,
      data: typeRaw ? { type: typeRaw } : null,
      message: r.message,
    });
  } catch (e) {
    console.error("[auth/send-phone-code]", e);
    return fail(res, 500, "发送失败");
  }
});

router.post("/phone-register", (req, res) => {
  try {
    const p = String(req.body?.phone ?? "")
      .trim()
      .replace(/\s+/g, "");
    const code = String(req.body?.code ?? "").trim();
    const password = String(req.body?.password ?? "");
    const confirmPassword = String(req.body?.confirmPassword ?? "");
    if (!/^1\d{10}$/.test(p)) {
      return fail(res, 400, "手机号格式错误");
    }
    if (password.length < 6) {
      return fail(res, 400, "密码至少 6 位");
    }
    if (password !== confirmPassword) {
      return fail(res, 400, "两次输入的密码不一致");
    }
    const v = verifyPhoneOtp(p, code);
    if (!v.ok) {
      return fail(res, 400, v.message);
    }
    clearPhoneOtpForPhone(p);

    const exists = db.prepare("SELECT id, password_hash FROM site_users WHERE phone = ?").get(p);
    if (exists) {
      return fail(res, 400, "手机号已注册");
    }

    const hash = hashPassword(password);
    db.prepare(
      `INSERT INTO site_users (phone, password_hash, email_verified, updated_at)
       VALUES (?, ?, 0, datetime('now','localtime'))`,
    ).run(p, hash);

    const token = signSitePayload({
      typ: "site",
      sub: "phone",
      phone: p,
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
    });
    return ok(res, { token, user: { phone: p } }, "注册成功");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("UNIQUE")) {
      return fail(res, 400, "手机号已注册");
    }
    console.error("[auth/phone-register]", e);
    return fail(res, 500, "注册失败");
  }
});

router.post("/phone-password-login", (req, res) => {
  try {
    const p = String(req.body?.phone ?? "")
      .trim()
      .replace(/\s+/g, "");
    const password = String(req.body?.password ?? "");
    if (!/^1\d{10}$/.test(p)) {
      return fail(res, 400, "手机号格式错误");
    }
    if (!password) {
      return fail(res, 400, "请输入密码");
    }
    const row = db.prepare("SELECT * FROM site_users WHERE phone = ?").get(p);
    if (!row || !row.password_hash) {
      return fail(res, 400, "未设置登录密码，请使用验证码登录或先完成注册");
    }
    if (!verifyPassword(password, row.password_hash)) {
      return fail(res, 401, "手机号或密码错误");
    }
    const token = signSitePayload({
      typ: "site",
      sub: "phone",
      phone: row.phone,
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
    });
    return ok(res, { token, user: { phone: row.phone } }, "登录成功");
  } catch (e) {
    console.error("[auth/phone-password-login]", e);
    return fail(res, 500, "登录失败");
  }
});

router.post("/verify-phone", (req, res) => {
  const { phone, code } = req.body || {};
  const p = String(phone ?? "")
    .trim()
    .replace(/\s+/g, "");
  const v = verifyPhoneOtp(p, code);
  if (!v.ok) {
    return fail(res, 400, v.message);
  }
  try {
    let su = db.prepare("SELECT id, phone FROM site_users WHERE phone = ?").get(p);
    if (!su) {
      try {
        const ins = db
          .prepare(
            `INSERT INTO site_users (phone, email_verified, updated_at) VALUES (?, 0, datetime('now','localtime'))`,
          )
          .run(p);
        su = { id: Number(ins.lastInsertRowid), phone: p };
      } catch {
        su = db.prepare("SELECT id, phone FROM site_users WHERE phone = ?").get(p);
      }
    }
    if (!su?.id) {
      return fail(res, 500, "无法创建或读取站点用户");
    }
    const token = signSitePayload({
      typ: "site",
      sub: "phone",
      phone: su.phone,
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
    });
    return ok(res, { phone: p, token }, "验证成功");
  } catch (e) {
    console.error("[auth/verify-phone]", e);
    return fail(res, 500, e instanceof Error ? e.message : "验证失败");
  }
});

router.post("/send-email-code", async (req, res) => {
  try {
    const r = await sendEmailOtp(req.body?.email);
    return res.status(r.status).json({
      success: r.ok,
      data: null,
      message: r.message,
    });
  } catch (e) {
    console.error("[auth/send-email-code] 未捕获异常", e);
    return fail(res, 500, e instanceof Error ? e.message : "服务器内部错误");
  }
});

router.post("/email-register", (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password ?? "");
    const code = String(req.body?.code ?? "").trim();
    if (!email || !isValidEmail(email)) {
      return fail(res, 400, "邮箱格式不正确");
    }
    if (password.length < 6) {
      return fail(res, 400, "密码至少 6 位");
    }
    const v = verifyEmailOtp(email, code);
    if (!v.ok) {
      return fail(res, 400, v.message);
    }

    const exists = db.prepare("SELECT id FROM site_users WHERE email = ?").get(email);
    if (exists) {
      return fail(res, 409, "该邮箱已注册，请直接登录");
    }

    const hash = hashPassword(password);
    try {
      db.prepare(
        `INSERT INTO site_users (email, password_hash, email_verified, updated_at)
         VALUES (?, ?, 1, datetime('now','localtime'))`,
      ).run(email, hash);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("UNIQUE")) {
        return fail(res, 409, "该邮箱已注册，请直接登录");
      }
      throw e;
    }

    const token = signSitePayload({
      typ: "site",
      sub: "email",
      email,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });
    return ok(res, { email, token }, "注册成功");
  } catch (e) {
    console.error("[auth/email-register]", e);
    return fail(res, 500, e instanceof Error ? e.message : "注册失败");
  }
});

router.post("/email-login", (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password ?? "");
    if (!email || !password) {
      return fail(res, 400, "请输入邮箱和密码");
    }
    const row = db.prepare("SELECT * FROM site_users WHERE email = ?").get(email);
    if (!row || !row.password_hash) {
      return fail(res, 401, "邮箱或密码错误");
    }
    if (!verifyPassword(password, row.password_hash)) {
      return fail(res, 401, "邮箱或密码错误");
    }
    const token = signSitePayload({
      typ: "site",
      sub: "email",
      email: row.email,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });
    return ok(
      res,
      {
        email: row.email,
        emailVerified: Boolean(row.email_verified),
        token,
      },
      "登录成功",
    );
  } catch (e) {
    console.error("[auth/email-login]", e);
    return fail(res, 500, e instanceof Error ? e.message : "登录失败");
  }
});

/** 是否已配置微信网站应用登录（供前端决定是否展示扫码，不返回任何敏感配置） */
router.get("/wechat-login-status", (_req, res) => {
  try {
    const appId = process.env.WECHAT_WEB_APP_ID || process.env.WECHAT_OPEN_APP_ID || "";
    const secret = process.env.WECHAT_WEB_APP_SECRET || process.env.WECHAT_OPEN_APP_SECRET || "";
    return ok(res, { available: Boolean(appId && secret) });
  } catch (e) {
    console.error("[auth/wechat-login-status]", e);
    return ok(res, { available: false });
  }
});

router.get("/wechat-qr-url", (req, res) => {
  try {
    const appId = process.env.WECHAT_WEB_APP_ID || process.env.WECHAT_OPEN_APP_ID || "";
    const secret = process.env.WECHAT_WEB_APP_SECRET || process.env.WECHAT_OPEN_APP_SECRET || "";
    const redirectBase =
      process.env.WECHAT_WEB_REDIRECT_URI ||
      `${(process.env.PUBLIC_API_ORIGIN || "http://127.0.0.1:8787").replace(/\/$/, "")}/api/auth/wechat-callback`;

    if (!appId || !secret) {
      return ok(
        res,
        {
          configured: false,
          qrUrl: null,
          state: null,
          message: "未配置 WECHAT_WEB_APP_ID / WECHAT_WEB_APP_SECRET（及可选 WECHAT_WEB_REDIRECT_URI）",
        },
        "微信登录未配置",
      );
    }

    const state = crypto.randomBytes(16).toString("hex");
    wechatQrStates.set(state, { exp: Date.now() + 10 * 60 * 1000, done: false });

    const redirectUri = encodeURIComponent(redirectBase);
    const qrUrl = `https://open.weixin.qq.com/connect/qrconnect?appid=${encodeURIComponent(appId)}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_login&state=${state}#wechat_redirect`;

    return ok(res, { configured: true, qrUrl, state }, "ok");
  } catch (e) {
    console.error("[auth/wechat-qr-url]", e);
    return fail(res, 500, e instanceof Error ? e.message : "服务器错误");
  }
});

router.get("/wechat-scan", (req, res) => {
  const state = String(req.query.state || "");
  const row = wechatQrStates.get(state);
  if (!row) {
    return fail(res, 404, "无效的 state 或已过期");
  }
  if (Date.now() > row.exp) {
    wechatQrStates.delete(state);
    return fail(res, 410, "二维码已过期，请刷新重试");
  }
  if (!row.done) {
    return ok(res, { status: "waiting" }, "等待扫码");
  }
  const token = signSitePayload({
    typ: "site",
    sub: "wechat",
    openid: row.openid,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });
  wechatQrStates.delete(state);
  return ok(res, { status: "done", wechatOpenId: row.openid, token }, "登录成功");
});

router.get("/wechat-callback", async (req, res) => {
  const code = req.query.code;
  const state = String(req.query.state || "");
  const row = wechatQrStates.get(state);
  const front = (process.env.FRONTEND_PUBLIC_URL || "http://localhost:5173").replace(/\/$/, "");

  if (!row || Date.now() > row.exp) {
    return res.status(400).send("无效或已过期的 state");
  }

  const appId = process.env.WECHAT_WEB_APP_ID || process.env.WECHAT_OPEN_APP_ID || "";
  const secret = process.env.WECHAT_WEB_APP_SECRET || process.env.WECHAT_OPEN_APP_SECRET || "";
  if (!code || !appId || !secret) {
    return res.status(400).send("缺少 code 或微信未配置");
  }

  try {
    const tokenUrl = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${encodeURIComponent(appId)}&secret=${encodeURIComponent(secret)}&code=${encodeURIComponent(code)}&grant_type=authorization_code`;
    const tr = await fetch(tokenUrl);
    const j = await tr.json();
    if (!j || !j.openid) {
      console.error("[wechat-callback] token response", j);
      return res.status(400).send(`微信授权失败：${j.errmsg || "无 openid"}`);
    }
    const openid = j.openid;

    let user = db.prepare("SELECT * FROM site_users WHERE wechat_openid = ?").get(openid);
    if (!user) {
      const ins = db
        .prepare(
          `INSERT INTO site_users (wechat_openid, email_verified, updated_at)
           VALUES (?, 0, datetime('now','localtime'))`,
        )
        .run(openid);
      user = db.prepare("SELECT * FROM site_users WHERE id = ?").get(ins.lastInsertRowid);
    }

    row.openid = openid;
    row.done = true;

    return res.redirect(302, `${front}/?wechat_pending=1`);
  } catch (e) {
    console.error("[wechat-callback]", e);
    return res.status(500).send("服务器错误");
  }
});

router.post("/request-reset-code", async (req, res) => {
  try {
    const account = String(req.body?.account ?? "").trim();
    if (!account) {
      return fail(res, 400, "请输入手机号或邮箱");
    }
    const isPhone = /^1\d{10}$/.test(account);
    const em = normalizeEmail(account);
    const isEmail = Boolean(em && isValidEmail(em));
    if (!isPhone && !isEmail) {
      return fail(res, 400, "手机号或邮箱格式错误");
    }
    const accountKey = isPhone ? account : em;
    const ip = normalizeRateLimitIp(req);
    const byAccount = tryRecordResetRequest("account", accountKey, 3);
    if (!byAccount.ok) {
      return fail(res, 429, "操作过于频繁，请稍后再试");
    }
    const byIp = tryRecordResetRequest("ip", ip, 3);
    if (!byIp.ok) {
      return fail(res, 429, "当前 IP 请求过多，请稍后再试");
    }
    let user;
    if (isPhone) {
      user = db.prepare("SELECT id, phone FROM site_users WHERE phone = ?").get(account);
    } else {
      user = db.prepare("SELECT id, email FROM site_users WHERE email = ?").get(em);
    }
    if (!user) {
      return fail(res, 404, "该账号未注册");
    }
    const r = await issueAndDeliverResetCode(isPhone ? account : em, isPhone, user.id);
    if (!r.ok) {
      return res.status(r.status || 500).json({ success: false, data: null, message: r.message });
    }
    return ok(res, null, r.message || "验证码已发送");
  } catch (e) {
    console.error("[auth/request-reset-code]", e);
    return fail(res, 500, "发送失败");
  }
});

router.post("/reset-password", (req, res) => {
  try {
    const account = String(req.body?.account ?? "").trim();
    const code = String(req.body?.code ?? "").trim();
    const newPassword = String(req.body?.newPassword ?? "");
    const confirmPassword = String(req.body?.confirmPassword ?? "");
    if (!account || !code || !newPassword) {
      return fail(res, 400, "参数不完整");
    }
    if (newPassword !== confirmPassword) {
      return fail(res, 400, "两次输入的密码不一致");
    }
    if (newPassword.length < 6) {
      return fail(res, 400, "密码至少 6 位");
    }
    const isPhone = /^1\d{10}$/.test(account);
    const em = normalizeEmail(account);
    const isEmail = Boolean(em && isValidEmail(em));
    if (!isPhone && !isEmail) {
      return fail(res, 400, "手机号或邮箱格式错误");
    }
    const v = verifyResetCode(isPhone ? account : em, isPhone, code);
    if (!v.ok) {
      return fail(res, 400, v.message);
    }
    const hash = hashPassword(newPassword);
    if (isPhone) {
      db.prepare(
        `UPDATE site_users SET password_hash = ?, updated_at = datetime('now','localtime') WHERE id = ?`,
      ).run(hash, v.userId);
    } else {
      db.prepare(
        `UPDATE site_users SET password_hash = ?, updated_at = datetime('now','localtime') WHERE id = ?`,
      ).run(hash, v.userId);
    }
    consumeResetCode(isPhone ? account : em, isPhone);
    return ok(res, null, "密码已重置，请使用新密码登录");
  } catch (e) {
    console.error("[auth/reset-password]", e);
    return fail(res, 500, "重置失败");
  }
});

function apiOriginBase() {
  return (process.env.PUBLIC_API_ORIGIN || "http://127.0.0.1:8787").replace(/\/$/, "");
}

function frontendOriginBase() {
  return (process.env.FRONTEND_PUBLIC_URL || "http://localhost:5173").replace(/\/$/, "");
}

/** 供前端决定是否展示 OAuth 图标（不返回密钥） */
router.get("/oauth-config", (_req, res) => {
  const github = Boolean(
    String(process.env.GITHUB_CLIENT_ID || "").trim() &&
      String(process.env.GITHUB_CLIENT_SECRET || "").trim(),
  );
  const google = Boolean(
    String(process.env.GOOGLE_CLIENT_ID || "").trim() &&
      String(process.env.GOOGLE_CLIENT_SECRET || "").trim(),
  );
  return ok(res, { github, google }, "ok");
});

/** 当前登录用户已绑定的第三方（需 Bearer 站点 JWT） */
router.get("/oauth-links", requireSiteUser, (req, res) => {
  try {
    const row = db
      .prepare("SELECT github_id, google_sub, wechat_openid FROM site_users WHERE id = ?")
      .get(req.siteUserId);
    return ok(
      res,
      {
        github: Boolean(row?.github_id),
        google: Boolean(row?.google_sub),
        wechat: Boolean(row?.wechat_openid),
      },
      "ok",
    );
  } catch (e) {
    console.error("[auth/oauth-links]", e);
    return fail(res, 500, "加载失败");
  }
});

/**
 * 解绑第三方登录（需 Bearer 站点 JWT）
 * 解绑后须仍能通过：手机验证码、邮箱+密码、手机+密码、或其它未解绑的 OAuth 之一登录。
 */
router.post("/unlink-oauth", requireSiteUser, (req, res) => {
  try {
    const provider = String(req.body?.provider ?? "").toLowerCase();
    if (!["github", "google", "wechat"].includes(provider)) {
      return fail(res, 400, "不支持的平台");
    }
    const userId = req.siteUserId;
    const user = db
      .prepare(
        `SELECT id, password_hash, phone, email, github_id, google_sub, wechat_openid
         FROM site_users WHERE id = ?`,
      )
      .get(userId);
    if (!user) {
      return fail(res, 404, "用户不存在");
    }

    const fieldMap = { github: "github_id", google: "google_sub", wechat: "wechat_openid" };
    const col = fieldMap[provider];
    const bound =
      (provider === "github" && user.github_id) ||
      (provider === "google" && user.google_sub) ||
      (provider === "wechat" && user.wechat_openid);
    if (!bound) {
      return fail(res, 400, "当前未绑定该方式");
    }

    const afterGh = provider === "github" ? null : user.github_id;
    const afterGo = provider === "google" ? null : user.google_sub;
    const afterWx = provider === "wechat" ? null : user.wechat_openid;
    const hasOAuthRemaining = Boolean(afterGh || afterGo || afterWx);
    const hasPhone = Boolean(user.phone && String(user.phone).trim());
    const hasEmailPassword = Boolean(
      user.email && String(user.email).trim() && user.password_hash,
    );
    if (!hasOAuthRemaining && !hasPhone && !hasEmailPassword) {
      return fail(
        res,
        400,
        "无法解绑最后一个登录方式：请先设置登录密码（邮箱登录）或保留手机号/其它第三方后再试",
      );
    }

    db.prepare(`UPDATE site_users SET ${col} = NULL, updated_at = datetime('now','localtime') WHERE id = ?`).run(
      userId,
    );
    const label = provider === "github" ? "GitHub" : provider === "google" ? "Google" : "微信";
    return ok(res, null, `已解绑${label}`);
  } catch (e) {
    console.error("[auth/unlink-oauth]", e);
    return fail(res, 500, "解绑失败");
  }
});

async function exchangeGithubAccessToken(code, clientId, clientSecret, redirectUri) {
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: String(code),
      redirect_uri: redirectUri,
    }).toString(),
  });
  const tok = await tokenRes.json();
  const accessToken = tok?.access_token;
  if (!accessToken) return { accessToken: null, raw: tok };
  return { accessToken };
}

async function fetchGithubIdentityFromAccessToken(accessToken) {
  const userRes = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${accessToken}`, "User-Agent": "aike-site" },
  });
  const ghUser = await userRes.json();
  if (!ghUser || !ghUser.id) return null;
  const ghIdStr = String(ghUser.id);
  const emailsRes = await fetch("https://api.github.com/user/emails", {
    headers: { Authorization: `Bearer ${accessToken}`, "User-Agent": "aike-site" },
  });
  const emails = emailsRes.ok ? await emailsRes.json() : [];
  const primary =
    Array.isArray(emails) && emails.length
      ? emails.find((e) => e && e.primary && e.verified)?.email ||
        emails.find((e) => e && e.verified)?.email ||
        null
      : null;
  const email =
    primary ||
    (typeof ghUser.email === "string" && ghUser.email ? ghUser.email : null) ||
    `${String(ghUser.login || "user").replace(/[^a-zA-Z0-9_-]/g, "")}+${ghIdStr}@users.noreply.github.com`;
  const normEmail = normalizeEmail(email);
  return { ghIdStr, normEmail };
}

router.get("/github/url", (req, res) => {
  try {
    const clientId = String(process.env.GITHUB_CLIENT_ID || "").trim();
    if (!clientId) {
      return fail(res, 503, "GitHub OAuth 未配置（GITHUB_CLIENT_ID）");
    }
    const modeRaw = String(req.query.mode || "login").toLowerCase();
    const mode = modeRaw === "link" ? "link" : "login";
    let linkUserId = null;
    if (mode === "link") {
      const uid = resolveSiteUserId(db, req);
      if (!uid) {
        return fail(res, 401, "请先登录后再绑定");
      }
      linkUserId = uid;
    }
    const state = issueOAuthState(mode, linkUserId);
    const redirectUri =
      String(process.env.GITHUB_REDIRECT_URI || "").trim() ||
      `${apiOriginBase()}/api/auth/github/callback`;
    const u = new URL("https://github.com/login/oauth/authorize");
    u.searchParams.set("client_id", clientId);
    u.searchParams.set("redirect_uri", redirectUri);
    u.searchParams.set("scope", "read:user user:email");
    u.searchParams.set("state", state);
    return ok(res, { url: u.toString() }, "ok");
  } catch (e) {
    console.error("[auth/github/url]", e);
    return fail(res, 500, "服务器错误");
  }
});

router.get("/github/callback", async (req, res) => {
  const front = frontendOriginBase();
  const code = req.query.code;
  const stateKey = String(req.query.state ?? "");
  if (!code || !stateKey) {
    return res.redirect(302, `${front}/oauth-callback?error=github_missing_code`);
  }
  const st = consumeOAuthState(stateKey);
  if (!st) {
    return res.redirect(302, `${front}/profile?error=oauth_invalid_state`);
  }
  const clientId = String(process.env.GITHUB_CLIENT_ID || "").trim();
  const clientSecret = String(process.env.GITHUB_CLIENT_SECRET || "").trim();
  const redirectUri =
    String(process.env.GITHUB_REDIRECT_URI || "").trim() ||
    `${apiOriginBase()}/api/auth/github/callback`;
  if (!clientId || !clientSecret) {
    return res.redirect(302, `${front}/oauth-callback?error=github_not_configured`);
  }
  try {
    const ex = await exchangeGithubAccessToken(code, clientId, clientSecret, redirectUri);
    if (!ex.accessToken) {
      console.error("[github/callback] token", ex.raw);
      return res.redirect(302, `${front}/oauth-callback?error=github_token`);
    }
    const idf = await fetchGithubIdentityFromAccessToken(ex.accessToken);
    if (!idf) {
      return res.redirect(302, `${front}/oauth-callback?error=github_user`);
    }
    const { ghIdStr, normEmail } = idf;

    if (st.mode === "link") {
      const uid = st.userId;
      if (!uid) {
        return res.redirect(302, `${front}/profile?error=oauth_link_missing_user`);
      }
      const user = db.prepare("SELECT * FROM site_users WHERE id = ?").get(uid);
      if (!user) {
        return res.redirect(302, `${front}/profile?error=oauth_user_not_found`);
      }
      const taken = db.prepare("SELECT id FROM site_users WHERE github_id = ? AND id != ?").get(ghIdStr, uid);
      if (taken) {
        return res.redirect(302, `${front}/profile?error=oauth_already_linked`);
      }
      if (user.github_id && user.github_id !== ghIdStr) {
        return res.redirect(302, `${front}/profile?error=oauth_account_has_github`);
      }
      try {
        db.prepare(`UPDATE site_users SET github_id = ?, updated_at = datetime('now','localtime') WHERE id = ?`).run(
          ghIdStr,
          uid,
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("UNIQUE")) {
          return res.redirect(302, `${front}/profile?error=oauth_already_linked`);
        }
        throw e;
      }
      if (!user.email && normEmail) {
        try {
          db.prepare(`UPDATE site_users SET email = ?, updated_at = datetime('now','localtime') WHERE id = ?`).run(
            normEmail,
            uid,
          );
        } catch {
          /* ignore */
        }
      }
      return res.redirect(302, `${front}/profile?oauth_bind=github&success=1`);
    }

    let row = db.prepare("SELECT * FROM site_users WHERE github_id = ?").get(ghIdStr);
    if (!row) {
      row = db.prepare("SELECT * FROM site_users WHERE email = ?").get(normEmail);
    }
    if (!row) {
      try {
        const ins = db
          .prepare(
            `INSERT INTO site_users (email, github_id, email_verified, password_hash, updated_at)
             VALUES (?, ?, 1, NULL, datetime('now','localtime'))`,
          )
          .run(normEmail, ghIdStr);
        row = db.prepare("SELECT * FROM site_users WHERE id = ?").get(ins.lastInsertRowid);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("UNIQUE")) {
          row = db.prepare("SELECT * FROM site_users WHERE email = ?").get(normEmail);
        } else {
          throw e;
        }
      }
    }
    if (!row) {
      return res.redirect(302, `${front}/oauth-callback?error=github_create`);
    }
    if (!row.github_id) {
      db.prepare(`UPDATE site_users SET github_id = ?, updated_at = datetime('now','localtime') WHERE id = ?`).run(
        ghIdStr,
        row.id,
      );
    }
    if (!row.email && normEmail) {
      try {
        db.prepare(`UPDATE site_users SET email = ?, updated_at = datetime('now','localtime') WHERE id = ?`).run(
          normEmail,
          row.id,
        );
      } catch {
        /* ignore */
      }
    }
    row = db.prepare("SELECT * FROM site_users WHERE id = ?").get(row.id);

    const token = signSitePayload({
      typ: "site",
      sub: "github",
      github_id: ghIdStr,
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
    });
    return res.redirect(302, `${front}/oauth-callback?token=${encodeURIComponent(token)}`);
  } catch (e) {
    console.error("[auth/github/callback]", e);
    return res.redirect(302, `${front}/oauth-callback?error=github_exception`);
  }
});

router.get("/google/url", (req, res) => {
  try {
    const clientId = String(process.env.GOOGLE_CLIENT_ID || "").trim();
    if (!clientId) {
      return fail(res, 503, "Google OAuth 未配置（GOOGLE_CLIENT_ID）");
    }
    const modeRaw = String(req.query.mode || "login").toLowerCase();
    const mode = modeRaw === "link" ? "link" : "login";
    let linkUserId = null;
    if (mode === "link") {
      const uid = resolveSiteUserId(db, req);
      if (!uid) {
        return fail(res, 401, "请先登录后再绑定");
      }
      linkUserId = uid;
    }
    const state = issueOAuthState(mode, linkUserId);
    const redirectUri =
      String(process.env.GOOGLE_REDIRECT_URI || "").trim() ||
      `${apiOriginBase()}/api/auth/google/callback`;
    const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    u.searchParams.set("client_id", clientId);
    u.searchParams.set("redirect_uri", redirectUri);
    u.searchParams.set("response_type", "code");
    u.searchParams.set("scope", "openid email profile");
    u.searchParams.set("access_type", "online");
    u.searchParams.set("state", state);
    return ok(res, { url: u.toString() }, "ok");
  } catch (e) {
    console.error("[auth/google/url]", e);
    return fail(res, 500, "服务器错误");
  }
});

router.get("/google/callback", async (req, res) => {
  const front = frontendOriginBase();
  const code = req.query.code;
  const stateKey = String(req.query.state ?? "");
  if (!code || !stateKey) {
    return res.redirect(302, `${front}/oauth-callback?error=google_missing_code`);
  }
  const st = consumeOAuthState(stateKey);
  if (!st) {
    return res.redirect(302, `${front}/profile?error=oauth_invalid_state`);
  }
  const clientId = String(process.env.GOOGLE_CLIENT_ID || "").trim();
  const clientSecret = String(process.env.GOOGLE_CLIENT_SECRET || "").trim();
  const redirectUri =
    String(process.env.GOOGLE_REDIRECT_URI || "").trim() ||
    `${apiOriginBase()}/api/auth/google/callback`;
  if (!clientId || !clientSecret) {
    return res.redirect(302, `${front}/oauth-callback?error=google_not_configured`);
  }
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: String(code),
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });
    const tok = await tokenRes.json();
    const accessToken = tok?.access_token;
    if (!accessToken) {
      console.error("[google/callback] token", tok);
      return res.redirect(302, `${front}/oauth-callback?error=google_token`);
    }
    const ui = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const info = await ui.json();
    const sub = info?.sub ? String(info.sub) : "";
    const emailRaw = info?.email ? String(info.email) : "";
    if (!sub || !emailRaw) {
      return res.redirect(302, `${front}/oauth-callback?error=google_profile`);
    }
    const normEmail = normalizeEmail(emailRaw);

    if (st.mode === "link") {
      const uid = st.userId;
      if (!uid) {
        return res.redirect(302, `${front}/profile?error=oauth_link_missing_user`);
      }
      const user = db.prepare("SELECT * FROM site_users WHERE id = ?").get(uid);
      if (!user) {
        return res.redirect(302, `${front}/profile?error=oauth_user_not_found`);
      }
      const taken = db.prepare("SELECT id FROM site_users WHERE google_sub = ? AND id != ?").get(sub, uid);
      if (taken) {
        return res.redirect(302, `${front}/profile?error=oauth_already_linked`);
      }
      if (user.google_sub && user.google_sub !== sub) {
        return res.redirect(302, `${front}/profile?error=oauth_account_has_google`);
      }
      try {
        db.prepare(`UPDATE site_users SET google_sub = ?, updated_at = datetime('now','localtime') WHERE id = ?`).run(
          sub,
          uid,
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("UNIQUE")) {
          return res.redirect(302, `${front}/profile?error=oauth_already_linked`);
        }
        throw e;
      }
      if (!user.email && normEmail) {
        try {
          db.prepare(`UPDATE site_users SET email = ?, updated_at = datetime('now','localtime') WHERE id = ?`).run(
            normEmail,
            uid,
          );
        } catch {
          /* ignore */
        }
      }
      return res.redirect(302, `${front}/profile?oauth_bind=google&success=1`);
    }

    let row = db.prepare("SELECT * FROM site_users WHERE google_sub = ?").get(sub);
    if (!row) {
      row = db.prepare("SELECT * FROM site_users WHERE email = ?").get(normEmail);
    }
    if (!row) {
      try {
        const ins = db
          .prepare(
            `INSERT INTO site_users (email, google_sub, email_verified, password_hash, updated_at)
             VALUES (?, ?, 1, NULL, datetime('now','localtime'))`,
          )
          .run(normEmail, sub);
        row = db.prepare("SELECT * FROM site_users WHERE id = ?").get(ins.lastInsertRowid);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("UNIQUE")) {
          row = db.prepare("SELECT * FROM site_users WHERE email = ?").get(normEmail);
        } else {
          throw e;
        }
      }
    }
    if (!row) {
      return res.redirect(302, `${front}/oauth-callback?error=google_create`);
    }
    if (!row.google_sub) {
      db.prepare(`UPDATE site_users SET google_sub = ?, updated_at = datetime('now','localtime') WHERE id = ?`).run(
        sub,
        row.id,
      );
    }
    if (!row.email && normEmail) {
      try {
        db.prepare(`UPDATE site_users SET email = ?, updated_at = datetime('now','localtime') WHERE id = ?`).run(
          normEmail,
          row.id,
        );
      } catch {
        /* ignore */
      }
    }
    row = db.prepare("SELECT * FROM site_users WHERE id = ?").get(row.id);

    const token = signSitePayload({
      typ: "site",
      sub: "google",
      google_sub: sub,
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
    });
    return res.redirect(302, `${front}/oauth-callback?token=${encodeURIComponent(token)}`);
  } catch (e) {
    console.error("[auth/google/callback]", e);
    return res.redirect(302, `${front}/oauth-callback?error=google_exception`);
  }
});

/** 校验站点 JWT（邮箱 / 微信登录） */
router.get("/site-token", (req, res) => {
  const raw = String(req.query.token || "");
  const payload = verifySitePayload(raw);
  if (!payload || !payload.exp || Date.now() > payload.exp) {
    return fail(res, 401, "token 无效或已过期");
  }
  return ok(res, payload, "ok");
});

module.exports = router;
