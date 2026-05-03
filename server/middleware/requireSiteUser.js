"use strict";

const db = require("../db");
const { resolveSiteUserId } = require("../lib/siteJwt");

function requireSiteUser(req, res, next) {
  const id = resolveSiteUserId(db, req);
  if (!id) {
    return res.status(401).json({ success: false, message: "请先登录" });
  }
  req.siteUserId = id;
  next();
}

module.exports = { requireSiteUser };
