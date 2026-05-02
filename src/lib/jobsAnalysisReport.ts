/** 与 server/routes/jobsAnalysis.js 中 buildUserMessage 字段一致，供前端展示与缓存 */

export type JobsQuizAnswers = {
  identity: string;
  goal: string;
  studyTime: string;
};

export const JOBS_REPORT_CACHE_KEY = "jobs_analysis_report_cache";
export const JOBS_UNLOCK_KEY = "jobs_analysis_unlocked";

export type JobsReportCachePayload = {
  v: 1;
  phone: string;
  bg: string;
  goal: string;
  time: string;
  text: string;
};

export function parseReportCache(raw: string | null): JobsReportCachePayload | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as JobsReportCachePayload;
    if (o?.v !== 1 || typeof o.text !== "string") return null;
    return o;
  } catch {
    return null;
  }
}

export function isUnlockedForPhone(phone: string | null | undefined): boolean {
  if (!phone) return false;
  try {
    return localStorage.getItem(JOBS_UNLOCK_KEY) === phone;
  } catch {
    return false;
  }
}

export function setUnlockedForPhone(phone: string): void {
  try {
    localStorage.setItem(JOBS_UNLOCK_KEY, phone);
  } catch {
    /* ignore */
  }
}

export function readReportCache(
  phone: string,
  bg: string,
  goal: string,
  time: string,
): string | null {
  try {
    const p = parseReportCache(localStorage.getItem(JOBS_REPORT_CACHE_KEY));
    if (!p || p.phone !== phone || p.bg !== bg || p.goal !== goal || p.time !== time) {
      return null;
    }
    return p.text;
  } catch {
    return null;
  }
}

export function writeReportCache(
  phone: string,
  bg: string,
  goal: string,
  time: string,
  text: string,
): void {
  try {
    const payload: JobsReportCachePayload = {
      v: 1,
      phone,
      bg,
      goal,
      time,
      text,
    };
    localStorage.setItem(JOBS_REPORT_CACHE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function buildFallbackReport(a: JobsQuizAnswers): string {
  return (
    `【离线参考报告】\n\n` +
    `你好！由于在线 AI 暂时不可用，以下为基于你当前选项（身份：${a.identity}；目标：${a.goal}；每日投入：${a.studyTime}）整理的通用规划框架，建议稍后重新生成以获取更细的个性化版本。\n\n` +
    `🎯 适合你的 3 条路径（参考月收入区间，视城市与经验浮动）\n` +
    `1）「提示词 + 业务场景」交付型：兼职模板与自动化小单，常见约 3K–12K/月起步。\n` +
    `2）「工具链 + 工作流」效率型：为企业做流程改造与培训，常见约 8K–25K/月。\n` +
    `3）「产品化 + 内容获客」创业型：把方法论做成课程/社群/咨询，波动大，6 个月后有机会到 15K–40K+，但依赖验证与复购。\n\n` +
    `📚 推荐学习顺序（第 1–3 个月）\n` +
    `第 1 个月：锁定一个细分场景，完成 3 次真实访谈 + 1 份可售卖的「服务说明」草案。\n` +
    `第 2 个月：用 AI 工具把交付 SOP 固化（模板、检查表、提示词库），并每周输出 2 条案例型内容。\n` +
    `第 3 个月：跑试点单与复盘指标（时长、返工率、客单价），决定是否加码投放或招聘协作。\n\n` +
    `⚠️ 常见 3 个坑\n` +
    `· 只学工具不碰真实需求，导致作品集无法说服付费方。\n` +
    `· 范围蔓延：什么都接，单价和口碑一起掉。\n` +
    `· 忽视合规与数据安全，B 端客户一票否决。\n\n` +
    `💰 6 个月后收入预期（保守区间）\n` +
    `若以副业验证为主，多数人落在 3K–15K/月；若全职 all-in 且已跑通试点，有机会到 12K–35K/月，个体差异极大。\n\n` +
    `🚀 今天就能做的第一步\n` +
    `写下「你最想帮助的 1 类用户 + 他们愿意付钱的 1 个具体结果」，并在 24 小时内约一次 15 分钟访谈验证。`
  );
}

export function jobsAnalysisApiUrl(): string {
  const rawBase = String(import.meta.env.VITE_PAY_API_BASE ?? "").trim();
  const apiBase = rawBase.replace(/\/$/, "");
  const path = "/api/jobs-analysis/claude-report";
  return apiBase ? `${apiBase}${path}` : path;
}
