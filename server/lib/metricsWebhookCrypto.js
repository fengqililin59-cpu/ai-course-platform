"use strict";

const crypto = require("node:crypto");

const ALGO = "aes-256-gcm";

function deriveKey() {
  const raw = String(
    process.env.METRICS_WEBHOOK_SECRET || process.env.ADMIN_PASSWORD || "metrics-webhook-fallback",
  );
  return crypto.createHash("sha256").update(raw, "utf8").digest();
}

/**
 * @param {string} url
 * @returns {string} base64(iv+tag+ciphertext)
 */
function encryptWebhookUrl(url) {
  const u = String(url ?? "").trim();
  if (!u) return "";
  const key = deriveKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(u, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

/**
 * @param {string} b64
 * @returns {string | null}
 */
function decryptWebhookUrl(b64) {
  const s = String(b64 ?? "").trim();
  if (!s) return null;
  try {
    const buf = Buffer.from(s, "base64");
    if (buf.length < 28) return null;
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const data = buf.subarray(28);
    const key = deriveKey();
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    const out = Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
    return out.trim() || null;
  } catch {
    return null;
  }
}

module.exports = { encryptWebhookUrl, decryptWebhookUrl };
