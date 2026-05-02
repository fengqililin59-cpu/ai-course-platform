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
`);

module.exports = db;
