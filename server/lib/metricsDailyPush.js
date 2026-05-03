"use strict";

const axios = require("axios");
const { decryptWebhookUrl } = require("./metricsWebhookCrypto");
const { getDashboardMetrics } = require("./metricsDashboardQuery");

function envPushDisabled() {
  const env = String(process.env.METRICS_PUSH_ENABLED ?? "true").trim().toLowerCase();
  return env === "0" || env === "false" || env === "off";
}

function pickWebhookUrl(db) {
  const ding = String(process.env.DINGTALK_WEBHOOK_URL || "").trim();
  const wx = String(process.env.WECHAT_WEBHOOK_URL || "").trim();
  if (ding) return ding;
  if (wx) return wx;
  const row = db.prepare(`SELECT webhook_cipher FROM admin_metrics_push_settings WHERE id = 1`).get();
  if (row?.webhook_cipher) {
    const dec = decryptWebhookUrl(row.webhook_cipher);
    if (dec) return dec;
  }
  return "";
}

function detectKind(url) {
  const u = String(url).toLowerCase();
  if (u.includes("dingtalk") || u.includes("oapi.dingtalk.com")) return "dingtalk";
  return "wecom";
}

function formatYuan(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "0.00";
  return x.toFixed(2);
}

function buildMarkdown(payload) {
  const { yesterday, total, last7Days, meta } = payload;
  const d = meta?.yesterdayDate || "昨日";
  return [
    `### 智学 AI 核心指标（${d}）`,
    "",
    `- 昨日新增用户 **${yesterday.newUsers}** 人（总用户 **${total.users}** 人）`,
    `- 昨日订单总额 **¥${formatYuan(yesterday.orderRevenue)}**（**${yesterday.orderCount}** 单）`,
    `- 昨日平台收入 **¥${formatYuan(yesterday.platformRevenue)}**`,
    `- 昨日分销佣金 **¥${formatYuan(yesterday.commissionPaid)}**`,
    `- 昨日定制服务咨询 **${yesterday.visionCount}** 条`,
    `- 昨日就业雷达搜索 **${yesterday.jobsSearchCount}** 次`,
    `- 近7天课程完课人数 **${last7Days.courseCompleters}** 人`,
  ].join("\n");
}

function isPushGloballyEnabled(db) {
  if (envPushDisabled()) return false;
  const row = db.prepare(`SELECT enabled FROM admin_metrics_push_settings WHERE id = 1`).get();
  return Boolean(row?.enabled);
}

/**
 * @param {import('better-sqlite3').Database} db
 * @returns {Promise<{ ok: boolean, message: string }>}
 */
async function runDailyMetricsPush(db) {
  if (!isPushGloballyEnabled(db)) {
    return { ok: false, message: "skip: disabled" };
  }
  const url = pickWebhookUrl(db);
  if (!url) {
    console.warn("[metrics-push] no webhook (env or DB)");
    return { ok: false, message: "skip: no webhook" };
  }
  const payload = getDashboardMetrics(db);
  const md = buildMarkdown(payload);
  try {
    const res = await axios.post(
      url,
      detectKind(url) === "dingtalk"
        ? { msgtype: "markdown", markdown: { title: "核心指标日报", text: md } }
        : { msgtype: "markdown", markdown: { content: md } },
      { timeout: 15_000, headers: { "Content-Type": "application/json" }, validateStatus: () => true },
    );
    if (res.status < 200 || res.status >= 300) {
      console.error("[metrics-push] http", res.status, String(res.data).slice(0, 200));
      return { ok: false, message: `http ${res.status}` };
    }
    const body = res.data;
    if (body && typeof body === "object" && "errcode" in body && Number(body.errcode) !== 0) {
      console.error("[metrics-push] vendor err", body);
      return { ok: false, message: String(body.errmsg || body.errcode || "vendor error") };
    }
    console.log("[metrics-push] sent ok");
    return { ok: true, message: "sent" };
  } catch (e) {
    console.error("[metrics-push]", e);
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

module.exports = {
  pickWebhookUrl,
  runDailyMetricsPush,
  buildMarkdown,
  isPushGloballyEnabled,
  envPushDisabled,
};
