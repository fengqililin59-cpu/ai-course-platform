#!/usr/bin/env bash
# 在服务器上部署创作者 API（SQLite + better-sqlite3）
# 用法：将本仓库同步到服务器后，在服务器执行：
#   bash server/scripts/deploy-creator-sqlite.sh
set -euo pipefail

ROOT="${ROOT:-/root/ai-course-platform}"
SERVER="${ROOT}/server"

echo "==> 项目根: ${ROOT}"
echo "==> Server 目录: ${SERVER}"

if [[ ! -f "${SERVER}/package.json" ]]; then
  echo "错误: 未找到 ${SERVER}/package.json，请设置 ROOT 环境变量指向项目根目录。"
  exit 1
fi

cd "${SERVER}"

echo "==> 安装依赖（含 better-sqlite3，见 package.json）…"
npm install

echo "==> 确认关键文件存在…"
test -f "${SERVER}/db.js" || { echo "缺少 db.js"; exit 1; }
test -f "${SERVER}/routes/creator.js" || { echo "缺少 routes/creator.js"; exit 1; }
test -f "${SERVER}/index.js" || { echo "缺少 index.js"; exit 1; }

grep -q 'require("./routes/creator")' "${SERVER}/index.js" || {
  echo "请在 index.js 中挂载: const creatorRouter = require(\"./routes/creator\"); app.use(\"/api/creator\", creatorRouter);"
  exit 1
}

echo "==> 数据库目录（首次运行自动创建）: ${ROOT}/data/"
mkdir -p "${ROOT}/data"

echo "==> 部署文件检查完成。"
echo "    下一步: 重启进程，例如: pm2 restart all 或 npm run start"
echo "    自测: bash server/scripts/verify-creator-api.sh"
