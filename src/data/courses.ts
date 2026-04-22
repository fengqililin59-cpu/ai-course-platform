export type CourseCategory = "money" | "prompt" | "tools";

export type CourseChapterType = "video" | "doc" | "live" | "quiz";

export type CourseChapter = {
  id: string;
  title: string;
  duration: string;
  isFree: boolean;
  type: CourseChapterType;
};

export type CourseContentSection = {
  heading: string;
  body: string;
};

export type Course = {
  id: string;
  title: string;
  subtitle: string;
  category: CourseCategory;
  categoryLabel: string;
  price: number;
  originalPrice: number;
  isVipFree: boolean;
  isHot: boolean;
  isNew: boolean;
  coverEmoji: string;
  instructorName: string;
  instructorTitle: string;
  studentCount: number;
  rating: number;
  totalDuration: string;
  chapterCount: number;
  tags: string[];
  highlights: [string, string, string, string, string];
  chapters: CourseChapter[];
  samplePrompt: string;
  contentSections: CourseContentSection[];
  updatedAt: string;
};

/** 列表/详情左侧封面区背景（按分类） */
export const CATEGORY_COVER_GRADIENT: Record<CourseCategory, string> = {
  money:
    "linear-gradient(135deg,#1e1b4b 0%,#4c1d95 45%,#7c3aed 100%)",
  prompt:
    "linear-gradient(135deg,#0f172a 0%,#0e7490 50%,#22d3ee 100%)",
  tools:
    "linear-gradient(135deg,#14532d 0%,#166534 40%,#4ade80 100%)",
};

export function formatCoursePrice(n: number): string {
  return `¥${n}`;
}

export function formatStudentCount(n: number): string {
  if (n >= 10_000) {
    return `${Math.round(n / 1000) / 10}万`;
  }
  return n.toLocaleString("zh-CN");
}

