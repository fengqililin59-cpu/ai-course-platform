"use strict";

/**
 * 评价等场景展示用昵称：脱敏 phone / email，避免暴露完整隐私。
 * @param {string | null | undefined} phone
 * @param {string | null | undefined} email
 * @returns {string}
 */
function maskSiteUserDisplay(phone, email) {
  const p = phone != null ? String(phone).trim() : "";
  const e = email != null ? String(email).trim() : "";
  if (p && /^1\d{10}$/.test(p)) {
    return `${p.slice(0, 3)}****${p.slice(-4)}`;
  }
  if (p && (p.startsWith("wx:") || p.startsWith("gh:") || p.startsWith("google:") || p.startsWith("mail:"))) {
    if (p.length <= 10) return `${p.slice(0, 4)}…`;
    return `${p.slice(0, 6)}…${p.slice(-3)}`;
  }
  if (e && e.includes("@")) {
    const at = e.indexOf("@");
    const local = at > 0 ? e.slice(0, at) : e;
    const domain = at > 0 ? e.slice(at) : "";
    if (local.length <= 2) return `*${domain}`;
    return `${local[0]}***${local.slice(-1)}${domain}`;
  }
  if (p) return p.length > 8 ? `${p.slice(0, 4)}…${p.slice(-2)}` : "用户";
  if (e) return e.length > 10 ? `${e.slice(0, 3)}…` : e;
  return "用户";
}

module.exports = { maskSiteUserDisplay };
