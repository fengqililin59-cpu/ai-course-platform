#!/usr/bin/env node
"use strict";

/**
 * 定时拉取各关键词岗位数并写入 jobs_hot_skills_snapshot，供 GET /api/jobs/hot-skills 使用。
 *
 * 用法（在 server 目录）：
 *   npm run jobs:refresh-hot-skills
 *
 * 建议 crontab（每天 2:00，路径按部署调整）：
 *   0 2 * * * cd /path/to/Aike/server && npm run jobs:refresh-hot-skills >> /var/log/aike-hot-skills.log 2>&1
 */

const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const db = require("../db");
const { refreshHotSkillsSnapshot } = require("../lib/jobsHotSkillsSnapshot");

async function main() {
  const n = await refreshHotSkillsSnapshot(db);
  console.log(`[jobs-hot-skills] refreshed ${n} keywords`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
