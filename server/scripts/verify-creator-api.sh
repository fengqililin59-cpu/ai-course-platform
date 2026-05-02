#!/usr/bin/env bash
# 校验创作者 API（默认本机 8787，可通过 BASE_URL 覆盖）
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:8787}"
PHONE="${PHONE:-13800138000}"

echo "BASE_URL=${BASE_URL}"
echo "测试手机号=${PHONE}"
echo ""

echo "==> POST /api/creator/send-code"
curl -sS -X POST "${BASE_URL}/api/creator/send-code" \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"${PHONE}\"}" | head -c 400
echo ""
echo ""

echo "==> POST /api/creator/login（万能码 888888，仅非 production）"
LOGIN_FILE="$(mktemp)"
curl -sS -X POST "${BASE_URL}/api/creator/login" \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"${PHONE}\",\"code\":\"888888\"}" \
  -o "${LOGIN_FILE}"
head -c 600 "${LOGIN_FILE}"
echo ""

TOKEN="$(
  node -e "const fs=require('fs');const p=process.argv[1];const j=JSON.parse(fs.readFileSync(p,'utf8'));process.stdout.write(j.token||'');" "${LOGIN_FILE}" 2>/dev/null || true
)"
rm -f "${LOGIN_FILE}"

if [[ -z "${TOKEN}" ]]; then
  echo ""
  echo "未能解析 token：请确认 NODE_ENV 非 production 且服务端已启动，或改用真实验证码登录。"
  exit 1
fi

echo ""
echo "==> GET /api/creator/stats"
curl -sS "${BASE_URL}/api/creator/stats" \
  -H "Authorization: Bearer ${TOKEN}" | head -c 600
echo ""
echo ""

echo "==> GET /api/creator/courses"
curl -sS "${BASE_URL}/api/creator/courses" \
  -H "Authorization: Bearer ${TOKEN}" | head -c 600
echo ""
echo ""

echo "==> 全部请求完成。"
