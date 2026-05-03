"use strict";

const crypto = require("node:crypto");

const SKILL_KEYWORDS = [
  "ChatGPT",
  "Python",
  "Midjourney",
  "AI产品",
  "数据标注",
  "Cursor",
  "Claude",
  "提示词",
  "大模型",
  "AIGC",
];

const STATIC_FALLBACK_JOBS = [
  {
    id: "fallback_1",
    title: "AI 产品经理（示例岗位）",
    company: "示例科技",
    salary: "18-35K",
    city: "北京",
    description:
      "负责大模型产品规划与落地，熟悉提示词与数据分析。本岗位为数据源不可用时的本地示例。",
    skills: ["AI产品", "ChatGPT"],
    url: "https://www.zhipin.com",
    source: "static",
    published_at: null,
  },
  {
    id: "fallback_2",
    title: "Python AI 开发工程师（示例）",
    company: "示例智能",
    salary: "20-40K",
    city: "上海",
    description: "使用 Python 与主流大模型 API 完成业务系统开发。",
    skills: ["Python", "Claude"],
    url: "https://www.zhipin.com",
    source: "static",
    published_at: null,
  },
];

function extractSkills(text) {
  const t = String(text || "");
  return SKILL_KEYWORDS.filter((k) => t.includes(k));
}

function normalizeJob(raw, source) {
  const r = raw && typeof raw === "object" ? raw : {};
  const id =
    r.id ??
    r.job_id ??
    r.positionId ??
    r.encryptId ??
    `${source}_${Math.random().toString(36).slice(2, 10)}`;
  const title = String(
    r.title ?? r.job_name ?? r.positionName ?? r.name ?? "岗位",
  ).slice(0, 200);
  const company = String(
    r.company_name ?? r.companyName ?? r.brandName ?? r.company ?? "企业",
  ).slice(0, 120);
  const salary = String(
    r.salary_range ?? r.salary ?? r.salaryDesc ?? r.compensation ?? "面议",
  ).slice(0, 80);
  const city = String(
    r.city ?? r.cityName ?? r.workCity ?? r.location ?? "",
  ).slice(0, 40);
  const description = String(
    r.description ?? r.job_description ?? r.content ?? r.summary ?? "",
  ).slice(0, 2000);
  const url = String(
    r.detail_url ?? r.jobUrl ?? r.pc_url ?? r.url ?? "#",
  ).slice(0, 500);
  const published_at =
    r.published_at ?? r.publishTime ?? r.createTime ?? r.startDate ?? null;

  return {
    id: `${source}_${id}`,
    title,
    company,
    salary,
    city,
    description,
    skills: extractSkills(description + title),
    url,
    source,
    published_at,
  };
}

function extractJobList(data) {
  if (!data || typeof data !== "object") return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.list)) return data.list;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.records)) return data.records;
  if (data.data && typeof data.data === "object" && Array.isArray(data.data.list)) {
    return data.data.list;
  }
  if (data.result && Array.isArray(data.result)) return data.result;
  return [];
}

function extractTotal(data, listLen) {
  if (!data || typeof data !== "object") return listLen;
  const t =
    data.total ??
    data.totalCount ??
    data.count ??
    data.totalElements ??
    data.data?.total;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : listLen;
}

async function fetchJson(url, options) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), options.timeoutMs ?? 8000);
  try {
    const res = await fetch(url, {
      ...options,
      signal: ctrl.signal,
    });
    const text = await res.text();
    let body;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = { _raw: text };
    }
    return { ok: res.ok, status: res.status, body };
  } finally {
    clearTimeout(t);
  }
}