export const COURSES: Course[] = [
  {
    id: "c-001",
    title: "AI 副业变现：从技能到收款闭环",
    subtitle: "把大模型能力包装成可报价、可交付、可复购的服务，附报价模板与交付清单。",
    category: "money",
    categoryLabel: "AI赚钱项目",
    price: 199,
    originalPrice: 399,
    isVipFree: true,
    isHot: true,
    isNew: false,
    coverEmoji: "💰",
    instructorName: "林澈",
    instructorTitle: "连续创业者 · AI 服务化顾问",
    studentCount: 18420,
    rating: 4.9,
    totalDuration: "18小时20分",
    chapterCount: 7,
    tags: ["副业", "SOP", "报价"],
    highlights: [
      "用「场景—证据—结果」三步法收敛你的第一个付费场景",
      "掌握提示词产品化与交付边界，避免无限改稿",
      "获得报价单、需求访谈提纲、里程碑验收表等模板",
      "学会用试点单验证需求，并把案例沉淀为获客内容",
      "搭建从试单到复购的增长飞轮与私域话术框架",
    ],
    chapters: [
      { id: "c-001-ch-1", title: "开营：副业地图与避坑清单", duration: "45分", isFree: true, type: "video" },
      { id: "c-001-ch-2", title: "定位：找到愿意付钱的那一类人", duration: "1小时10分", isFree: true, type: "video" },
      { id: "c-001-ch-3", title: "产品化：把能力写成可售卖的套餐", duration: "1小时25分", isFree: false, type: "video" },
      { id: "c-001-ch-4", title: "获客：三条低成本验证路径", duration: "1小时40分", isFree: false, type: "doc" },
      { id: "c-001-ch-5", title: "交付：MVD 与质量抽检表", duration: "2小时", isFree: false, type: "video" },
      { id: "c-001-ch-6", title: "复盘直播：真实报价案例拆解", duration: "1小时20分", isFree: false, type: "live" },
      { id: "c-001-ch-7", title: "结课测验：输出你的商业一页纸", duration: "30分", isFree: false, type: "quiz" },
    ],
    samplePrompt:
      "你是「B端AI落地顾问」。我的行业是{{填写}}，目标客户是{{填写}}，我目前会的工具是{{ChatGPT/Cursor/API等}}。请输出一份「7天试点方案」，要求用中文条列：①可量化的目标与成功指标；②试点范围及明确「不做清单」以免范围蔓延；③3个可演示的Demo场景，每个给一组输入输出示例；④需要人工复核的风险点与抽检频率；⑤建议报价区间与分阶段交付里程碑。语气专业克制，避免空洞形容词。",
    contentSections: [
      {
        heading: "你将获得",
        body:
          "本课以「能收到钱」为唯一北极星：从定位、套餐设计、获客话术到交付与复盘，全程提供可下载模板。我们不讨论空泛趋势，只练如何把 AI 能力翻译成客户可感知的结果与发票上的项目名。",
      },
      {
        heading: "适合谁",
        body:
          "适合已有一定 AI 使用经验、希望把技能变成副业收入的产品、运营、技术同学；也适合自由职业者把零散接单升级为标准化服务。若你完全零基础，建议先完成本平台的工具与提示词入门课再来。",
      },
      {
        heading: "学习路径建议",
        body:
          "按章节顺序完成每周作业：第1周产出定位与套餐草案，第2周完成一次真实访谈与报价草稿，第3周用试点单跑通交付表。直播课可回看，但强烈建议跟练以拿到讲师点评。",
      },
    ],
    updatedAt: "2026-04-18",
  },
  {
    id: "c-002",
    title: "小红书 AI 获客：笔记矩阵与转化漏斗",
    subtitle: "用 AI 批量产出可过审的笔记结构，配合钩子与私信话术，跑通「曝光—私信—成交」。",
    category: "money",
    categoryLabel: "AI赚钱项目",
    price: 168,
    originalPrice: 328,
    isVipFree: true,
    isHot: true,
    isNew: true,
    coverEmoji: "📕",
    instructorName: "周桐",
    instructorTitle: "增长负责人 · 千万级投放经验",
    studentCount: 12650,
    rating: 4.8,
    totalDuration: "14小时05分",
    chapterCount: 6,
    tags: ["小红书", "矩阵", "转化"],
    highlights: [
      "搭建可复制的「选题—大纲—正文—封面文案」AI流水线",
      "掌握平台敏感词与夸大承诺的规避策略，降低违规风险",
      "设计私信承接话术与自动回复的分层策略",
      "用数据表追踪笔记表现，迭代钩子与封面公式",
      "把爆款笔记沉淀为可复用的「内容元件库」",
    ],
    chapters: [
      { id: "c-002-ch-1", title: "算法与人群：小红书流量底层逻辑", duration: "50分", isFree: true, type: "video" },
      { id: "c-002-ch-2", title: "选题库：AI辅助挖掘100个选题", duration: "1小时15分", isFree: true, type: "video" },
      { id: "c-002-ch-3", title: "正文：结构模板与过审检查表", duration: "1小时30分", isFree: false, type: "video" },
      { id: "c-002-ch-4", title: "封面与标题：高点击公式", duration: "1小时", isFree: false, type: "doc" },
      { id: "c-002-ch-5", title: "私信与转化：漏斗每一层的话术", duration: "1小时45分", isFree: false, type: "video" },
      { id: "c-002-ch-6", title: "周更节奏与矩阵账号分工", duration: "55分", isFree: false, type: "doc" },
    ],
    samplePrompt:
      "你是熟悉小红书社区规范的内容增长专家。我的赛道是{{例如美妆/家居/教育}}，目标用户是{{年龄与痛点}}，现阶段目标是{{涨粉/私信/加微}}。请输出：①一周7天的选题表（每天1个主题句+3个备选角度）；②每篇笔记的标题10选1（避免医疗功效承诺与绝对化用语）；③正文骨架（痛点-方案-证明-行动）；④结尾引导私信的合规话术3版；⑤一份「发布前自检清单」不少于12条检查项。全文中文，条理清晰。",
    contentSections: [
      {
        heading: "课程价值",
        body:
          "小红书是「内容即渠道」的典型场域。本课把 AI 用在刀刃上：不是堆字数，而是稳定产出可过审、可测试、可迭代的笔记元件，并用表格把经验固化成团队资产。",
      },
      {
        heading: "模块结构",
        body:
          "模块一打通选题与人群；模块二训练正文与标题的工业化产出；模块三专注私信与转化；模块四讲矩阵协作与周更节奏。每模块均有作业模板与讲师点评示例。",
      },
    ],
    updatedAt: "2026-04-20",
  },
  {
    id: "c-003",
    title: "跨境独立站：AI 驱动的选品与落地页",
    subtitle: "用 AI 辅助竞品拆解、卖点提炼与英文落地页，缩短从选品到上架的试错周期。",
    category: "money",
    categoryLabel: "AI赚钱项目",
    price: 249,
    originalPrice: 499,
    isVipFree: false,
    isHot: false,
    isNew: true,
    coverEmoji: "🛒",
    instructorName: "陈蔚",
    instructorTitle: "DTC 品牌出海顾问",
    studentCount: 5820,
    rating: 4.7,
    totalDuration: "16小时40分",
    chapterCount: 5,
    tags: ["独立站", "英文页", "选品"],
    highlights: [
      "用 AI 做竞品卖点矩阵与差异化定位陈述",
      "掌握英文落地页的信息架构与信任模块排布",
      "学会生成多版 headline 并用评分表做人工筛选",
      "了解物流、支付、退换货在文案中的合规表述",
      "获得选品决策表与上架前检查清单",
    ],
    chapters: [
      { id: "c-003-ch-1", title: "独立站路径与常见失败模式", duration: "40分", isFree: true, type: "video" },
      { id: "c-003-ch-2", title: "选品：AI辅助竞品与利润测算", duration: "2小时", isFree: false, type: "video" },
      { id: "c-003-ch-3", title: "卖点：从用户评论到英文 USP", duration: "1小时50分", isFree: false, type: "video" },
      { id: "c-003-ch-4", title: "落地页：模块草图与 CTA 实验", duration: "2小时10分", isFree: false, type: "doc" },
      { id: "c-003-ch-5", title: "案例：从 0 到首单的页面迭代", duration: "1小时30分", isFree: false, type: "live" },
    ],
    samplePrompt:
      "你是英文独立站转化文案顾问。我的产品是{{简述}}，目标市场是{{国家/人群}}，客单价约{{金额}}，主要流量来自{{广告/SEO/红人}}。请用中文先给出信息架构建议，再输出英文：①首屏 headline 与 subhead 各5条（不同角度：功能/情感/社会证明）；②三段式卖点展开（每段不超过90词）；③FAQ 6条（覆盖物流、关税、退换货）；④页脚合规声明要点列表。要求语气自然、避免夸大医疗或绝对化功效承诺。",
    contentSections: [
      {
        heading: "你将如何落地",
        body:
          "跨境业务的瓶颈往往在「选品—表达—信任」三件事。课程用 AI 加速前两者的迭代，用结构化模块解决第三件事，让你少走弯路、少烧广告预算。",
      },
      {
        heading: "先修建议",
        body:
          "建议已具备基础英语读写能力；若完全不会建站，可先使用演示站模板跟练，再迁移到自己的店铺系统。",
      },
    ],
    updatedAt: "2026-04-12",
  },
  {
    id: "c-004",
    title: "高转化提示词：销售页、短视频与私域",
    subtitle: "把提示词拆成角色、证据、结构、CTA 与禁忌词五大模块，配套评分表快速迭代。",
    category: "prompt",
    categoryLabel: "AI提示词",
    price: 149,
    originalPrice: 299,
    isVipFree: true,
    isHot: true,
    isNew: false,
    coverEmoji: "✍️",
    instructorName: "沈言",
    instructorTitle: "文案总监 · 增长黑客背景",
    studentCount: 22100,
    rating: 4.95,
    totalDuration: "12小时30分",
    chapterCount: 5,
    tags: ["销售页", "短视频", "私域"],
    highlights: [
      "建立可复用的「角色-任务-约束-输出格式」提示词骨架",
      "掌握证据链写法，把空洞形容词换成可验证表达",
      "学会用评分表对多版输出做人工排序与二次润色",
      "覆盖短视频五段式脚本与评论区钩子话术",
      "沉淀禁忌词与品牌声线词库，降低翻车概率",
    ],
    chapters: [
      { id: "c-004-ch-1", title: "提示词工程化思维导论", duration: "35分", isFree: true, type: "video" },
      { id: "c-004-ch-2", title: "销售页：首屏与信任模块", duration: "1小时40分", isFree: true, type: "video" },
      { id: "c-004-ch-3", title: "短视频：钩子与信息密度", duration: "1小时55分", isFree: false, type: "video" },
      { id: "c-004-ch-4", title: "私域：分层话术与跟进节奏", duration: "1小时25分", isFree: false, type: "doc" },
      { id: "c-004-ch-5", title: "评测：自动打分 + 人工终审", duration: "1小时", isFree: false, type: "quiz" },
    ],
    samplePrompt:
      "你是资深中文增长文案。请为我的产品撰写「销售页首屏」方案。已知：产品名{{填写}}，目标用户{{画像}}，核心卖点三条{{填写}}，可用证据{{数据/案例/背书}}。输出要求：①主标题不超过18字，附3种风格（理性/情感/权威）；②副标题两行内；③首屏下方3个要点式bullet；④列出至少5个必须避免的夸张或违规承诺词并给替代表达；⑤给出「用户可能提出的3个质疑」及一句回应话术。整体语气真诚、具体、可执行。",
    contentSections: [
      {
        heading: "课程导览",
        body:
          "增长文案的关键不是更华丽，而是更可执行、可测试。我们会把大模型当作「初稿引擎」，用人做方向与事实核对，用表格做版本管理，让内容迭代有迹可循。",
      },
      {
        heading: "模块 A：销售页",
        body:
          "从首屏承诺、社会证明、FAQ 到付款临门一脚，提供可直接套用的段落骨架，并演示如何把证言改写成可验证的事实表达。",
      },
      {
        heading: "模块 B：短视频与私域",
        body:
          "短视频侧重钩子与节奏；私域侧重分层触达与跟进节奏。两部分均提供提示词模板与反例库，帮助你快速建立团队共识。",
      },
    ],
    updatedAt: "2026-04-15",
  },
  {
    id: "c-005",
    title: "企业级 RAG：检索、重排与引用生成",
    subtitle: "面向要把内部文档做成问答产品的同学：从切分、向量库到监控指标一次讲清。",
    category: "prompt",
    categoryLabel: "AI提示词",
    price: 259,
    originalPrice: 459,
    isVipFree: false,
    isHot: true,
    isNew: false,
    coverEmoji: "🧠",
    instructorName: "赵启元",
    instructorTitle: "架构师 · 搜索与 NLP 背景",
    studentCount: 9340,
    rating: 4.85,
    totalDuration: "20小时15分",
    chapterCount: 6,
    tags: ["RAG", "向量库", "引用"],
    highlights: [
      "理解 chunk 策略与元数据设计对召回率的影响",
      "掌握重排序与引用生成减少「胡编」的工程手段",
      "学会搭建评测集与线上监控看板",
      "了解权限、审计日志与敏感信息脱敏要点",
      "获得从 PoC 到上线的检查清单与排错思路",
    ],
    chapters: [
      { id: "c-005-ch-1", title: "RAG 边界：能做什么与不能做什么", duration: "42分", isFree: true, type: "video" },
      { id: "c-005-ch-2", title: "数据清洗与切分实战", duration: "2小时20分", isFree: true, type: "video" },
      { id: "c-005-ch-3", title: "Embedding 与向量库选型", duration: "1小时50分", isFree: false, type: "video" },
      { id: "c-005-ch-4", title: "检索与重排：参数调优", duration: "2小时", isFree: false, type: "video" },
      { id: "c-005-ch-5", title: "提示词：引用格式与拒答策略", duration: "1小时35分", isFree: false, type: "doc" },
      { id: "c-005-ch-6", title: "上线与监控：案例复盘", duration: "1小时45分", isFree: false, type: "live" },
    ],
    samplePrompt:
      "你是企业级RAG架构师。请根据以下约束用中文条列输出技术方案要点：文档类型为{{PDF/网页/工单}}混合；峰值QPS约{{数字}}；需要{{是/否}}权限隔离与审计日志；合规要求{{简述}}。请包含：①数据流水线各阶段输入输出；②索引与chunk策略建议；③检索+重排组合及何时触发重排；④生成侧提示词中强制引用与拒答的写法要点；⑤评测集构建方法（不少于6条）；⑥上线后监控指标（不少于8条）。避免泛泛而谈，每条尽量落到可执行动作。",
    contentSections: [
      {
        heading: "适合人群",
        body:
          "适合已会调用大模型 API、希望把企业知识库做成可用问答系统的工程与产品。课程假设你能阅读基础 Python 示例，但重点在原理与决策而非堆代码量。",
      },
      {
        heading: "实战主线",
        body:
          "贯穿案例：客服知识库 + 产品手册 → 可引用出处的问答助手。我们会把失败回答分类（答非所问、引用错误、越权回答），并给出对应修复路径。",
      },
    ],
    updatedAt: "2026-04-08",
  },
  {
    id: "c-006",
    title: "多角色系统提示词：安全、风格与工具调用",
    subtitle: "为客服、教练、分析师等角色设计系统提示词，统一边界、语气与函数调用协议。",
    category: "prompt",
    categoryLabel: "AI提示词",
    price: 189,
    originalPrice: 329,
    isVipFree: true,
    isHot: false,
    isNew: true,
    coverEmoji: "🎭",
    instructorName: "韩露",
    instructorTitle: "LLM 应用负责人",
    studentCount: 6780,
    rating: 4.75,
    totalDuration: "10小时50分",
    chapterCount: 5,
    tags: ["系统提示词", "安全", "工具"],
    highlights: [
      "为不同业务角色建立提示词分层与继承关系",
      "设计安全策略：越权、隐私、幻觉的拦截话术",
      "规范工具/函数调用的输入输出 JSON 协议",
      "用少量样本做风格对齐与品牌声线控制",
      "输出可评审的提示词版本变更记录模板",
    ],
    chapters: [
      { id: "c-006-ch-1", title: "系统提示词 vs 用户消息边界", duration: "38分", isFree: true, type: "video" },
      { id: "c-006-ch-2", title: "角色卡：目标、禁忌与输出格式", duration: "1小时20分", isFree: false, type: "video" },
      { id: "c-006-ch-3", title: "安全与合规：拒答与升级人工", duration: "1小时35分", isFree: false, type: "video" },
      { id: "c-006-ch-4", title: "工具调用：错误处理与重试", duration: "1小时45分", isFree: false, type: "doc" },
      { id: "c-006-ch-5", title: "结课：评审一场真实提示词改版", duration: "50分", isFree: false, type: "live" },
    ],
    samplePrompt:
      "你是大模型应用架构师。请为「在线理财客服助手」撰写一版系统提示词（中文），要求包含：①角色定位与服务边界；②必须拒答的主题清单（示例不少于5条）及统一拒答话术；③遇到无法确认事实时的澄清句式3条；④调用外部工具（查询订单状态）时的参数约定与失败重试策略说明；⑤输出格式（先给结论再给步骤）。全文可直接粘贴进系统消息使用，语气专业耐心，避免承诺收益或替代人工投顾。字数充分展开，便于评审。",
    contentSections: [
      {
        heading: "为什么需要「角色级」系统提示词",
        body:
          "同一模型服务多个场景时，混乱往往来自边界不清。本课用角色卡把目标、禁忌、工具与输出格式绑在一起，便于评审、回归测试与跨团队协作。",
      },
      {
        heading: "与业务共创的流程",
        body:
          "介绍与法务、运营、研发共创提示词的工作坊流程，以及如何把每次线上事故反哺进提示词与监控规则。",
      },
    ],
    updatedAt: "2026-04-19",
  },
  {
    id: "c-007",
    title: "Cursor + Agent：从需求到可合并 PR",
    subtitle: "用 AI 编程助手拆解任务、写测试与改代码，建立可审查、可回滚的团队工作流。",
    category: "tools",
    categoryLabel: "AI工具教程",
    price: 229,
    originalPrice: 399,
    isVipFree: true,
    isHot: true,
    isNew: true,
    coverEmoji: "⌨️",
    instructorName: "顾明远",
    instructorTitle: "全栈负责人 · 开源贡献者",
    studentCount: 15320,
    rating: 4.92,
    totalDuration: "15小时00分",
    chapterCount: 6,
    tags: ["Cursor", "Agent", "测试"],
    highlights: [
      "学会把需求拆成可交给 Agent 的小任务与验收标准",
      "掌握测试驱动与 diff 审查习惯，避免静默改坏代码",
      "配置项目级规则与上下文，提高生成命中率",
      "了解在单体与微服务中的安全边界（密钥、SQL）",
      "沉淀团队 Prompt 片段库与 Code Review 清单",
    ],
    chapters: [
      { id: "c-007-ch-1", title: "Cursor 工作区与模型选择", duration: "40分", isFree: true, type: "video" },
      { id: "c-007-ch-2", title: "Composer：多文件改动与说明", duration: "1小时30分", isFree: true, type: "video" },
      { id: "c-007-ch-3", title: "Agent：任务拆解与验收", duration: "2小时", isFree: false, type: "video" },
      { id: "c-007-ch-4", title: "测试：让 AI 先写测例再改实现", duration: "1小时50分", isFree: false, type: "video" },
      { id: "c-007-ch-5", title: "Code Review：人类最后把关什么", duration: "1小时15分", isFree: false, type: "doc" },
      { id: "c-007-ch-6", title: "直播：从 issue 到 PR 全流程", duration: "2小时", isFree: false, type: "live" },
    ],
    samplePrompt:
      "你是资深软件工程师，正在使用 Cursor 协助开发。项目技术栈为{{填写}}，当前分支要解决的问题是：{{粘贴 issue 描述}}。请输出：①任务拆解为不超过6步的子任务，每步给出可验证的完成标准；②若采用测试驱动，请写出关键路径的测试用例草稿（伪代码即可）；③列出修改涉及的可能文件清单及每处改动的意图一句话；④需要人工重点审查的风险点（安全、并发、兼容）；⑤建议的 commit 拆分方案。回答用中文，条理清晰，避免直接给出未经说明的大段代码。",
    contentSections: [
      {
        heading: "课程目标",
        body:
          "把 AI 从「写代码玩具」变成「可进 CI、可审查的生产力」。重点在流程：任务拆解、测试守门、审查清单与团队规则，而不是追新功能。",
      },
      {
        heading: "先修要求",
        body:
          "需熟悉 Git 与一种主流语言（TypeScript/Java 等）。若完全未用过 Cursor，可先跟第一章完成环境配置再继续。",
      },
    ],
    updatedAt: "2026-04-21",
  },
  {
    id: "c-008",
    title: "Midjourney & SD：电商视觉批量工作流",
    subtitle: "从 moodboard 到批量出图、校色与负面提示，搭建可交付的电商主图与详情页流水线。",
    category: "tools",
    categoryLabel: "AI工具教程",
    price: 179,
    originalPrice: 349,
    isVipFree: false,
    isHot: false,
    isNew: false,
    coverEmoji: "🎨",
    instructorName: "白苒",
    instructorTitle: "视觉总监 · 电商品牌合作背景",
    studentCount: 11240,
    rating: 4.8,
    totalDuration: "13小时25分",
    chapterCount: 5,
    tags: ["MJ", "SD", "电商"],
    highlights: [
      "建立主图、场景图、详情长图的分层提示词模板",
      "掌握负面提示与材质光影词，减少返工率",
      "学会批量出图后的人工筛选与统一校色流程",
      "理解品牌色与构图约束如何转写为可控提示词",
      "获得交付文件夹命名与版本管理建议",
    ],
    chapters: [
      { id: "c-008-ch-1", title: "工具链选择与显存预算", duration: "35分", isFree: true, type: "video" },
      { id: "c-008-ch-2", title: "主图：白底与材质光", duration: "1小时40分", isFree: false, type: "video" },
      { id: "c-008-ch-3", title: "场景图：构图与故事感", duration: "1小时55分", isFree: false, type: "video" },
      { id: "c-008-ch-4", title: "详情页：长图切片与一致性", duration: "2小时", isFree: false, type: "doc" },
      { id: "c-008-ch-5", title: "作业点评直播", duration: "1小时30分", isFree: false, type: "live" },
    ],
    samplePrompt:
      "你是电商视觉总监。品类为{{填写}}，核心卖点三条{{填写}}，品牌气质为{{极简/科技/轻奢}}，主投放平台为{{淘宝/京东/抖音}}。请用中文输出：①主图（白底）一版完整提示词与对应负面提示词；②场景图一版（说明构图与光位）；③详情页首屏一版（文字层与画面层分工建议）；④列出易触发平台审核风险的画面元素及替代方案；⑤给出一组「拍摄等价」布光与机位建议，便于与摄影团队沟通。内容具体可执行，避免空泛形容词堆砌。",
    contentSections: [
      {
        heading: "交付流程总览",
        body:
          "电商视觉的核心是可控的批量。课程从需求表达到批量生成，再到人工精选与校色，形成可复制的交付流水线，并讨论与客户对齐预期的沟通要点。",
      },
      {
        heading: "品牌一致性",
        body:
          "如何把品牌色、字体气质、构图规则转写为可执行的提示词约束，并用 moodboard 与客户对齐审美，减少主观扯皮。",
      },
    ],
    updatedAt: "2026-03-28",
  },
  {
    id: "c-009",
    title: "飞书 × Notion：AI 自动化与知识库",
    subtitle: "用自动化流程把会议纪要、任务跟进和周报串起来，让知识库「活」在业务里。",
    category: "tools",
    categoryLabel: "AI工具教程",
    price: 139,
    originalPrice: 259,
    isVipFree: true,
    isHot: false,
    isNew: true,
    coverEmoji: "🗂️",
    instructorName: "宋乔",
    instructorTitle: "效率顾问 · 100+ 团队内训",
    studentCount: 8960,
    rating: 4.65,
    totalDuration: "9小时10分",
    chapterCount: 5,
    tags: ["飞书", "Notion", "自动化"],
    highlights: [
      "设计「会议—纪要—任务—复盘」最小闭环",
      "用模板与数据库字段规范团队输入，提升 AI 摘要质量",
      "掌握周报、OKR 跟进类自动化的触发条件设计",
      "了解权限与敏感信息在自动化中的处理方式",
      "获得可直接改用的自动化蓝图与检查表",
    ],
    chapters: [
      { id: "c-009-ch-1", title: "知识库信息架构设计", duration: "45分", isFree: true, type: "video" },
      { id: "c-009-ch-2", title: "会议纪要：结构化提取", duration: "1小时10分", isFree: true, type: "video" },
      { id: "c-009-ch-3", title: "飞书多维表与自动化触发", duration: "1小时25分", isFree: false, type: "video" },
      { id: "c-009-ch-4", title: "Notion AI：数据库与摘要", duration: "1小时20分", isFree: false, type: "video" },
      { id: "c-009-ch-5", title: "周报与风险清单自动化", duration: "55分", isFree: false, type: "doc" },
    ],
    samplePrompt:
      "你是企业效率顾问，熟悉飞书与 Notion。我们团队规模约{{人数}}，主要协作场景是{{产品/销售/运营}}，目前痛点是：会议决议落实慢、周报信息重复、任务状态不透明。请用中文输出：①建议的知识库顶层目录与命名规范（不少于8个节点）；②一场例会结束后，从纪要到任务分发的自动化步骤（逐步说明触发器、字段、责任人）；③周报模板应包含的字段清单及AI可自动填充的部分；④需要人工终审的环节及原因；⑤一份「上线前自检表」不少于10条。语气务实，避免推荐过多工具导致无法落地。",
    contentSections: [
      {
        heading: "课程价值",
        body:
          "工具教程不止于「点哪里」，而是把流程设计讲清楚：谁输入、何时触发、机器做什么、人必须确认什么。这样 AI 摘要与自动化才不会变成摆设。",
      },
      {
        heading: "适用团队",
        body:
          "适合 5～200 人规模的职能团队；若公司已强制使用飞书或 Notion 之一，可侧重对应章节，另一工具作为迁移参考。",
      },
    ],
    updatedAt: "2026-04-17",
  },
];

function assertChapterCount(coursesList: Course[]) {
  for (const c of coursesList) {
    if (c.chapters.length !== c.chapterCount) {
      throw new Error(
        `Course ${c.id}: chapterCount (${c.chapterCount}) must equal chapters.length (${c.chapters.length})`,
      );
    }
  }
}

assertChapterCount(COURSES);

export function getCourseById(id: string): Course | undefined {
  return COURSES.find((c) => c.id === id);
}

export const membershipPlans = [
  {
    id: "p1",
    name: "月度会员",
    price: "¥99",
    unit: "/月",
    bullets: ["全站课程畅学", "每月上新提醒", "社群答疑（工作日）"],
    highlight: false,
  },
  {
    id: "p2",
    name: "年度会员",
    price: "¥699",
    unit: "/年",
    bullets: ["相当于 ¥58/月", "独家直播课", "1v1 职业方向咨询 1 次"],
    highlight: true,
  },
] as const;
