#!/usr/bin/env node
"use strict";

/**
 * 分销提现审核 CLI（避免直接 sqlite3 改库）。
 *
 * 用法（在 server 目录）：
 *   npm run withdraw:list
 *   npm run withdraw:approve -- <id>
 *   npm run withdraw:reject -- <id>
 *   npm run withdraw:paid -- <id>
 *
 * 可选：--operator 姓名（任意位置），写入审计 actor，便于多人共用服务器区分管理员。
 * 例：node scripts/withdraw-cli.js --operator zhangsan approve 12
 */

const path = require("node:path");
const readline = require("node:readline");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const db = require("../db");
const { logWithdrawAudit, listRecentWithdrawAudits } = require("../lib/withdrawAudit");

const STATUS = {
  pending: "pending",
  approved: "approved",
  rejected: "rejected",
  paid: "paid",
};

function trunc(s, max) {
  const t = String(s ?? "");
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function printRows(rows) {
  if (!rows.length) {
    console.log("(无记录)");
    return;
  }
  for (const r of rows) {
    console.log(
      [
        `id=${r.id}`,
        `phone=${r.distributor_phone}`,
        `amount=${r.amount}`,
        `alipay=${r.alipay_account ?? "-"}`,
        `status=${r.status}`,
        `at=${r.created_at}`,
        r.commission_ids ? `comm=${trunc(r.commission_ids, 40)}` : "",
      ]
        .filter(Boolean)
        .join("  "),
    );
  }
}

function listPending() {
  const rows = db
    .prepare(
      `
    SELECT id, distributor_phone, amount, alipay_account, commission_ids, status, created_at
    FROM distribution_withdrawals
    WHERE status = 'pending'
    ORDER BY id DESC
  `,
    )
    .all();
  console.log("--- 待审核提现 ---");
  printRows(rows);
}

function listAllRecent() {
  const rows = db
    .prepare(
      `
    SELECT id, distributor_phone, amount, alipay_account, commission_ids, status, created_at
    FROM distribution_withdrawals
    ORDER BY id DESC
    LIMIT 30
  `,
    )
    .all();
  console.log("--- 最近 30 条提现 ---");
  printRows(rows);
}

function printAudits(jsonOutput) {
  const rows = listRecentWithdrawAudits(50);
  if (!rows.length) {
    console.log(jsonOutput ? "[]" : "(无审计记录)");
    return;
  }
  if (jsonOutput) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }
  console.log("--- 最近 50 条提现审计 ---");
  const wId = 5;
  const wWd = 5;
  const wAct = 28;
  const wActor = 14;
  const wAt = 19;
  const wDetail = 48;
  const head = `${"id".padEnd(wId)} ${"wd".padEnd(wWd)} ${"action".padEnd(wAct)} ${"actor".padEnd(wActor)} ${"created_at".padEnd(wAt)} detail`;
  console.log(head);
  console.log("-".repeat(Math.min(120, head.length + wDetail)));
  for (const r of rows) {
    const line = `${String(r.id).padEnd(wId)} ${String(r.withdrawal_id ?? "-").padEnd(wWd)} ${trunc(r.action, wAct).padEnd(wAct)} ${trunc(r.actor ?? "-", wActor).padEnd(wActor)} ${trunc(r.created_at ?? "", wAt).padEnd(wAt)} ${trunc(r.detail ?? "", wDetail)}`;
    console.log(line);
  }
}

/** 解析 --operator / --json，并从 argv 中剔除 */
function parseCliArgv(argv) {
  const tokens = argv.slice(2);
  let operator = null;
  let jsonOutput = false;
  const filtered = [];
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] === "--json") {
      jsonOutput = true;
      continue;
    }
    if (tokens[i] === "--operator") {
      const next = tokens[i + 1];
      if (
        next == null ||
        String(next).trim() === "" ||
        String(next).startsWith("-")
      ) {
        console.error(
          "错误：--operator 后必须跟非空操作者名称，且不能以 - 开头。",
        );
        process.exit(1);
      }
      operator = String(next).trim();
      i += 1;
      continue;
    }
    filtered.push(tokens[i]);
  }
  return {
    operator: operator || null,
    jsonOutput,
    cmd: filtered[0],
    id: filtered[1],
  };
}

function confirm(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(String(answer).trim().toLowerCase() === "y");
    });
  });
}

