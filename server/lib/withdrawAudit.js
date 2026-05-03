"use strict";

const os = require("node:os");
const db = require("../db");

/**
 * @param {{ withdrawalId?: number | null; action: string; detail?: string | null; actor?: string | null; actorOverride?: string | null }} p
 */
function logWithdrawAudit(p) {
  const override =
    p.actorOverride != null && String(p.actorOverride).trim()
      ? String(p.actorOverride).trim()
      : null;
  const actor =
    override ||
    p.actor ||
    process.env.ADMIN_WITHDRAW_OPERATOR ||
    process.env.USER ||
    os.userInfo().username ||
    "unknown";
  db.prepare(
    `
    INSERT INTO distribution_withdrawal_audits (withdrawal_id, action, actor, detail)
    VALUES (?, ?, ?, ?)
  `,
  ).run(
    p.withdrawalId != null ? Math.floor(Number(p.withdrawalId)) : null,
    String(p.action),
    String(actor),
    p.detail != null ? String(p.detail) : null,
  );
}

function listRecentWithdrawAudits(limit = 50) {
  const n = Math.min(200, Math.max(1, Math.floor(Number(limit)) || 50));
  return db
    .prepare(
      `
    SELECT id, withdrawal_id, action, actor, detail, created_at
    FROM distribution_withdrawal_audits
    ORDER BY id DESC
    LIMIT ?
  `,
    )
    .all(n);
}

module.exports = { logWithdrawAudit, listRecentWithdrawAudits };
