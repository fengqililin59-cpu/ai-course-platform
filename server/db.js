"use strict";

const Database = require("better-sqlite3");
const path = require("node:path");
const crypto = require("node:crypto");

// ─── 数据库初始化 ─────────────────────────────────────────
const DB_PATH = path.join(__dirname, "..", "data", "aike.db");

// 确保 data 目录存在
const fs = require("node:fs");
const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ─── 建表 ─────────────────────────────────────────────────
db.exec(`
  -- 创作者账号
  CREATE TABLE IF NOT EXISTS creators (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    phone       TEXT    NOT NULL UNIQUE,
    display_name TEXT,
    status      TEXT    NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
    created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
  );

  -- 课程
  CREATE TABLE IF NOT EXISTS courses (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    creator_id   INTEGER NOT NULL REFERENCES creators(id),
    title        TEXT    NOT NULL,
    price_yuan   REAL    NOT NULL DEFAULT 0,
    description  TEXT,
    video_url    TEXT,
    cover_url    TEXT,
    tags         TEXT    NOT NULL DEFAULT '',  -- 逗号分隔，供就业雷达岗位推荐等匹配
    status       TEXT    NOT NULL DEFAULT 'pending',  -- draft | pending | published | offline
    created_at   TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at   TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
  );

  -- 订单（支付宝回调写入）
  CREATE TABLE IF NOT EXISTS orders (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    out_trade_no   TEXT    NOT NULL UNIQUE,
    course_id      INTEGER NOT NULL REFERENCES courses(id),
    creator_id     INTEGER NOT NULL REFERENCES creators(id),
    buyer_phone    TEXT,
    total_amount   REAL    NOT NULL,
    creator_amount REAL    NOT NULL,   -- 80%
    platform_amount REAL   NOT NULL,   -- 20%
    status         TEXT    NOT NULL DEFAULT 'pending',  -- pending | paid | refunded
    paid_at        TEXT,
    created_at     TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
  );

  -- 结算记录
  CREATE TABLE IF NOT EXISTS settlements (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    creator_id   INTEGER NOT NULL REFERENCES creators(id),
    month        TEXT    NOT NULL,   -- "2026-04"
    total_amount REAL    NOT NULL,
    order_count  INTEGER NOT NULL DEFAULT 0,
    status       TEXT    NOT NULL DEFAULT 'pending',  -- pending | settled
    settled_at   TEXT,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    UNIQUE(creator_id, month)
  );

  -- 提现申请
  CREATE TABLE IF NOT EXISTS withdrawals (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    creator_id   INTEGER NOT NULL REFERENCES creators(id),
    amount       REAL    NOT NULL,
    alipay_account TEXT,
    wechat_account TEXT,
    status       TEXT    NOT NULL DEFAULT 'pending',  -- pending | approved | rejected | paid
    remark       TEXT,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at   TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
  );

  -- 入驻申请（对应 /join 页面）
  CREATE TABLE IF NOT EXISTS join_applications (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT    NOT NULL,
    wechat       TEXT    NOT NULL,
    expertise    TEXT,
    course_name  TEXT,
    price        TEXT,
    bio          TEXT,
    fans         TEXT,
    status       TEXT    NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
    created_at   TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
  );

  -- 分销推广链接（邀请码 / ref）
  CREATE TABLE IF NOT EXISTS distribution_links (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    ref_token          TEXT    NOT NULL UNIQUE,
    course_id          TEXT    NOT NULL,
    distributor_phone  TEXT    NOT NULL,
    rate_percent       INTEGER NOT NULL DEFAULT 20,
    expires_at         TEXT,
    created_at         TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
  );

  -- 分销佣金（支付成功后写入；status 见 distributionSettlement）
  CREATE TABLE IF NOT EXISTS distribution_commissions (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    out_trade_no       TEXT    NOT NULL UNIQUE,
    ref_token          TEXT,
    course_id          TEXT    NOT NULL,
    buyer_phone        TEXT,
    distributor_phone  TEXT    NOT NULL,
    order_amount       REAL    NOT NULL,
    order_amount_cents INTEGER NOT NULL DEFAULT 0,
    commission_rate    REAL    NOT NULL DEFAULT 0.2,
    rate_percent       INTEGER NOT NULL DEFAULT 20,
    commission_amount  REAL    NOT NULL,
    status             TEXT    NOT NULL DEFAULT 'pending_settlement',
    available_at       TEXT,
    paid_at            TEXT,
    created_at         TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
  );

  -- 推广收益提现申请
  CREATE TABLE IF NOT EXISTS distribution_withdrawals (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    distributor_phone TEXT NOT NULL,
    amount           REAL    NOT NULL,
    alipay_account   TEXT,
    commission_ids   TEXT,
    status           TEXT    NOT NULL DEFAULT 'pending',  -- pending | approved | rejected | paid
    created_at       TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
  );

  -- 提现审核 CLI / 系统自动操作审计
  CREATE TABLE IF NOT EXISTS distribution_withdrawal_audits (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    withdrawal_id   INTEGER,
    action          TEXT    NOT NULL,
    actor           TEXT,
    detail          TEXT,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
  );

  -- 前台用户（手机号 / 邮箱 / 微信等，与 creators 创作者账号分离）
  CREATE TABLE IF NOT EXISTS site_users (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    phone           TEXT UNIQUE,
    email           TEXT UNIQUE,
    password_hash   TEXT,
    email_verified  INTEGER NOT NULL DEFAULT 0,
    wechat_openid   TEXT UNIQUE,
    github_id       TEXT,
    google_sub      TEXT,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
  );

  -- 就业雷达「热门技能」快照（由 cron 调用 npm run jobs:refresh-hot-skills 写入）
  CREATE TABLE IF NOT EXISTS jobs_hot_skills_snapshot (
    keyword           TEXT    PRIMARY KEY NOT NULL,
    display_name      TEXT    NOT NULL,
    job_count         INTEGER NOT NULL DEFAULT 0,
    avg_salary_label  TEXT    NOT NULL DEFAULT '面议',
    trend             TEXT    NOT NULL DEFAULT 'flat',
    sort_order        INTEGER NOT NULL DEFAULT 0,
    run_meta          TEXT,
    updated_at        TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
  );

  -- AI 视觉定制页咨询（POST /api/contact/ai-vision）
  CREATE TABLE IF NOT EXISTS vision_consultations (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT    NOT NULL,
    contact         TEXT    NOT NULL,
    service_type    TEXT,
    budget_range    TEXT,
    description     TEXT    NOT NULL,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
  );

  -- 就业雷达搜索日志（供后台热门词等统计）
  CREATE TABLE IF NOT EXISTS jobs_search_logs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword         TEXT    NOT NULL,
    city            TEXT,
    user_id         INTEGER,
    session_id      TEXT,
    result_count    INTEGER,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
  );
  CREATE INDEX IF NOT EXISTS idx_jobs_search_logs_keyword ON jobs_search_logs(keyword);
  CREATE INDEX IF NOT EXISTS idx_jobs_search_logs_created_at ON jobs_search_logs(created_at);

  -- 前台用户课程学习进度（邮箱/微信登录用户上报）
  CREATE TABLE IF NOT EXISTS user_course_progress (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id            INTEGER NOT NULL,
    course_id          TEXT    NOT NULL,
    progress_percent   INTEGER NOT NULL DEFAULT 0,
    last_watch_at      TEXT,
    updated_at         TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    UNIQUE(user_id, course_id)
  );
  CREATE INDEX IF NOT EXISTS idx_progress_user ON user_course_progress(user_id);
  CREATE INDEX IF NOT EXISTS idx_progress_course ON user_course_progress(course_id);

  -- 学习会话（前端上报停留时长）
  CREATE TABLE IF NOT EXISTS user_learning_sessions (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id            INTEGER NOT NULL,
    course_id          TEXT    NOT NULL,
    start_at           TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    end_at             TEXT,
    duration_seconds   INTEGER NOT NULL DEFAULT 0,
    created_at         TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_learning_sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_course ON user_learning_sessions(course_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_start ON user_learning_sessions(start_at);

  -- 分享短链（点击统计，重定向目标为完整 URL）
  CREATE TABLE IF NOT EXISTS share_links (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    short_code       TEXT    NOT NULL UNIQUE,
    target_url       TEXT    NOT NULL,
    title            TEXT,
    user_id          INTEGER,
    click_count      INTEGER NOT NULL DEFAULT 0,
    unique_visitors  INTEGER NOT NULL DEFAULT 0,
    created_at       TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
  );
  CREATE INDEX IF NOT EXISTS idx_share_links_short_code ON share_links(short_code);

  -- 核心指标日报推送（企业微信/钉钉 Webhook，单例 id=1）
  CREATE TABLE IF NOT EXISTS admin_metrics_push_settings (
    id              INTEGER PRIMARY KEY CHECK (id = 1),
    enabled         INTEGER NOT NULL DEFAULT 0,
    webhook_cipher  TEXT,
    cron_expr       TEXT NOT NULL DEFAULT '0 9 * * *',
    updated_at      TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );
  INSERT OR IGNORE INTO admin_metrics_push_settings (id, enabled, cron_expr)
  VALUES (1, 0, '0 9 * * *');

  -- 优惠券模板
  CREATE TABLE IF NOT EXISTS coupons (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    name                TEXT    NOT NULL,
    type                TEXT    NOT NULL DEFAULT 'fixed',  -- fixed | percent
    value               REAL    NOT NULL DEFAULT 0,
    condition_amount    REAL    NOT NULL DEFAULT 0,
    applicable_courses  TEXT    NOT NULL DEFAULT '[]',
    stock               INTEGER NOT NULL DEFAULT 0,
    used_count          INTEGER NOT NULL DEFAULT 0,
    claim_limit_per_user INTEGER NOT NULL DEFAULT 1,
    start_time          TEXT    NOT NULL,
    end_time            TEXT    NOT NULL,
    status              TEXT    NOT NULL DEFAULT 'active',
    created_at          TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
  );

  -- 用户持有券
  CREATE TABLE IF NOT EXISTS user_coupons (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id          INTEGER NOT NULL REFERENCES site_users(id),
    coupon_id        INTEGER NOT NULL REFERENCES coupons(id),
    status           TEXT    NOT NULL DEFAULT 'unused',
    assigned_method  TEXT    NOT NULL DEFAULT 'claim',
    assigned_at      TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    used_at          TEXT,
    order_id         INTEGER,
    out_trade_no     TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_user_coupons_user ON user_coupons(user_id);
  CREATE INDEX IF NOT EXISTS idx_user_coupons_coupon ON user_coupons(coupon_id);

  -- 秒杀活动
  CREATE TABLE IF NOT EXISTS seckill_activities (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id        INTEGER NOT NULL REFERENCES courses(id),
    original_price   REAL    NOT NULL,
    seckill_price    REAL    NOT NULL,
    stock            INTEGER NOT NULL DEFAULT 0,
    limit_per_user   INTEGER NOT NULL DEFAULT 1,
    start_time       TEXT    NOT NULL,
    end_time         TEXT    NOT NULL,
    status           TEXT    NOT NULL DEFAULT 'pending',
    created_at       TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
  );
  CREATE INDEX IF NOT EXISTS idx_seckill_course ON seckill_activities(course_id);
  CREATE INDEX IF NOT EXISTS idx_seckill_status ON seckill_activities(status);

  -- 课程评价（与前台 courses.id 字符串一致；需登录 site_users）
  CREATE TABLE IF NOT EXISTS course_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id TEXT NOT NULL,
    user_id INTEGER NOT NULL REFERENCES site_users(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    reply_content TEXT,
    reply_at TEXT,
    helpful_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_course_reviews_course ON course_reviews(course_id);
  CREATE INDEX IF NOT EXISTS idx_course_reviews_user ON course_reviews(user_id);
  CREATE INDEX IF NOT EXISTS idx_course_reviews_status ON course_reviews(status);

  -- 评价「有用」去重（每用户每条评价仅计一次）
  CREATE TABLE IF NOT EXISTS course_review_helpful (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES site_users(id),
    review_id INTEGER NOT NULL REFERENCES course_reviews(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    UNIQUE(user_id, review_id)
  );
  CREATE INDEX IF NOT EXISTS idx_review_helpful_review ON course_review_helpful(review_id);
`);

