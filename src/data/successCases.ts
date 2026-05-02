export type ClientType = "个人" | "企业";

export type DeliverableType = "网站" | "小程序" | "网站 + 小程序";

export type SuccessCase = {
  id: string;
  /** 项目名称 */
  title: string;
  clientType: ClientType;
  deliverable: DeliverableType;
  /** 结果描述，如提升转化、获客 */
  outcome: string;
  /** 案例标签（行业、技术、效果等） */
  tags: string[];
};

export const SUCCESS_CASES: SuccessCase[] = [
  {
    id: "sc-crm-001",
    title: "中数云 AI 助贷 CRM",
    clientType: "企业",
    deliverable: "网站",
    outcome: "贷款中介全流程管理系统，含智能决策看板、AI 客服、销售跟进，已正式上线运营。访问：crm.syzs.top",
    tags: ["金融科技", "SaaS", "AI客服", "CRM", "已上线"],
  },
  {
    id: "sc-001",
    title: "教育品牌官网与招生落地页",
    clientType: "企业",
    deliverable: "网站",
    outcome: "咨询表单提交率提升约 40%，招生季线索更集中可跟进。",
    tags: ["教育", "响应式", "落地页", "转化提升"],
  },
  {
    id: "sc-002",
    title: "本地生活服务预约小程序",
    clientType: "企业",
    deliverable: "小程序",
    outcome: "上线 3 个月内自然渠道月新增获客 1200+，预约履约可量化。",
    tags: ["本地生活", "预约", "微信支付", "获客"],
  },
  {
    id: "sc-003",
    title: "独立顾问作品集与获客站",
    clientType: "个人",
    deliverable: "网站",
    outcome: "私信与预约咨询量较改版前翻倍，个人品牌辨识度提高。",
    tags: ["个人品牌", "作品集", "SEO", "咨询转化"],
  },
  {
    id: "sc-004",
    title: "B 端 SaaS 产品营销落地页",
    clientType: "企业",
    deliverable: "网站",
    outcome: "试用注册转化率明显提升，销售跟进话术与页面信息对齐。",
    tags: ["B端", "SaaS", "营销页", "转化提升"],
  },
  {
    id: "sc-005",
    title: "连锁门店会员与积分小程序",
    clientType: "企业",
    deliverable: "小程序",
    outcome: "会员复购与到店核销链路打通，门店侧运营效率提升。",
    tags: ["零售", "会员", "小程序", "复购"],
  },
  {
    id: "sc-006",
    title: "创作者课程展示 + 售卖页",
    clientType: "个人",
    deliverable: "网站 + 小程序",
    outcome: "课程页停留时长与下单转化同步改善，私域导流路径更清晰。",
    tags: ["知识付费", "课程", "全栈", "转化提升"],
  },
];
