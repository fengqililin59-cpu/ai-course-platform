"use strict";

const crypto = require("node:crypto");

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .scryptSync(String(plain), salt, 64, SCRYPT_PARAMS)
    .toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(plain, stored) {
  const s = String(stored || "");
  const i = s.indexOf(":");
  if (i <= 0) return false;
  const salt = s.slice(0, i);
  const want = s.slice(i + 1);
  if (!salt || !want) return false;
  const got = crypto
    .scryptSync(String(plain), salt, 64, SCRYPT_PARAMS)
    .toString("hex");
  if (want.length !== got.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(want, "hex"), Buffer.from(got, "hex"));
  } catch {
    return false;
  }
}

module.exports = { hashPassword, verifyPassword };
