"use strict";

const { fetchJobsSearchResult } = require("./jobsSearchUpstream");

/** 定时任务逐条搜索的关键词（≥2 字）与展示名 */
const HOT_SKILL_TARGETS = [
  { keyword: "提示词工程", displayName: "ChatGPT/提示词工程", sortOrder: 1 },
  { keyword: "Python AI", displayName: "Python+AI开发", sortOrder: 2 },
  { keyword: "Midjourney", displayName: "Midjourney/AI绘图", sortOrder: 3 },
  { keyword: "AI产品经理", displayName: "AI产品经理", sortOrder: 4 },
  { keyword: "数据标注", displayName: "AI数据标注", sortOrder: 5 },
  { keyword: "Cursor", displayName: "Cursor/AI编程", sortOrder: 6 },
  { keyword: "Claude", displayName: "Claude/大模型应用", sortOrder: 7 },
];

function parseSalaryMidK(salaryStr) {
  const s = String(salaryStr || "");
  const m = s.match(/(\d+)\s*[-~–]\s*(\d+)\s*[Kk千]/);
  if (m) return (parseInt(m[1], 10) + parseInt(m[2], 10)) / 2;
  const m2 = s.match(/(\d+)\s*[Kk]/);
  if (m2) return parseInt(m2[1], 10);
  return null;
}

function avgSalaryLabelFromJobs(jobs) {
  const mids = [];
  for (const j of jobs.slice(0, 15)) {
    const m = parseSalaryMidK(j.salary);
    if (m != null) mids.push(m);
  }
  if (!mids.length) return "面议";
  const avg = mids.reduce((a, b) => a + b, 0) / mids.length;
  const low = Math.max(1, Math.floor(avg * 0.9));
  const high = Math.max(low + 1, Math.ceil(avg * 1.1));
  return `${low}-${high}K`;
}

function deriveTrend(prevCount, newCount) {
  if (prevCount == null || !Number.isFinite(prevCount)) return "up";
  if (newCount > prevCount * 1.05) return "up";
  if (newCount < prevCount * 0.95) return "down";
  return "flat";
}

/**
 * 写入 SQLite 快照（供 GET /api/jobs/hot-skills 使用）
 * @param {import('better-sqlite3').Database} db
 */
async function refreshHotSkillsSnapshot(db) {
  const city = String(process.env.JOBS_HOT_SKILLS_CITY || "全国").trim() || "全国";
  const upsert = db.prepare(`
    INSERT INTO jobs_hot_skills_snapshot (
      keyword, display_name, job_count, avg_salary_label, trend, sort_order, run_meta, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now','localtime'))
    ON CONFLICT(keyword) DO UPDATE SET
      display_name = excluded.display_name,
      job_count = excluded.job_count,
      avg_salary_label = excluded.avg_salary_label,
      trend = excluded.trend,
      sort_order = excluded.sort_order,
      run_meta = excluded.run_meta,
      updated_at = excluded.updated_at
  `);

  for (const cfg of HOT_SKILL_TARGETS) {
    const prev = db
      .prepare(
        `SELECT job_count FROM jobs_hot_skills_snapshot WHERE keyword = ?`,
      )
      .get(cfg.keyword);
    const prevCount = prev ? Number(prev.job_count) : null;

    let r;
    try {
      r = await fetchJobsSearchResult(cfg.keyword, city, 1, 20);
    } catch (e) {
      console.error("[jobs-hot-skills] fetch failed", cfg.keyword, e);
      continue;
    }

    const jobCount = Math.max(0, Math.floor(Number(r.total) || r.jobs.length));
    const trend = deriveTrend(prevCount, jobCount);
    const avgSalary = avgSalaryLabelFromJobs(r.jobs);
    const meta = JSON.stringify({
      source: r.source,
      degraded: Boolean(r.degraded),
      sampleSize: r.jobs.length,
    });

    upsert.run(
      cfg.keyword,
      cfg.displayName,
      jobCount,
      avgSalary,
      trend,
      cfg.sortOrder,
      meta,
    );
  }

  return HOT_SKILL_TARGETS.length;
}

/**
 * @param {import('better-sqlite3').Database} db
 * @returns {Array<{ name: string, jobCount: number, avgSalary: string, trend: string }> | null}
 */
function readHotSkillsFromDb(db) {
  const rows = db
    .prepare(
      `
    SELECT display_name AS name, job_count AS jobCount, avg_salary_label AS avgSalary, trend
    FROM jobs_hot_skills_snapshot
    ORDER BY sort_order ASC, keyword ASC
  `,
    )
    .all();
  return rows.length ? rows : null;
}

module.exports = {
  HOT_SKILL_TARGETS,
  refreshHotSkillsSnapshot,
  readHotSkillsFromDb,
};
