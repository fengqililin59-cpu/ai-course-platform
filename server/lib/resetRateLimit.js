"use strict";

/** 滑动窗口：每小时最多 N 次（内存；多实例请换 Redis） */
const WINDOW_MS = 60 * 60 * 1000;
const DEFAULT_LIMIT = 3;

/** @type {Map<string, number[]>} */
const resetRequestLog = new Map();

/**
 * @param {string} type
 * @param {string} identifier
 * @param {number} [limit]
 * @returns {{ ok: true } | { ok: false, reason: "ip" | "account" }}
 */
function tryRecordResetRequest(type, identifier, limit = DEFAULT_LIMIT) {
  const id = String(identifier ?? "").trim();
  if (!id) {
    return { ok: false, reason: type === "ip" ? "ip" : "account" };
  }
  const key = `${type}:${id}`;
  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  let stamps = resetRequestLog.get(key) || [];
  stamps = stamps.filter((ts) => ts > cutoff);
  if (stamps.length >= limit) {
    resetRequestLog.set(key, stamps);
    return { ok: false, reason: type === "ip" ? "ip" : "account" };
  }
  stamps.push(now);
  resetRequestLog.set(key, stamps);
  return { ok: true };
}

/**
 * 取客户端 IP（优先 X-Forwarded-For 第一段；注意信任代理链）
 * @param {import("express").Request} req
 */
function normalizeRateLimitIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.trim()) {
    return xff.split(",")[0].trim();
  }
  const raw = req.socket?.remoteAddress || req.ip || "";
  return String(raw).replace(/^::ffff:/, "");
}

module.exports = {
  tryRecordResetRequest,
  normalizeRateLimitIp,
  WINDOW_MS,
  DEFAULT_LIMIT,
};