async function searchWithZhidekan(keyword, city, page, pageSize) {
  const base = String(
    process.env.ZHIDEKAN_API_BASE || "https://api.zhidekan.com/v1",
  ).replace(/\/$/, "");
  const key = process.env.ZHIDEKAN_API_KEY;
  if (!key) {
    const err = new Error("ZHIDEKAN_API_KEY not configured");
    err.code = "NO_KEY";
    throw err;
  }
  const rawZ = process.env.ZHIDEKAN_JOBS_PATH || "/jobs/search";
  const path = String(rawZ).startsWith("/") ? String(rawZ) : `/${rawZ}`;
  const headerName = process.env.ZHIDEKAN_API_HEADER || "X-Api-Key";
  const qs = new URLSearchParams({
    keyword,
    city: city || "全国",
    page: String(page),
    pageSize: String(pageSize),
  });
  const url = `${base}${path}?${qs.toString()}`;
  const { ok, status, body } = await fetchJson(url, {
    method: "GET",
    headers: { [headerName]: key, Accept: "application/json" },
    timeoutMs: Number(process.env.JOBS_UPSTREAM_TIMEOUT_MS || 8000),
  });
  if (!ok) {
    const err = new Error(`zhidekan http ${status}`);
    err.code = "UPSTREAM";
    err.body = body;
    throw err;
  }
  const list = extractJobList(body);
  const total = extractTotal(body, list.length);
  const source = String(body.source || body.dataSource || "zhidekan");
  return { list, total, source };
}

function liepinSign(params, secret) {
  const sortedKeys = Object.keys(params).sort();
  const signStr = sortedKeys.map((k) => `${k}=${params[k]}`).join("&");
  return crypto.createHmac("sha256", secret).update(signStr).digest("hex");
}

async function searchWithLiepin(keyword, city, page, pageSize) {
  const token = process.env.LIEPIN_ACCESS_TOKEN;
  const secret = process.env.LIEPIN_APP_SECRET;
  const base = String(
    process.env.LIEPIN_API_BASE || "https://open.liepin.com",
  ).replace(/\/$/, "");
  const rawLp = process.env.LIEPIN_JOBS_PATH || "/api/com.liepin.search.job.search";
  const path = String(rawLp).startsWith("/") ? String(rawLp) : `/${rawLp}`;

  if (!token) {
    const err = new Error("LIEPIN_ACCESS_TOKEN not configured");
    err.code = "NO_KEY";
    throw err;
  }

  const params = {
    keyword,
    city: city || "全国",
    page: String(page),
    size: String(pageSize),
  };
  const qs = new URLSearchParams(params);
  if (secret) {
    qs.set("signature", liepinSign(params, secret));
  }
  const url = `${base}${path}?${qs.toString()}`;
  const { ok, status, body } = await fetchJson(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    timeoutMs: Number(process.env.JOBS_UPSTREAM_TIMEOUT_MS || 8000),
  });
  if (!ok) {
    const err = new Error(`liepin http ${status}`);
    err.code = "UPSTREAM";
    err.body = body;
    throw err;
  }
  const list = extractJobList(body);
  const total = extractTotal(body, list.length);
  return { list, total, source: "liepin" };
}

function buildFallbackJobs(keyword, city, page) {
  return STATIC_FALLBACK_JOBS.map((j) => ({
    ...j,
    id: `${j.id}_p${page}`,
    description: `${j.description}（关键词「${keyword}」· ${city} · 第${page}页）`,
  }));
}

/**
 * 职得看 → 猎聘 → 静态示例；返回已 normalize 的 jobs。
 */
async function fetchJobsSearchResult(keyword, city, page, pageSize) {
  const kw = String(keyword || "").trim();
  const ct = String(city || "全国").trim() || "全国";
  const pg = Math.max(1, page);
  const ps = Math.max(1, Math.min(50, pageSize));

  let upstream;
  let degraded = false;
  try {
    upstream = await searchWithZhidekan(kw, ct, pg, ps);
  } catch (e1) {
    try {
      upstream = await searchWithLiepin(kw, ct, pg, ps);
    } catch (e2) {
      const jobs = buildFallbackJobs(kw, ct, pg);
      return {
        jobs,
        total: jobs.length,
        source: "static_fallback",
        degraded: true,
      };
    }
  }

  const jobs = (upstream.list || []).map((j) => normalizeJob(j, upstream.source));
  return {
    jobs,
    total: upstream.total || jobs.length,
    source: upstream.source,
    degraded,
  };
}

module.exports = {
  fetchJobsSearchResult,
  normalizeJob,
  extractSkills,
};
