"use strict";

const express = require("express");
const db = require("../db");
const { resolveSiteUserId } = require("../lib/siteJwt");

const router = express.Router();

function ok(res, data = null, message = "ok", status = 200) {
  return res.status(status).json({ success: true, data, message });
}

function fail(res, status, message) {
  return res.status(status).json({ success: false, data: null, message });
}

function apiOriginBase() {
  return (process.env.PUBLIC_API_ORIGIN || "http://127.0.0.1:8787").replace(/\/$/, "");
}

/** @param {unknown} u @returns {string | null} */
function safeTargetUrl(u) {
  const s = String(u ?? "").trim();
  if (!s || s.length > 4096) return null;
  if (!/^https?:\/\//i.test(s)) return null;
  if (/^\s*javascript:/i.test(s)) return null;
  return s;
}

function randomShortCode(len = 7) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < len; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

/** 生成短链（可选 Bearer 记录创建者 site_users.id） */
router.post("/create", (req, res) => {
  try {
    const targetUrl = safeTargetUrl(req.body?.targetUrl);
    if (!targetUrl) {
      return fail(res, 400, "请提供有效的 http(s) 目标地址");
    }
    const titleRaw = String(req.body?.title ?? "").trim();
    const title = titleRaw ? titleRaw.slice(0, 200) : null;
    const userId = resolveSiteUserId(db, req);

    for (let attempt = 0; attempt < 16; attempt += 1) {
      const shortCode = randomShortCode(7);
      try {
        db.prepare(
          `INSERT INTO share_links (short_code, target_url, title, user_id)
           VALUES (?, ?, ?, ?)`,
        ).run(shortCode, targetUrl, title, userId || null);
        const shortUrl = `${apiOriginBase()}/s/${shortCode}`;
        return ok(res, { shortUrl, shortCode }, "ok");
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes("UNIQUE")) {
          console.error("[share/create]", e);
          return fail(res, 500, "生成失败");
        }
      }
    }
    return fail(res, 500, "生成失败，请重试");
  } catch (e) {
    console.error("[share/create]", e);
    return fail(res, 500, "服务器错误");
  }
});

module.exports = router;
