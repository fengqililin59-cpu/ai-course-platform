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

export type CourseReviewTag = "已完课" | "学习中";

export type CourseReview = {
  name: string;
  avatar: string;
  rating: number;
  content: string;
  date: string;
  tag: CourseReviewTag;
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
  /** 精选展示 3 条；reviewCount 为全站累计评价数（含未展示） */
  reviews: readonly [CourseReview, CourseReview, CourseReview];
  reviewCount: number;
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
      "你是「B端AI落地顾问」。我的行业是{{填写}}，目标客户是{{填写}}，我目前会的工具是{{ChatGPT/Cursor/API等}}。请输出一份「7天试点方案」，要求用中文条列：①可量化的目标与成功指标；②试点范围及明确「不做清单」以免范围蔓延；③3个典型业务场景示例，每个给一组输入输出示例；④需要人工复核的风险点与抽检频率；⑤建议报价区间与分阶段交付里程碑。语气专业克制，避免空洞形容词。",
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
    reviews: [
      {
        name: "王**",
        avatar: "王",
        rating: 5,
        content:
          "跟着第3章产品化作业做完，当晚把套餐说明挂闲鱼，第二天就有人咨询，第三天成交第一单39元。钱不多但跑通了闭环，现在敢按课里的模板报价了，心里踏实很多。",
        date: "2026-03-15",
        tag: "已完课",
      },
      {
        name: "李**",
        avatar: "李",
        rating: 5,
        content:
          "访谈提纲和里程碑表直接拿去跟客户开会，对方说比很多外包写得还清楚。还在啃交付章节，但已经用试点单思路谈下一个小单，感觉这课值回票价。",
        date: "2026-03-28",
        tag: "学习中",
      },
      {
        name: "张**",
        avatar: "张",
        rating: 4,
        content:
          "副业地图那章帮我砍掉两个假需求，省了不少瞎忙活。报价单我改了两版才顺手，要是能多几个不同行业的示例就更好了，整体已经很接地气。",
        date: "2026-04-02",
        tag: "已完课",
      },
    ],
    reviewCount: 2198,
    updatedAt: "2026-04-18",
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

function assertReviews(coursesList: Course[]) {
  for (const c of coursesList) {
    if (c.reviews.length !== 3) {
      throw new Error(`Course ${c.id}: reviews must contain exactly 3 items`);
    }
    for (const r of c.reviews) {
      if (r.rating < 1 || r.rating > 5 || !Number.isInteger(r.rating)) {
        throw new Error(`Course ${c.id}: invalid review rating`);
      }
    }
    if (c.reviewCount < c.reviews.length) {
      throw new Error(`Course ${c.id}: reviewCount should be >= featured reviews`);
    }
  }
}

assertChapterCount(COURSES);
assertReviews(COURSES);

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
