"use strict";

const crypto = require("node:crypto");

const SITE_JWT_SECRET =
  process.env.SITE_JWT_SECRET || process.env.CREATOR_JWT_SECRET || "aike-site-auth-2026";

function signSitePayload(payload) {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", SITE_JWT_SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifySitePayload(token) {
  const [body, sig] = String(token || "").split(".");
  if (!body || !sig) return null;
  const expected = crypto.createHmac("sha256", SITE_JWT_SECRET).update(body).digest("base64url");
  if (sig !== expected) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

/**
 * 从站点 Bearer token 解析 site_users.id（邮箱 / 微信 / 手机号登录）。
 * @param {import("better-sqlite3").Database} db
 * @param {import("express").Request} req
 * @returns {number | null}
 */
function resolveSiteUserId(db, req) {
  const auth = String(req.headers.authorization || "");
  if (!auth.toLowerCase().startsWith("bearer ")) return null;
  const token = auth.slice(7).trim();
  const payload = verifySitePayload(token);
  if (!payload || payload.typ !== "site" || !payload.exp || Date.now() > payload.exp) return null;
  if (payload.email) {
    const row = db.prepare("SELECT id FROM site_users WHERE email = ?").get(String(payload.email).trim());
    return row?.id ?? null;
  }
  if (payload.openid) {
    const row = db
      .prepare("SELECT id FROM site_users WHERE wechat_openid = ?")
      .get(String(payload.openid).trim());
    return row?.id ?? null;
  }
  if (payload.phone) {
    const row = db.prepare("SELECT id FROM site_users WHERE phone = ?").get(String(payload.phone).trim());
    return row?.id ?? null;
  }
  if (payload.github_id) {
    const row = db
      .prepare("SELECT id FROM site_users WHERE github_id = ?")
      .get(String(payload.github_id).trim());
    return row?.id ?? null;
  }
  if (payload.google_sub) {
    const row = db
      .prepare("SELECT id FROM site_users WHERE google_sub = ?")
      .get(String(payload.google_sub).trim());
    return row?.id ?? null;
  }
  return null;
}

module.exports = {
  SITE_JWT_SECRET,
  signSitePayload,
  verifySitePayload,
  resolveSiteUserId,
};
