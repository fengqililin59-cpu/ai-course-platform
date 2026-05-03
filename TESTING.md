# 分销全链路本地测试指南

## 1. 环境准备

在 `server/.env` 中设置以下变量（开发测试用）：

```ini
# 模拟支付（跳过真实支付宝）
PAY_DEV_SIMULATE=1

# 开发模式（短信验证码统一为 888888）
NODE_ENV=development

# 佣金结算：支付后立即变为“可提现”（0 表示无等待期）
DISTRIBUTION_SETTLE_DAYS=0

# 最低提现金额（元）
DISTRIBUTION_WITHDRAW_MIN_YUAN=10

# 允许任何手机号生成推广链接（不要求创作者审核）
DISTRIBUTION_REQUIRE_CREATOR_APPROVED=0

# 前端访问地址（与 Vite 端口一致，默认为 5174）
FRONTEND_PUBLIC_URL=http://localhost:5174
```

## 2. 启动服务

**重要**：必须同时启动后端和前端，且后端重启后内存中的订单会丢失，测试过程中不要重启后端。

```bash
# 终端1：启动后端（API 服务）
cd server
npm start          # 或 node index.js
# 也可在仓库根目录：npm run dev:server

# 终端2：启动前端（Vite，必须在仓库根目录执行）
cd ..              # 若当前在 server 目录，先回到仓库根
npm run dev        # 默认端口 5174
```

## 3. 测试步骤

### 3.1 推广人生成链接

- 用户 A 登录（手机号 `13800001111`，验证码 `888888`）
- 进入任意已发布课程的详情页，点击「推广赚钱」
- 复制弹窗中的专属链接（格式：`http://localhost:5174/courses/xxx?ref=随机token`）

### 3.2 买家通过链接下单

- 打开**无痕/隐私窗口**，粘贴上述链接并访问
- 登录另一个手机号（如 `13900002222`，验证码 `888888`）
- 点击「立即购买」→ 因为 `PAY_DEV_SIMULATE=1`，会跳转到模拟支付页面 `/pay/dev-simulate`
- 点击「确认模拟支付」→ 提示成功，订单完成

### 3.3 推广人查看佣金

- 回到用户 A 的浏览器，刷新「个人中心」→「推广收益」
- 应看到「累计产生」和「当前可提现余额」变为 `20.00` 元（假设课程价格 100 元，佣金比例 20%）

### 3.4 申请提现

- 用户 A 在「推广收益」页底部填写提现金额（≥10 元）和支付宝账号，点击「提交申请」
- 提示成功，可提现余额减少相应金额

### 3.5 管理员审核（CLI）

```bash
cd server
npm run withdraw:list          # 查看待审核提现申请
npm run withdraw:approve -- <id> --operator 你的名字   # 批准
npm run withdraw:paid -- <id> --operator 你的名字      # 标记为已打款
```

审核后，用户 A 的提现记录状态会变为「已打款」。

## 4. 注意事项

- 订单仅存储在**内存**中，后端重启后会丢失，测试期间不要重启。
- 历史订单（没有 `ref=` 参数的）不会产生分销佣金。
- 真实支付宝支付需要在生产环境配置公钥/回调地址，本地请务必使用 `PAY_DEV_SIMULATE=1` 模拟。
- 前端默认端口为 `5174`，若你使用 `5173`，请同步修改 `FRONTEND_PUBLIC_URL`。

## 5. 常见问题

**Q: 佣金一直为 0？**  
A: 检查是否真的通过推广链接下单，并且支付成功（在模拟支付页点了确认）。可查看 `distribution_commissions` 表是否有记录。

**Q: 提现申请后 CLI 看不到？**  
A: 确认后端未重启，且提现金额 ≥ `DISTRIBUTION_WITHDRAW_MIN_YUAN`（默认 10）。

**Q: 推广链接无效？**  
A: 检查 `FRONTEND_PUBLIC_URL` 是否与当前前端访问地址一致，包括端口。
