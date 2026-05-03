"use strict";

const db = require("../db");

const CACHE_MS = 60 * 60 * 1000;
const cache = new Map();

/** 避免 LIKE 注入与通配符误匹配 */
function likeParam(token) {
  const t = String(token)
    .trim()
    .replace(/%/g, "")
    .replace(/_/g, "")
    .slice(0, 80);
  if (t.length < 2) return null;
  return `%${t}%`;
}

function uniqueTokens(skills, searchKeyword) {
  const out = [];
  const seen = new Set();
  for (const s of [...(skills || []), ...(searchKeyword ? [searchKeyword] : [])]) {
    const raw = String(s).trim();
    if (raw.length < 2) continue;
    const k = raw.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(raw);
  }
  return out;
}

/**
 * 根据技能词 + 当前搜索词，在已发布课程的标题、简介、tags 中做关键词匹配（最多 limit 门）
 * @param {string[]} skills
 * @param {string} [searchKeyword] 本次搜索关键词，skills 为空时仍可匹配
 * @param {number} [limit]
 */
function getRelatedCoursesBySkills(skills, searchKeyword, limit = 2) {
  const tokens = uniqueTokens(skills, searchKeyword);
  const params = [];
  const parts = [];
  for (const t of tokens) {
    const p = likeParam(t);
    if (!p) continue;
    parts.push(
      "(c.title LIKE ? OR IFNULL(c.description, '') LIKE ? OR IFNULL(c.tags, '') LIKE ?)",
    );
    params.push(p, p, p);
  }
  if (parts.length === 0) return [];

  const sql = `
    SELECT c.id, c.title, c.price_yuan AS price_yuan, c.cover_url AS cover_url, c.tags AS tags
    FROM courses c
    WHERE c.status = 'published'
      AND (${parts.join(" OR ")})
    ORDER BY c.updated_at DESC, c.created_at DESC
    LIMIT ?
  `;
  params.push(limit);

  const rows = db.prepare(sql).all(...params);
  return rows.map((row) => {
    const rawTags = row.tags ? String(row.tags) : "";
    const tags = rawTags
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean);
    return {
      id: String(row.id),
      title: row.title,
      price: Number(row.price_yuan) || 0,
      coverUrl: row.cover_url || "",
      url: `/courses/${row.id}`,
      tags,
    };
  });
}

function getRelatedCoursesBySkillsWithCache(skills, searchKeyword, limit = 2) {
  const key = `${uniqueTokens(skills, searchKeyword).join("\u0001")}|\u0001${limit}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_MS) return hit.data;
  const data = getRelatedCoursesBySkills(skills, searchKeyword, limit);
  cache.set(key, { data, ts: Date.now() });
  return data;
}

/**
 * 为岗位列表附加 relatedCourses（不改上游 normalize 结构）
 * @param {object[]} jobs
 * @param {string} searchKeyword
 */
function enrichJobsWithCourseRecommendations(jobs, searchKeyword) {
  if (!Array.isArray(jobs) || jobs.length === 0) return jobs;
  const kw = String(searchKeyword || "").trim();
  return jobs.map((job) => ({
    ...job,
    relatedCourses: getRelatedCoursesBySkillsWithCache(job.skills, kw, 2),
  }));
}

module.exports = {
  getRelatedCoursesBySkills,
  getRelatedCoursesBySkillsWithCache,
  enrichJobsWithCourseRecommendations,
};
