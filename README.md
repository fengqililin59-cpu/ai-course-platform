# 智学 AI 课程平台（AIlearn Pro 前端演示）

面向 AI 商业变现与技能学习的单页应用演示项目，品牌展示名为 **AIlearn Pro**。包含首页、课程列表/详情、会员、个人中心、404 与统一顶栏导航；本地 **localStorage** 模拟登录态、收藏、购课与学习进度（无后端）。

## 技术栈

- **React 19** + **TypeScript**
- **Vite 6**
- **Tailwind CSS 3**
- **React Router 7**
- **Radix UI**（Dialog 等）+ **class-variance-authority** + **lucide-react**
- 本地 **localStorage**：收藏、已购课程、各课学习进度（`progress_${courseId}`）

## 本地运行

```bash
npm install
npm run dev
```

浏览器访问终端中提示的本地地址（默认多为 `http://localhost:5173`）。

生产构建：

```bash
npm run build
npm run preview
```

## 部署到 Vercel

1. 把项目推送到 GitHub  
2. 打开 [vercel.com](https://vercel.com)，导入该 GitHub 仓库  
3. Framework Preset 选择 **Vite**  
4. 点击 **Deploy**，等待约 2 分钟即可  

根目录已包含 `vercel.json`，通过 `rewrites` 将任意路径回写到 `index.html`，避免 React Router 子路由在刷新时出现托管端 404。

## 路由与页面标题

| 路径 | 说明 | `document.title` |
|------|------|-------------------|
| `/` | 首页 | AIlearn Pro - AI商业课程平台 |
| `/courses` | 课程列表 | 全部课程 - AIlearn Pro |
| `/courses/:courseId` | 课程详情 | 课程名称 - AIlearn Pro |
| `/vip` | 会员套餐 | 开通会员 - AIlearn Pro |
| `/profile` | 个人中心 | 个人中心 - AIlearn Pro |
| `*` | 未匹配路径 | 404 页面不存在 - AIlearn Pro |

各页在挂载时通过 `useEffect` 设置标题；`index.html` 中默认标题为 **AIlearn Pro**（首屏闪烁前占位）。

## 已实现功能一览

### 全局与布局

- **RootLayout**：站点顶栏（`SiteHeader`）、页脚导航链接、背景网格装饰。
- **ScrollToTop**：路由 `pathname` 变化时 `window.scrollTo(0, 0)`。
- **Toast 系统**（`ToastProvider` + `ToastContext`）：`success` / `error` / `info`，右上角距顶 80px，自右侧滑入，3 秒自动关闭或可手动关闭，支持多条堆叠。
- **认证**（`AuthContext`）：模拟登录弹窗、会员档位、退出登录。
- **课程用户态**（`CourseUserContext`）：收藏、已购列表持久化。

### 首页（`/`）

- Hero：深色渐变 + 细网格 + 标题后光晕；主/副标题与 CTA **阶梯淡入上移动画**（`index.css` 中 `@keyframes`）。
- 分类入口卡片、热门课程网格（`CourseCard`）、底部 CTA。

### 课程列表（`/courses`）

- URL 查询参数 **`?category=`** 与分类 Tab 同步。
- 搜索、排序（综合/最新/评分/价格）、结果统计文案。
- 课程卡片高亮搜索关键词；封面区 **emoji 挂载后淡入**（`opacity-0` → `opacity-100` + `transition-opacity`）。

### 课程详情（`/courses/:courseId`）

- 面包屑、标签、讲师与评分等元信息。
- **视频占位区**：按分类渐变背景、大号播放按钮与试看文案、右上角课程 emoji、16:9。
- **课程目录快捷导航**：横向滚动章节标签，点击 **`scrollIntoView`** 跳转至下方目录对应行。
- **已购**：模拟学习进度滑块，写入 `localStorage`，Toast「学习进度已保存」。
- 学完收获、课程目录、正文区块；侧栏解锁价格、**限时优惠倒计时**（随机 20–24 小时）、立即购买 / 收藏、**讲师介绍卡**（首字头像渐变、认证标）、示例提示词与复制。
- 确认支付弹窗、购买成功 / 播放占位 / 复制成功 / 收藏切换等 **Toast** 替代 `alert`。

### 会员页（`/vip`）

- 三档会员卡片、权益列表；订阅按钮 **Toast** 提示「功能开发中」类文案。

### 个人中心（`/profile`）

- 未登录引导登录；已登录展示头像尾号、会员标签。
- 顶部 **学习统计**：已购门数 + 各课进度平均值（从 localStorage 读取）。
- **我的课程**：真实已购列表、进度条按 0–30% / 31–70% / 71–99% / 100% 分档颜色与文案（100% 显示完成 + ✓）。
- **我的订单**：演示订单列表；退出登录。

### 其他

- **`courseProgress` 工具**：`readCourseProgress` / `writeCourseProgress`，保存后派发事件供个人中心刷新。
- **404**（`NotFoundPage`）：统一兜底路由，返回首页按钮。

## 项目结构（摘要）

```
src/
  App.tsx                 # 路由定义（含 * 404）
  main.tsx                # Provider 嵌套（含 ToastProvider）
  layouts/RootLayout.tsx  # 顶栏 + ScrollToTop + Outlet + 页脚
  components/
    CourseCard.tsx
    SiteHeader.tsx
    ScrollToTop.tsx
    Toast.tsx
  contexts/
    AuthContext.tsx
    CourseUserContext.tsx
    ToastContext.tsx
  pages/
    HomePage.tsx
    CourseListPage.tsx
    CourseDetailPage.tsx
    VipPage.tsx
    ProfilePage.tsx
    NotFoundPage.tsx
  data/courses.ts
  lib/courseProgress.ts
  lib/copyToClipboard.ts
```

## 说明

本项目为前端演示，支付、播放、会员开通等均为模拟交互，数据仅存于浏览器本地。
