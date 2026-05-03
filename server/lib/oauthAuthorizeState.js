"use strict";

const crypto = require("node:crypto");

/** @type {Map<string, { mode: 'login' | 'link'; userId: number | null; exp: number }>} */
const oauthAuthorizeStates = new Map();

const TTL_MS = 10 * 60 * 1000;

function pruneExpiredStates() {
  const now = Date.now();
  for (const [k, v] of oauthAuthorizeStates.entries()) {
    if (v.exp < now) oauthAuthorizeStates.delete(k);
  }
}

/**
 * @param {'login' | 'link'} mode
 * @param {number | null} userId site_users.id when mode==='link'
 */
function issueOAuthState(mode, userId) {
  pruneExpiredStates();
  const key = crypto.randomBytes(24).toString("base64url");
  oauthAuthorizeStates.set(key, {
    mode: mode === "link" ? "link" : "login",
    userId: mode === "link" && userId ? Number(userId) : null,
    exp: Date.now() + TTL_MS,
  });
  return key;
}

/**
 * 单次有效：取出后即删除
 * @returns {{ mode: 'login' | 'link'; userId: number | null } | null}
 */
function consumeOAuthState(stateKey) {
  pruneExpiredStates();
  const key = String(stateKey || "").trim();
  if (!key) return null;
  const s = oauthAuthorizeStates.get(key);
  if (!s || Date.now() > s.exp) {
    oauthAuthorizeStates.delete(key);
    return null;
  }
  oauthAuthorizeStates.delete(key);
  return { mode: s.mode, userId: s.userId };
}

module.exports = { issueOAuthState, consumeOAuthState };
