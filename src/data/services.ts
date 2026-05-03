import type { CourseCategory } from "@/data/courses";
import { formatCoursePrice } from "@/data/courses";

export type ServiceFilterId =
  | "all"
  | "web"
  | "miniprogram"
  | "biz"
  | "aimedia"
  | "ui"
  | "auto";

export type ServiceListing = {
  id: string;
  title: string;
  /** 卡片第二行，如「用 Cursor」 */
  headline: string;
  /** 交付周期文案 */
  deliveryLine: string;
  priceFrom: number;
  filter: Exclude<ServiceFilterId, "all">;
  categoryLabel: string;
  tags: string[];
  coverEmoji: string;
  /** 复用课程封面渐变 */
  visualCategory: CourseCategory;
  isHot?: boolean;
  isNew?: boolean;
};

export type ServiceDetail = ServiceListing & {
  /** 详情页主标题（可与列表标题略有不同） */
  longTitle: string;
  /** 视频/封面区说明 */
  heroCaption: string;
  /** 详情副标题段落 */
  intro: string;
  /** 标签：Cursor · 响应式 … */
  pillTags: string[];
  /** 交付清单 */
  phases: { title: string; schedule: string }[];
  /** 案例说明（截图位占位） */
  cases: { title: string; body: string }[];
  /** 右侧价格下说明 */
  priceNote: string;
};

export const SERVICE_FILTERS: { id: ServiceFilterId; label: string }[] = [
  { id: "all", label: "全部服务" },
  { id: "web", label: "网站开发" },
  { id: "miniprogram", label: "小程序" },
  { id: "biz", label: "商业方案" },
  { id: "aimedia", label: "AI视觉" },
  { id: "ui", label: "UI设计" },
  { id: "auto", label: "自动化" },
];

const VALID_FILTER: Set<string> = new Set(
  SERVICE_FILTERS.map((f) => f.id).filter((id) => id !== "all"),
);

export function serviceFilterFromSearch(
  value: string | null,
): ServiceFilterId {
  if (value && VALID_FILTER.has(value)) {
    return value as Exclude<ServiceFilterId, "all">;
  }
  return "all";
}

export function formatPriceFrom(n: number): string {
  return `${formatCoursePrice(n)}起`;
}

