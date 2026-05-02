"use strict";

const express = require("express");

const router = express.Router();

const SYSTEM_PROMPT =
  "你是一位专业的AI职业规划顾问，拥有丰富的AI行业就业和创业经验。\n" +
  "请根据用户的背景信息，生成一份详细的个性化AI学习路径规划报告。\n" +
  "报告必须实用、具体、有数据支撑，避免空话套话。\n" +
  "使用中文回复，格式用清晰的段落，适当使用emoji增加可读性。";

function buildUserMessage(identity, goal, studyTime) {
  return (
    "请为我生成AI学习路径规划报告。\n" +
    "我的情况：\n" +
    `- 身份：${identity}\n` +
    `- 主要目标：${goal}\n` +
    `- 每天学习时间：${studyTime}\n\n` +
    "请包含以下内容：\n" +
    "1. 🎯 适合我的3条AI变现/就业路径（每条说明月收入范围）\n" +
    "2. 📚 推荐学习顺序（第1-3个月分别学什么）\n" +
    "3. ⚠️ 我这类人最容易踩的3个坑\n" +
    "4. 💰 预计6个月后能达到什么收入水平\n" +
    "5. 🚀 立即可以开始的第一步行动"
  );
}

router.post("/claude-report", async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || String(apiKey).trim() === "") {
    return res.status(503).json({
      ok: false,
      code: "NO_KEY",
      message: "Anthropic API 未配置",
    });
  }

  const identity = String(req.body?.identity ?? "").trim() || "（未填写）";
  const goal = String(req.body?.goal ?? "").trim() || "（未填写）";
  const studyTime = String(req.body?.studyTime ?? "").trim() || "（未填写）";

  const userMessage = buildUserMessage(identity, goal, studyTime);

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    const raw = await r.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return res.status(502).json({
        ok: false,
        code: "BAD_RESPONSE",
        message: "AI 服务返回异常",
      });
    }

    if (!r.ok) {
      const msg =
        (data && (data.error?.message || data.message)) || raw.slice(0, 200);
      return res.status(r.status >= 400 ? r.status : 502).json({
        ok: false,
        code: "ANTHROPIC_ERROR",
        message: msg || "Anthropic API 错误",
      });
    }

    const text =
      data?.content?.[0]?.type === "text" ? data.content[0].text : null;
    if (!text || typeof text !== "string") {
      return res.status(502).json({
        ok: false,
        code: "EMPTY",
        message: "未收到有效正文",
      });
    }

    return res.json({ ok: true, text });
  } catch (e) {
    console.error("[jobs-analysis]", e);
    return res.status(502).json({
      ok: false,
      code: "FETCH_FAILED",
      message: e?.message || "网络错误",
    });
  }
});

module.exports = router;
