"use strict";

const express = require("express");
const db = require("../db");

const router = express.Router();

const MAX_NAME = 120;
const MAX_CONTACT = 200;
const MAX_TYPE = 80;
const MAX_BUDGET = 80;
const MAX_DESC = 8000;

/** POST /api/contact/ai-vision */
router.post("/ai-vision", (req, res) => {
  const name = String(req.body?.name ?? "").trim();
  const contact = String(req.body?.contact ?? "").trim();
  const serviceType = String(req.body?.serviceType ?? "").trim() || null;
  const budgetRange = String(req.body?.budgetRange ?? "").trim() || null;
  const description = String(req.body?.description ?? "").trim();

  if (!name || !contact || !description) {
    return res.status(400).json({
      success: false,
      message: "请填写姓名、联系方式及需求描述",
    });
  }
  if (name.length > MAX_NAME || contact.length > MAX_CONTACT) {
    return res.status(400).json({ success: false, message: "姓名或联系方式过长" });
  }
  if (description.length > MAX_DESC) {
    return res.status(400).json({ success: false, message: "需求描述过长" });
  }
  if (serviceType && serviceType.length > MAX_TYPE) {
    return res.status(400).json({ success: false, message: "服务类型无效" });
  }
  if (budgetRange && budgetRange.length > MAX_BUDGET) {
    return res.status(400).json({ success: false, message: "预算范围无效" });
  }

  try {
    db.prepare(
      `
      INSERT INTO vision_consultations (name, contact, service_type, budget_range, description)
      VALUES (?, ?, ?, ?, ?)
    `,
    ).run(name, contact, serviceType, budgetRange, description);
    return res.json({
      success: true,
      message: "提交成功，我们将在 24 小时内联系您",
    });
  } catch (err) {
    console.error("[VisionConsult]", err);
    return res.status(500).json({
      success: false,
      message: "服务器错误，请稍后重试",
    });
  }
});

module.exports = router;