(function ensureSiteUsersTable() {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'site_users'")
    .get();
  if (row) return;
  db.exec(`
    CREATE TABLE site_users (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      phone           TEXT UNIQUE,
      email           TEXT UNIQUE,
      password_hash   TEXT,
      email_verified  INTEGER NOT NULL DEFAULT 0,
      wechat_openid   TEXT UNIQUE,
      github_id       TEXT,
      google_sub      TEXT,
      created_at      TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at      TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    );
  `);
})();

(function ensureSiteUsersColumns() {
  const cols = db.prepare(`PRAGMA table_info(site_users)`).all().map((r) => r.name);
  if (!cols.includes("password_hash")) {
    db.exec(`ALTER TABLE site_users ADD COLUMN password_hash TEXT`);
  }
  if (!cols.includes("github_id")) {
    db.exec(`ALTER TABLE site_users ADD COLUMN github_id TEXT`);
  }
  if (!cols.includes("google_sub")) {
    db.exec(`ALTER TABLE site_users ADD COLUMN google_sub TEXT`);
  }
})();

(function ensureVisionConsultationsTable() {
  const row = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'vision_consultations'",
    )
    .get();
  if (row) return;
  db.exec(`
    CREATE TABLE vision_consultations (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      name            TEXT    NOT NULL,
      contact         TEXT    NOT NULL,
      service_type    TEXT,
      budget_range    TEXT,
      description     TEXT    NOT NULL,
      created_at      TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    );
  `);
})();

