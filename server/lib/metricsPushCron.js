"use strict";

const { schedule, validate } = require("node-cron");
const db = require("../db");
const { runDailyMetricsPush, envPushDisabled } = require("./metricsDailyPush");

/** @type {null | { stop: () => void }} */
let task = null;

function effectiveCronExpr() {
  const envDefault = String(process.env.METRICS_PUSH_CRON || "0 9 * * *").trim();
  try {
    const row = db.prepare(`SELECT cron_expr FROM admin_metrics_push_settings WHERE id = 1`).get();
    const fromDb = String(row?.cron_expr || "").trim();
    if (fromDb && validate(fromDb)) return fromDb;
  } catch {
    /* ignore */
  }
  return validate(envDefault) ? envDefault : "0 9 * * *";
}

function stopMetricsPushCron() {
  if (task) {
    task.stop();
    task = null;
  }
}

function startMetricsPushCron() {
  stopMetricsPushCron();
  if (envPushDisabled()) {
    console.log("[metrics-push] cron not started (METRICS_PUSH_ENABLED is off)");
    return;
  }
  const expr = effectiveCronExpr();
  const tz = String(process.env.METRICS_PUSH_TZ || "Asia/Shanghai").trim() || "Asia/Shanghai";
  task = schedule(
    expr,
    () => {
      void runDailyMetricsPush(db).then((r) => {
        if (!r.ok && r.message !== "skip: disabled" && r.message !== "skip: no webhook") {
          console.warn("[metrics-push] run:", r.message);
        }
      });
    },
    { timezone: tz },
  );
  console.log(`[metrics-push] cron scheduled: ${expr} (${tz})`);
}

function reloadMetricsPushCron() {
  if (envPushDisabled()) {
    stopMetricsPushCron();
    console.log("[metrics-push] cron stopped (METRICS_PUSH_ENABLED is off)");
    return;
  }
  startMetricsPushCron();
}

module.exports = {
  startMetricsPushCron,
  stopMetricsPushCron,
  reloadMetricsPushCron,
  effectiveCronExpr,
};