async function updateStatus(id, next, requireConfirm, actorOverride) {
  const n = Math.floor(Number(id));
  if (!Number.isFinite(n) || n < 1) {
    console.error("请提供有效数字 id");
    process.exit(1);
  }
  const row = db
    .prepare(
      `SELECT id, distributor_phone, amount, status FROM distribution_withdrawals WHERE id = ?`,
    )
    .get(n);
  if (!row) {
    console.error("记录不存在:", n);
    process.exit(1);
  }
  if (requireConfirm) {
    const ok = await confirm(
      `将 id=${n} 从 ${row.status} 改为 ${next}，金额 ¥${row.amount}，确认输入 y：`,
    );
    if (!ok) {
      console.log("已取消");
      process.exit(0);
    }
  }
  const info = db
    .prepare(
      `UPDATE distribution_withdrawals SET status = ? WHERE id = ? AND status = ?`,
    )
    .run(next, n, STATUS.pending);
  if (info.changes === 0) {
    console.error("未更新：仅允许从 pending 变更，或 id 不匹配");
    process.exit(1);
  }
  logWithdrawAudit({
    withdrawalId: n,
    action: next === STATUS.approved ? "cli_approve" : "cli_reject",
    detail: `from=pending phone=${row.distributor_phone} amount=${row.amount}`,
    actorOverride: actorOverride || undefined,
  });
  console.log("已更新 id=%s -> %s", n, next);
}

async function markPaid(id, actorOverride) {
  const n = Math.floor(Number(id));
  if (!Number.isFinite(n) || n < 1) {
    console.error("请提供有效数字 id");
    process.exit(1);
  }
  const row = db
    .prepare(
      `SELECT id, distributor_phone, amount, status FROM distribution_withdrawals WHERE id = ?`,
    )
    .get(n);
  if (!row) {
    console.error("记录不存在:", n);
    process.exit(1);
  }
  if (row.status !== STATUS.approved) {
    console.error("仅允许将「已通过」标记为已打款，当前状态:", row.status);
    process.exit(1);
  }
  const ok = await confirm(
    `确认已完成线下打款 id=${n} ¥${row.amount} -> paid？输入 y：`,
  );
  if (!ok) {
    console.log("已取消");
    process.exit(0);
  }
  db.prepare(`UPDATE distribution_withdrawals SET status = ? WHERE id = ?`).run(
    STATUS.paid,
    n,
  );
  logWithdrawAudit({
    withdrawalId: n,
    action: "cli_mark_paid",
    detail: `phone=${row.distributor_phone} amount=${row.amount}`,
    actorOverride: actorOverride || undefined,
  });
  console.log("已标记 id=%s 为 paid", n);
}

function assertCliAuthorized() {
  const secret = process.env.ADMIN_WITHDRAW_CLI_SECRET;
  if (!secret) return;
  if (process.env.ADMIN_WITHDRAW_CLI_SECRET_CHECK === "0") return;
  if (process.env.ADMIN_WITHDRAW_CLI_TOKEN !== secret) {
    console.error(
      "已设置 ADMIN_WITHDRAW_CLI_SECRET：请在同一 shell 先执行 export ADMIN_WITHDRAW_CLI_TOKEN=<与密钥相同>，或设置 ADMIN_WITHDRAW_CLI_SECRET_CHECK=0 关闭校验（仅内网）。",
    );
    process.exit(1);
  }
}

async function main() {
  assertCliAuthorized();
  const { operator, jsonOutput, cmd, id } = parseCliArgv(process.argv);

  switch (cmd) {
    case "list":
      listPending();
      break;
    case "list-all":
      listAllRecent();
      break;
    case "audit":
      printAudits(jsonOutput);
      break;
    case "approve":
      await updateStatus(id, STATUS.approved, true, operator);
      break;
    case "reject":
      await updateStatus(id, STATUS.rejected, true, operator);
      break;
    case "paid":
      await markPaid(id, operator);
      break;
    default:
      console.log(`用法:
  node scripts/withdraw-cli.js list
  node scripts/withdraw-cli.js list-all
  node scripts/withdraw-cli.js audit [--json]
  node scripts/withdraw-cli.js [--operator 姓名] approve <id>
  node scripts/withdraw-cli.js [--operator 姓名] reject <id>
  node scripts/withdraw-cli.js [--operator 姓名] paid <id>
若配置了 ADMIN_WITHDRAW_CLI_SECRET，请先 export ADMIN_WITHDRAW_CLI_TOKEN 为相同值，或设 ADMIN_WITHDRAW_CLI_SECRET_CHECK=0。
审计表：distribution_withdrawal_audits；--operator 优先于环境变量 ADMIN_WITHDRAW_OPERATOR。
请将子命令写在 --operator 之前，例如：approve --operator zhangsan 9（勿写 --operator approve，否则 approve 会被当成操作员名）。`);
      process.exit(cmd ? 1 : 0);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
