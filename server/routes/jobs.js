"use strict";

const express = require("express");
const rateLimit = require("express-rate-limit");

const db = require("../db");
const { resolveSiteUserId } = require("../lib/siteJwt");
const { fetchJobsSearchResult } = require("../lib/jobsSearchUpstream");
const { readHotSkillsFromDb } = require("../lib/jobsHotSkillsSnapshot");
const {
  enrichJobsWithCourseRecommendations,
} = require("../lib/courseRecommendation");

const router = express.Router();

const SEARCH_CACHE = new Map();
const DEFAULT_CACHE_TTL_MS = 30 * 60 * 1000;

/** 库中无快照时的兜底（与旧版接口字段一致） */
const HOT_SKILLS_STATIC = [
  { name: "ChatGPT/提示词工程", jobCount: 8923, avgSalary: "12-20K", trend: "up" },
  { name: "Python+AI开发", jobCount: 2341, avgSalary: "20-40K", trend: "up" },
  { name: "Midjourney/AI绘图", jobCount: 1876, avgSalary: "8-15K", trend: "up" },
  { name: "AI产品经理", jobCount: 2341, avgSalary: "18-35K", trend: "up" },
  { name: "AI数据标注", jobCount: 980, avgSalary: "5-8K", trend: "flat" },
  { name: "Cursor/AI编程", jobCount: 1234, avgSalary: "15-30K", trend: "up" },
  { name: "Claude/大模型应用", jobCount: 1560, avgSalary: "18-32K", trend: "up" },
];

function cacheTtlMs() {
  const n = Number(process.env.JOBS_SEARCH_CACHE_TTL_MS);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_CACHE_TTL_MS;
}

function cacheGet(key) {
  const row = SEARCH_CACHE.get(key);
  if (!row) return null;
  if (Date.now() > row.expires) {
    SEARCH_CACHE.delete(key);
    return null;
  }
  return row.value;
}

function cacheSet(key, value) {
  SEARCH_CACHE.set(key, { value, expires: Date.now() + cacheTtlMs() });
}

const MAX_LOG_KEYWORD_LEN = 200;

function jobsSearchSessionId(req) {
  const q = String(req.query.session_id || "").trim();
  if (q) return q.slice(0, 64);
  const h = String(req.headers["x-jobs-session-id"] || "").trim();
  return h ? h.slice(0, 64) : null;
}

function jobsResultCountForLog(jobs, total) {
  const n = Number(total);
  if (Number.isFinite(n) && n >= 0) return Math.trunc(n);
  return Array.isArray(jobs) ? jobs.length : 0;
}

function scheduleJobsSearchLog({ keyword, cityLabel, userId, sessionId, resultCount }) {
  const kw = String(keyword || "")
    .trim()
    .slice(0, MAX_LOG_KEYWORD_LEN);
  if (kw.length < 2) return;
  setImmediate(() => {
    try {
      db.prepare(
        `INSERT INTO jobs_search_logs (keyword, city, user_id, session_id, result_count)
         VALUES (?, ?, ?, ?, ?)`,
      ).run(kw, cityLabel || null, userId ?? null, sessionId || null, resultCount);
    } catch (err) {
      console.error("[Jobs Log] 写入失败", err);
    }
  });
}

const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.JOBS_SEARCH_RATE_MAX || 20),
  standardHeaders: true,
  legacyHeaders: false,
});

router.get("/search", searchLimiter, async (req, res) => {
  try {
    const keyword = String(req.query.keyword ?? "").trim();
    const city = String(req.query.city ?? "全国").trim() || "全国";
    const page = Math.max(1, Math.min(100, parseInt(String(req.query.page || "1"), 10) || 1));
    const pageSize = Math.max(
      1,
      Math.min(50, parseInt(String(req.query.pageSize || "20"), 10) || 20),
    );

    if (keyword.length < 2) {
      return res.status(400).json({ error: "关键词至少 2 个字符" });
    }

    const cityLabel = city === "全国" ? "" : city;
    const userId = resolveSiteUserId(db, req);
    const sessionId = jobsSearchSessionId(req);

    const cacheKey = `jobs:${keyword}:${city}:${page}:${pageSize}`;
    const cached = cacheGet(cacheKey);
    if (cached) {
      const jobs = enrichJobsWithCourseRecommendations(cached.jobs, keyword);
      const resultCount = jobsResultCountForLog(jobs, cached.total);
      scheduleJobsSearchLog({ keyword, cityLabel, userId, sessionId, resultCount });
      return res.json({ ...cached, jobs, cache_hit: true });
    }

    const r = await fetchJobsSearchResult(keyword, city, page, pageSize);
    const jobs = enrichJobsWithCourseRecommendations(r.jobs, keyword);
    const result = {
      total: r.total,
      page,
      pageSize,
      jobs,
      source: r.source,
      cached_at: new Date().toISOString(),
      degraded: Boolean(r.degraded),
    };
    cacheSet(cacheKey, result);
    const resultCount = jobsResultCountForLog(jobs, r.total);
    scheduleJobsSearchLog({ keyword, cityLabel, userId, sessionId, resultCount });
    res.json(result);
  } catch (err) {
    console.error("[jobs] search", err);
    res.status(500).json({ error: "数据源暂时不可用，请稍后重试" });
  }
});

function hotSkillsPayloadFromDb() {
  const fromDb = readHotSkillsFromDb(db);
  if (!fromDb || !fromDb.length) return null;
  const maxU = db
    .prepare(`SELECT MAX(updated_at) AS t FROM jobs_hot_skills_snapshot`)
    .get();
  return {
    skills: fromDb,
    snapshotUpdatedAt: maxU?.t ?? null,
    source: "db",
  };
}

router.get("/hot-skills", (_req, res) => {
  try {
    const payload = hotSkillsPayloadFromDb();
    if (payload) {
      return res.json(payload);
    }
    res.json({
      skills: HOT_SKILLS_STATIC,
      snapshotUpdatedAt: null,
      source: "static",
    });
  } catch (e) {
    console.error("[jobs] hot-skills", e);
    res.json({
      skills: HOT_SKILLS_STATIC,
      snapshotUpdatedAt: null,
      source: "static",
    });
  }
});

module.exports = router;
