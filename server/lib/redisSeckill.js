"use strict";

/**
 * 秒杀库存：生产环境建议用 Redis DECR + Lua 脚本与 DB 双写或 Redis 为唯一计数器。
 * 当前实现以 **SQLite 事务 + BEGIN IMMEDIATE 行锁** 为权威；若配置了 REDIS_URL，
 * 可在活动创建/变更时自行 `SET seckill:stock:{id} {stock}` 与 DB 同步后，用本模块
 * `decrMirror` 做流量前置削峰（失败时仍以 SQLite 为准回滚）。未同步 key 时跳过 Redis。
 */
let _client = null;

function getRedis() {
  const url = String(process.env.REDIS_URL || "").trim();
  if (!url) return null;
  if (!_client) {
    const Redis = require("ioredis");
    _client = new Redis(url, { maxRetriesPerRequest: 1, lazyConnect: true });
  }
  return _client;
}

/**
 * @param {number} activityId
 * @returns {Promise<number | null>} 递减后剩余，null 表示未使用 Redis 或 key 不存在
 */
async function decrMirror(activityId) {
  const r = getRedis();
  if (!r) return null;
  const key = `seckill:stock:${activityId}`;
  try {
    const v = await r.decr(key);
    return v;
  } catch {
    return null;
  }
}

/** 与 DB 回滚库存时同步镜像（可选） */
async function incrMirror(activityId) {
  const r = getRedis();
  if (!r) return;
  try {
    await r.incr(`seckill:stock:${activityId}`);
  } catch {
    /* ignore */
  }
}

module.exports = { getRedis, decrMirror, incrMirror };