function distributionTableColumns(table) {
  return db.prepare(`PRAGMA table_info(${table})`).all().map((r) => r.name);
}

function ensureDistributionColumn(table, columnName, ddlFragment) {
  const cols = distributionTableColumns(table);
  if (!cols.includes(columnName)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddlFragment}`);
  }
}

function coursesTableColumns() {
  return db.prepare(`PRAGMA table_info(courses)`).all().map((r) => r.name);
}

function ensureCourseColumn(columnName, ddlFragment) {
  const cols = coursesTableColumns();
  if (!cols.includes(columnName)) {
    db.exec(`ALTER TABLE courses ADD COLUMN ${ddlFragment}`);
  }
}

// 兼容已存在库：增量列（CREATE IF NOT EXISTS 不会更新旧表结构）
ensureDistributionColumn("distribution_links", "rate_percent", "rate_percent INTEGER DEFAULT 20");
ensureDistributionColumn("distribution_links", "expires_at", "expires_at TEXT");
ensureDistributionColumn("distribution_commissions", "rate_percent", "rate_percent INTEGER DEFAULT 20");
ensureDistributionColumn("distribution_commissions", "order_amount_cents", "order_amount_cents INTEGER DEFAULT 0");
ensureDistributionColumn("distribution_commissions", "available_at", "available_at TEXT");
ensureDistributionColumn("distribution_withdrawals", "commission_ids", "commission_ids TEXT");
ensureDistributionColumn("distribution_withdrawals", "wechat_account", "wechat_account TEXT");
ensureDistributionColumn("distribution_withdrawals", "updated_at", "updated_at TEXT");

ensureCourseColumn("tags", "tags TEXT NOT NULL DEFAULT ''");

function userCourseProgressColumns() {
  return db.prepare(`PRAGMA table_info(user_course_progress)`).all().map((r) => r.name);
}

function ensureUserCourseProgressColumn(columnName, ddlFragment) {
  const cols = userCourseProgressColumns();
  if (!cols.includes(columnName)) {
    db.exec(`ALTER TABLE user_course_progress ADD COLUMN ${ddlFragment}`);
  }
}

ensureUserCourseProgressColumn("completed_at", "completed_at TEXT");

function ordersTableColumns() {
  return db.prepare(`PRAGMA table_info(orders)`).all().map((r) => r.name);
}

function ensureOrdersColumn(columnName, ddlFragment) {
  const cols = ordersTableColumns();
  if (!cols.includes(columnName)) {
    db.exec(`ALTER TABLE orders ADD COLUMN ${ddlFragment}`);
  }
}

ensureOrdersColumn("user_coupon_id", "user_coupon_id INTEGER");
ensureOrdersColumn("seckill_activity_id", "seckill_activity_id INTEGER");

db.prepare(
  `
  UPDATE distribution_commissions
  SET order_amount_cents = CAST(ROUND(order_amount * 100) AS INTEGER)
  WHERE (order_amount_cents IS NULL OR order_amount_cents = 0) AND order_amount IS NOT NULL
`,
).run();

db.prepare(
  `
  UPDATE distribution_commissions
  SET rate_percent = CAST(ROUND(commission_rate * 100) AS INTEGER)
  WHERE commission_rate > 0 AND commission_rate <= 1
    AND (rate_percent IS NULL OR rate_percent = 20)
`,
).run();

db.prepare(
  `
  UPDATE distribution_commissions
  SET available_at = COALESCE(paid_at, created_at, datetime('now','localtime'))
  WHERE status = 'available' AND (available_at IS NULL OR available_at = '')
`,
).run();

module.exports = db;