export const SERVICE_OFFERS: ServiceDetail[] = [
  {
    id: "svc-web-brand",
    title: "品牌官网开发",
    longTitle: "品牌官网快速开发",
    headline: "用 Cursor + 组件库",
    deliveryLine: "3-5 天交付",
    priceFrom: 2000,
    filter: "web",
    categoryLabel: "网站开发",
    tags: ["响应式", "SEO", "上线交付"],
    coverEmoji: "🌐",
    visualCategory: "tools",
    isHot: true,
    heroCaption: "服务介绍预览（可替换为录屏或项目演示）",
    intro:
      "面向中小企业与独立品牌的响应式官网交付：信息架构、视觉风格对齐、核心页面开发与基础 SEO。适合需要快速上线、后续可迭代的官网项目。",
    pillTags: ["Cursor", "响应式", "SEO优化"],
    phases: [
      { title: "需求沟通", schedule: "1 天" },
      { title: "原型与信息架构", schedule: "1 天" },
      { title: "开发实现", schedule: "2-3 天" },
      { title: "上线交付", schedule: "1 天" },
    ],
    cases: [
      {
        title: "助贷 SaaS 控制台（示意）",
        body: "可替换为你的真实录屏与脱敏截图：展示后台框架、权限与关键业务流程。",
      },
      {
        title: "AI 商业课程平台（示意）",
        body: "本项目同款技术栈示例：课程列表、详情与会员动线，可作为交付能力参考。",
      },
    ],
    priceNote: "根据需求复杂度报价，支持企业对公与发票。",
  },
  {
    id: "svc-mini-mvp",
    title: "小程序 MVP 上线",
    longTitle: "小程序 MVP 快速上线",
    headline: "微信生态 · 核心流程优先",
    deliveryLine: "5-7 天交付",
    priceFrom: 4500,
    filter: "miniprogram",
    categoryLabel: "小程序",
    tags: ["MVP", "支付", "审核辅导"],
    coverEmoji: "📱",
    visualCategory: "money",
    isNew: true,
    heroCaption: "核心页面与主路径演示（可替换为真机录屏）",
    intro:
      "以「能跑通主路径」为目标：账号、下单/预约、消息通知与基础后台配置。适合验证需求与融资演示，后续可分期加功能。",
    pillTags: ["微信", "MVP", "可迭代"],
    phases: [
      { title: "需求拆解与接口清单", schedule: "1 天" },
      { title: "页面与交互稿", schedule: "1-2 天" },
      { title: "联调与提审材料", schedule: "2-3 天" },
      { title: "上线与交接", schedule: "1 天" },
    ],
    cases: [
      {
        title: "预约类小程序案例（占位）",
        body: "替换为你的行业案例截图：首页、下单、订单列表三屏即可建立信任。",
      },
    ],
    priceNote: "含一次提审辅导；复杂中台对接单独评估。",
  },
  {
    id: "svc-biz-plan",
    title: "商业方案与路演材料",
    longTitle: "商业方案与路演 PPT",
    headline: "ChatGPT + 结构化模板",
    deliveryLine: "3-4 天交付",
    priceFrom: 2800,
    filter: "biz",
    categoryLabel: "商业方案",
    tags: ["BP", "竞品", "财务假设"],
    coverEmoji: "📊",
    visualCategory: "prompt",
    heroCaption: "方案结构说明（可替换为过往脱敏案例页）",
    intro:
      "输出可路演、可落地的商业一页纸与 PPT：市场、竞品、模式、里程碑与风险。适合融资前梳理与对内对齐。",
    pillTags: ["商业方案", "数据叙事", "可迭代"],
    phases: [
      { title: "访谈与材料收集", schedule: "1 天" },
      { title: "结构稿与关键图表", schedule: "1-2 天" },
      { title: "修订与演讲备注", schedule: "1 天" },
    ],
    cases: [
      {
        title: "SaaS 路演版式（占位）",
        body: "可嵌入你过往项目的目录与图表风格截图。",
      },
    ],
    priceNote: "深度财务模型与法务条款需单独报价。",
  },
  {
    id: "ai-vision",
    title: "AI视觉内容创作",
    longTitle: "AI 图片与视频内容制作",
    headline: "文生图 · 短视频 · 批量营销素材",
    deliveryLine: "按项目 3–10 天",
    priceFrom: 2800,
    filter: "aimedia",
    categoryLabel: "AI视觉",
    tags: ["文生图", "视频剪辑", "商品展示"],
    coverEmoji: "🎨",
    visualCategory: "prompt",
    isNew: true,
    heroCaption: "风格参考与成片示意（可替换为实际案例）",
    intro:
      "面向电商、品牌社媒与获客落地页：AI 图片生成、短视频剪辑与简单特效、批量产出统一画风的营销图与商品展示视频。可按品牌调性做风格约束与模板复用。",
    pillTags: ["AI绘图", "短视频", "批量素材"],
    phases: [
      { title: "需求与参考风格", schedule: "1 天" },
      { title: "脚本/分镜与首版出片", schedule: "2–5 天" },
      { title: "修改定稿与交付包", schedule: "1–2 天" },
    ],
    cases: [
      {
        title: "商品主图与详情图批量（占位）",
        body: "同一 SKU 多场景、多尺寸导出，便于上架与广告投放。",
      },
      {
        title: "社媒短视频系列（占位）",
        body: "15–60 秒竖版视频，字幕与片尾品牌条可模板化。",
      },
    ],
    priceNote: "复杂实拍合成、三维渲染与明星肖像授权类需求单独评估。",
  },
  {
    id: "svc-ui-kit",
    title: "UI 设计系统落地",
    longTitle: "UI 设计系统与关键页面",
    headline: "Figma + 设计 Token",
    deliveryLine: "按里程碑 5-10 天",
    priceFrom: 3500,
    filter: "ui",
    categoryLabel: "UI设计",
    tags: ["设计系统", "组件", "暗色模式"],
    coverEmoji: "🎨",
    visualCategory: "prompt",
    heroCaption: "设计稿预览占位（可替换为 Figma 导出）",
    intro:
      "从品牌色与字体规范到关键业务页面高保真，输出可交给前端落地的组件说明与资源包。",
    pillTags: ["UI", "设计系统", "Figma"],
    phases: [
      { title: "风格方向与规范", schedule: "2 天" },
      { title: "核心页面", schedule: "3-5 天" },
      { title: "走查与交付包", schedule: "1-2 天" },
    ],
    cases: [
      {
        title: "B 端表格与仪表盘（占位）",
        body: "展示复杂信息密度下的布局与状态设计。",
      },
    ],
    priceNote: "插画与动效按张/秒另计。",
  },
  {
    id: "svc-auto-flow",
    title: "工作流自动化搭建",
    longTitle: "业务工作流自动化",
    headline: "Claude / ChatGPT + 编排",
    deliveryLine: "2-5 天交付",
    priceFrom: 1500,
    filter: "auto",
    categoryLabel: "自动化",
    tags: ["RAG", "Webhook", "质检"],
    coverEmoji: "⚙️",
    visualCategory: "tools",
    heroCaption: "自动化流程示意图（可替换为实际节点截图）",
    intro:
      "把重复性人工环节改为可监控的流程：文档入库、摘要、标签、通知与简单审批。交付含文档与可交接账号配置说明。",
    pillTags: ["自动化", "集成", "可观测"],
    phases: [
      { title: "流程梳理与边界", schedule: "1 天" },
      { title: "节点实现与联调", schedule: "1-3 天" },
      { title: "试运行与交接", schedule: "1 天" },
    ],
    cases: [
      {
        title: "客服工单分类（占位）",
        body: "展示意图分类 + 人工抽检闭环。",
      },
    ],
    priceNote: "涉及私有化部署与安全审计单独评估。",
  },
];

export function listServiceOffers(): ServiceListing[] {
  return SERVICE_OFFERS;
}

export function getServiceById(id: string): ServiceDetail | undefined {
  return SERVICE_OFFERS.find((s) => s.id === id);
}
