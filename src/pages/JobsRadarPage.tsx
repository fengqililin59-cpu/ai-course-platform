import * as React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Briefcase,
  ChevronRight,
  Loader2,
  Radar,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCoursesCatalog } from "@/contexts/CoursesCatalogContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { copyToClipboard } from "@/lib/copyToClipboard";
import {
  buildFallbackReport,
  isUnlockedForPhone,
  jobsAnalysisApiUrl,
  readReportCache,
  setUnlockedForPhone,
  writeReportCache,
  type JobsQuizAnswers,
} from "@/lib/jobsAnalysisReport";
import type { Course, CourseCategory } from "@/data/courses";

type Difficulty = "入门" | "进阶" | "专业";

type SkillDemandRow = {
  id: string;
  name: string;
  emoji: string;
  jobs: number;
  salaryLabel: string;
  /** 薪资区间上限（K），用于横向条对比 */
  salaryMaxK: number;
  difficulty: Difficulty;
  category: CourseCategory;
};

const SKILL_DEMAND_TOP10: SkillDemandRow[] = [
  {
    id: "s1",
    name: "ChatGPT/提示词工程",
    emoji: "✨",
    jobs: 3241,
    salaryLabel: "12-20K",
    salaryMaxK: 20,
    difficulty: "入门",
    category: "prompt",
  },
  {
    id: "s2",
    name: "Python+AI开发",
    emoji: "🐍",
    jobs: 8923,
    salaryLabel: "20-40K",
    salaryMaxK: 40,
    difficulty: "专业",
    category: "tools",
  },
  {
    id: "s3",
    name: "Midjourney/AI绘图",
    emoji: "🎨",
    jobs: 1876,
    salaryLabel: "8-15K",
    salaryMaxK: 15,
    difficulty: "进阶",
    category: "tools",
  },
  {
    id: "s4",
    name: "AI产品经理",
    emoji: "📋",
    jobs: 2341,
    salaryLabel: "18-35K",
    salaryMaxK: 35,
    difficulty: "进阶",
    category: "money",
  },
  {
    id: "s5",
    name: "AI数据标注",
    emoji: "🏷️",
    jobs: 5621,
    salaryLabel: "5-10K",
    salaryMaxK: 10,
    difficulty: "入门",
    category: "tools",
  },
  {
    id: "s6",
    name: "Cursor/AI编程",
    emoji: "💻",
    jobs: 1234,
    salaryLabel: "15-30K",
    salaryMaxK: 30,
    difficulty: "进阶",
    category: "tools",
  },
  {
    id: "s7",
    name: "AI视频制作",
    emoji: "🎬",
    jobs: 987,
    salaryLabel: "8-18K",
    salaryMaxK: 18,
    difficulty: "入门",
    category: "tools",
  },
  {
    id: "s8",
    name: "AI运营/内容",
    emoji: "📣",
    jobs: 4532,
    salaryLabel: "8-15K",
    salaryMaxK: 15,
    difficulty: "入门",
    category: "money",
  },
  {
    id: "s9",
    name: "Claude/大模型应用",
    emoji: "🤖",
    jobs: 1123,
    salaryLabel: "25-50K",
    salaryMaxK: 50,
    difficulty: "专业",
    category: "prompt",
  },
  {
    id: "s10",
    name: "AI自动化/工作流",
    emoji: "⚡",
    jobs: 789,
    salaryLabel: "12-25K",
    salaryMaxK: 25,
    difficulty: "进阶",
    category: "tools",
  },
];

const MAX_SALARY_K = Math.max(...SKILL_DEMAND_TOP10.map((s) => s.salaryMaxK));

function difficultyBadgeClass(d: Difficulty): string {
  if (d === "入门")
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200";
  if (d === "进阶")
    return "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100";
  return "border-violet-500/40 bg-violet-500/10 text-violet-900 dark:text-violet-100";
}

type QuizBg = "student" | "worker" | "freelancer" | "founder" | "";
type QuizGoal = "job" | "side" | "startup" | "efficiency" | "";
type QuizTime = "m30" | "h1" | "h2plus" | "";

const QUIZ_BG_LABEL: Record<Exclude<QuizBg, "">, string> = {
  student: "在校学生",
  worker: "职场人",
  freelancer: "自由职业",
  founder: "创业者",
};

const QUIZ_GOAL_LABEL: Record<Exclude<QuizGoal, "">, string> = {
  job: "找工作",
  side: "副业赚钱",
  startup: "创业",
  efficiency: "提升效率",
};

const QUIZ_TIME_LABEL: Record<Exclude<QuizTime, "">, string> = {
  m30: "30分钟",
  h1: "1小时",
  h2plus: "2小时以上",
};

const AI_PREVIEW_LINES = [
  "📊 你的专属AI学习路径报告",
  "· 适合你的3条变现路径",
  "· 预计学习周期与收入预测",
  "· 避坑指南：你这类人最容易犯的错误",
  "· 推荐学习顺序",
] as const;

function basicReasonFrom(full: string): string {
  const segs = full
    .split("。")
    .map((s) => s.trim())
    .filter(Boolean);
  if (segs.length === 0) return full.trim();
  const two = segs.slice(0, 2).join("。");
  return two.endsWith("。") ? two : `${two}。`;
}

function recommendFromQuiz(
  bg: QuizBg,
  goal: QuizGoal,
  time: QuizTime,
  catalog: Course[],
): { picks: Course[]; reason: string; basicReason: string } {
  if (!bg || !goal || !time) {
    return {
      picks: [],
      reason: "请先完成上方三个问题，我们会根据你的情况推荐 1–2 门课程。",
      basicReason: "",
    };
  }

  const order: CourseCategory[] = [];
  let reason = "";

  if (goal === "job") {
    order.push("tools", "prompt");
    reason =
      bg === "student"
        ? "求职阶段优先补齐「可写进简历」的工程与提示词能力，岗位匹配面更广。"
        : "招聘方更看重可交付的 AI 落地与协作开发能力，建议从工具链与提示词工程双线补强。";
  } else if (goal === "side") {
    order.push("money", "prompt");
    reason =
      bg === "freelancer"
        ? "副业接单侧重变现闭环与可复制交付，提示词能显著提效报价与产出。"
        : "副业路径建议先跑通「需求—报价—交付」闭环，再用提示词把产能拉起来。";
  } else if (goal === "startup") {
    order.push("money", "tools");
    reason =
      bg === "founder"
        ? "创业更关注单位人效与验证速度：商业化方法论叠加自动化工具，能更快试错迭代。"
        : "从 0 到 1 建议先建立可售卖的业务假设，再用工具把关键路径自动化。";
  } else {
    order.push("tools", "prompt");
    reason =
      "提升日常效率优先掌握「编辑器 + 自动化 + 提示词模板」，把重复劳动交给 AI。";
  }

  if (time === "m30") {
    reason +=
      " 你每天可投入时间较少，建议先选一门最贴近当前目标的课跟完前两周，再扩展。";
  } else if (time === "h2plus") {
    reason += " 可支配时间充足，可以按推荐顺序连学两门，形成组合技能栈。";
  }

  const picks: Course[] = [];
  for (const cat of order) {
    for (const c of catalog) {
      if (c.category === cat && !picks.some((p) => p.id === c.id)) {
        picks.push(c);
        if (picks.length >= 2) break;
      }
    }
    if (picks.length >= 2) break;
  }
  if (picks.length === 0) {
    const r =
      "当前分类下课程较少，建议从下列课程开始；更多内容可在课程列表中探索。";
    return {
      picks: catalog.slice(0, 2),
      reason: r,
      basicReason: basicReasonFrom(r),
    };
  }
  if (picks.length === 1) {
    const extra = catalog.find((c) => c.id !== picks[0].id);
    if (extra) picks.push(extra);
  }

  const finalReason = reason;
  return {
    picks: picks.slice(0, 2),
    reason: finalReason,
    basicReason: basicReasonFrom(finalReason),
  };
}

export function JobsRadarPage() {
  const { courses } = useCoursesCatalog();
  const { phone, setLoginOpen } = useAuth();
  const { showToast } = useToast();

  React.useEffect(() => {
    document.title = "AI技能就业雷达 - AIlearn Pro";
  }, []);

  const [bg, setBg] = React.useState<QuizBg>("");
  const [goal, setGoal] = React.useState<QuizGoal>("");
  const [time, setTime] = React.useState<QuizTime>("");

  const { picks, reason, basicReason } = React.useMemo(
    () => recommendFromQuiz(bg, goal, time, courses),
    [bg, goal, time, courses],
  );

  const quizComplete = Boolean(bg && goal && time);
  const quizAnswers: JobsQuizAnswers | null = React.useMemo(() => {
    if (!quizComplete || !bg || !goal || !time) return null;
    return {
      identity: QUIZ_BG_LABEL[bg],
      goal: QUIZ_GOAL_LABEL[goal],
      studyTime: QUIZ_TIME_LABEL[time],
    };
  }, [quizComplete, bg, goal, time]);

  const [unlocked, setUnlocked] = React.useState(false);
  React.useEffect(() => {
    setUnlocked(isUnlockedForPhone(phone));
  }, [phone]);

  const [pendingUnlock, setPendingUnlock] = React.useState(false);
  const [analysisLoading, setAnalysisLoading] = React.useState(false);
  const [analysisError, setAnalysisError] = React.useState(false);
  const [fullReportText, setFullReportText] = React.useState<string | null>(null);
  const [typedReport, setTypedReport] = React.useState("");
  const [typingDone, setTypingDone] = React.useState(false);
  const typingTimerRef = React.useRef<number | null>(null);

  const stopTyping = React.useCallback(() => {
    if (typingTimerRef.current !== null) {
      window.clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
  }, []);

  const startTyping = React.useCallback(
    (fullText: string) => {
      stopTyping();
      setTypedReport("");
      setTypingDone(false);
      let i = 0;
      const step = () => {
        i = Math.min(i + 3, fullText.length);
        setTypedReport(fullText.slice(0, i));
        if (i < fullText.length) {
          typingTimerRef.current = window.setTimeout(step, 16);
        } else {
          typingTimerRef.current = null;
          setTypingDone(true);
        }
      };
      typingTimerRef.current = window.setTimeout(step, 0);
    },
    [stopTyping],
  );

  React.useEffect(() => () => stopTyping(), [stopTyping]);

  React.useEffect(() => {
    if (!quizComplete || !phone || !bg || !goal || !time) return;
    if (!isUnlockedForPhone(phone)) return;
    const cached = readReportCache(phone, bg, goal, time);
    if (cached) {
      setFullReportText(cached);
      setTypedReport(cached);
      setTypingDone(true);
      setAnalysisError(false);
    } else {
      setFullReportText(null);
      setTypedReport("");
      setTypingDone(false);
    }
  }, [quizComplete, phone, bg, goal, time]);

  const runClaudeAnalysis = React.useCallback(
    async (
      answers: JobsQuizAnswers,
      b: QuizBg,
      g: QuizGoal,
      t: QuizTime,
      phoneForRun: string,
    ) => {
      setUnlockedForPhone(phoneForRun);
      setUnlocked(true);
      setAnalysisLoading(true);
      setAnalysisError(false);
      setFullReportText(null);
      setTypedReport("");
      setTypingDone(false);
      stopTyping();

      let text: string;
      try {
        const res = await fetch(jobsAnalysisApiUrl(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            identity: answers.identity,
            goal: answers.goal,
            studyTime: answers.studyTime,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          text?: string;
        };
        if (!res.ok || !data?.ok || typeof data.text !== "string" || !data.text) {
          throw new Error("bad response");
        }
        text = data.text;
        setAnalysisError(false);
      } catch {
        setAnalysisError(true);
        showToast("AI分析暂时不可用，请稍后重试", "error");
        text = buildFallbackReport(answers);
      }
      setAnalysisLoading(false);

      setFullReportText(text);
      writeReportCache(phoneForRun, b, g, t, text);
      startTyping(text);
    },
    [showToast, startTyping, stopTyping],
  );

  React.useEffect(() => {
    if (!phone || !pendingUnlock) return;
    if (!quizComplete || !quizAnswers || !bg || !goal || !time) {
      setPendingUnlock(false);
      return;
    }
    setPendingUnlock(false);
    void runClaudeAnalysis(quizAnswers, bg, goal, time, phone);
  }, [
    phone,
    pendingUnlock,
    quizComplete,
    quizAnswers,
    bg,
    goal,
    time,
    runClaudeAnalysis,
  ]);

  function handleUnlockClick() {
    if (!quizAnswers || !bg || !goal || !time) return;
    if (!phone) {
      setPendingUnlock(true);
      setLoginOpen(true);
      return;
    }
    void runClaudeAnalysis(quizAnswers, bg, goal, time, phone);
  }

  function handleRegenerateClick() {
    if (!quizAnswers || !bg || !goal || !time || !phone) return;
    void runClaudeAnalysis(quizAnswers, bg, goal, time, phone);
  }

  async function handleSaveReport() {
    const body = typedReport || fullReportText || "";
    if (!body.trim()) return;
    const ok = await copyToClipboard(body);
    showToast(ok ? "报告已复制到剪贴板" : "复制失败，请手动选择文本", ok ? "success" : "error");
  }

  return (
    <main className="min-w-0">
      {/* Hero */}
      <section className="relative isolate overflow-hidden border-b border-border/60 bg-gradient-to-b from-slate-950 via-indigo-950/90 to-background">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
            maskImage:
              "radial-gradient(ellipse at 50% 0%, black 0%, transparent 65%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-cyan-500/25 blur-[100px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-violet-600/30 blur-[90px]"
        />
        <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <Badge
            variant="outline"
            className="border-white/20 bg-white/5 text-white/90 backdrop-blur"
          >
            <Radar className="mr-1 h-3.5 w-3.5" aria-hidden />
            市场需求快照
          </Badge>
          <h1 className="mt-6 max-w-3xl text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            AI技能就业雷达
          </h1>
          <p className="mt-4 max-w-2xl text-pretty text-base leading-relaxed text-white/80 sm:text-lg">
            实时追踪市场需求，找到最值钱的AI技能
          </p>
          <p className="mt-6 inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/85 backdrop-blur">
            <Sparkles className="h-4 w-4 shrink-0 text-amber-300" aria-hidden />
            数据更新于：今日
          </p>
        </div>
      </section>

      {/* TOP 10 */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            热门需求
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            热门 AI 技能需求排行（TOP 10）
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            以下为平台整理的参考数据，后续将支持接入实时招聘 API。
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {SKILL_DEMAND_TOP10.map((row, index) => (
            <Card
              key={row.id}
              className="flex flex-col border-border/70 shadow-sm transition-shadow hover:shadow-md"
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-2xl leading-none" aria-hidden>
                    {row.emoji}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    #{index + 1}
                  </span>
                </div>
                <CardTitle className="mt-2 text-base leading-snug">
                  {row.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="mt-auto flex flex-col gap-3 pt-0">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="inline-flex items-center gap-1 font-medium text-foreground">
                    <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                    {row.jobs.toLocaleString("zh-CN")}
                    <span className="text-muted-foreground">个岗位</span>
                  </span>
                  <span
                    className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400"
                    title="需求热度趋势"
                  >
                    <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                    需求↑
                  </span>
                </div>
                <p className="text-sm">
                  <span className="text-muted-foreground">平均薪资 </span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {row.salaryLabel}
                  </span>
                </p>
                <Badge
                  variant="outline"
                  className={cn("w-fit text-xs", difficultyBadgeClass(row.difficulty))}
                >
                  {row.difficulty}
                </Badge>
                <Button variant="secondary" size="sm" className="w-full" asChild>
                  <Link to={`/courses?category=${row.category}`}>
                    查看相关课程
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* 薪资对比条 */}
      <section className="border-y border-border/60 bg-muted/25 py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
            薪资上限对比（参考）
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            取各技能薪资区间上限（K）做横向对比，不代表个体实际收入。
          </p>
          <ul className="mt-8 space-y-4" aria-label="各技能薪资上限对比">
            {SKILL_DEMAND_TOP10.map((row) => {
              const pct = Math.round((row.salaryMaxK / MAX_SALARY_K) * 100);
              return (
                <li key={`bar-${row.id}`} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate font-medium">
                      <span className="mr-1.5" aria-hidden>
                        {row.emoji}
                      </span>
                      {row.name}
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      上限 {row.salaryMaxK}K
                    </span>
                  </div>
                  <div
                    className="h-2.5 w-full overflow-hidden rounded-full bg-border/80"
                    role="presentation"
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 transition-[width] duration-500 dark:from-emerald-500 dark:to-cyan-400"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* 我适合学什么 */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          我适合学什么？
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          回答三个简单问题，获得 1–2 门课程推荐（规则可后续升级为模型或画像系统）。
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-lg">1. 你现在的职业背景？</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {(
                [
                  ["student", "在校学生"],
                  ["worker", "职场人"],
                  ["freelancer", "自由职业"],
                  ["founder", "创业者"],
                ] as const
              ).map(([v, label]) => (
                <Button
                  key={v}
                  type="button"
                  size="sm"
                  variant={bg === v ? "default" : "outline"}
                  onClick={() => setBg(v)}
                >
                  {label}
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-lg">2. 你的目标？</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {(
                [
                  ["job", "找工作"],
                  ["side", "副业赚钱"],
                  ["startup", "创业"],
                  ["efficiency", "提升效率"],
                ] as const
              ).map(([v, label]) => (
                <Button
                  key={v}
                  type="button"
                  size="sm"
                  variant={goal === v ? "default" : "outline"}
                  onClick={() => setGoal(v)}
                >
                  {label}
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/70 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">3. 每天可投入时间？</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {(
                [
                  ["m30", "30分钟"],
                  ["h1", "1小时"],
                  ["h2plus", "2小时以上"],
                ] as const
              ).map(([v, label]) => (
                <Button
                  key={v}
                  type="button"
                  size="sm"
                  variant={time === v ? "default" : "outline"}
                  onClick={() => setTime(v)}
                >
                  {label}
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>

        {!quizComplete ? (
          <Card className="mt-8 border-primary/25 bg-gradient-to-br from-primary/10 via-card to-violet-500/5">
            <CardHeader>
              <CardTitle className="text-lg">推荐结果</CardTitle>
              <CardDescription>{reason}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
              {picks.map((c) => (
                <Button key={c.id} variant="secondary" asChild>
                  <Link to={`/courses/${c.id}`} className="gap-2">
                    {c.coverEmoji} {c.title}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              ))}
            </CardContent>
          </Card>
        ) : (
          <Card className="mt-8 border-primary/25 bg-gradient-to-br from-primary/10 via-card to-violet-500/5">
            <CardHeader>
              <CardTitle className="text-lg">测试结果</CardTitle>
              <CardDescription>
                基础推荐为静态规则；解锁后可由 Claude 生成长文报告（当前为模拟支付，免费体验）。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-10">
              <div className="space-y-4 rounded-xl border border-border/70 bg-card/60 p-5 shadow-sm">
                <p className="text-sm font-semibold tracking-tight text-foreground">
                  A. 基础推荐（免费，静态逻辑）
                </p>
                <div className="flex flex-col flex-wrap gap-3 sm:flex-row sm:items-center">
                  {picks.map((c) => (
                    <Button key={c.id} variant="secondary" asChild>
                      <Link to={`/courses/${c.id}`} className="gap-2">
                        {c.coverEmoji} {c.title}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  ))}
                  {picks.length === 0 && (
                    <Button variant="outline" asChild>
                      <Link to="/courses">去课程列表看看</Link>
                    </Button>
                  )}
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {basicReason || reason}
                </p>
              </div>

              <div className="space-y-4 rounded-xl border border-amber-500/25 bg-gradient-to-br from-amber-500/5 via-card to-yellow-500/5 p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold tracking-tight text-foreground">
                    B. AI深度分析（付费解锁）
                  </p>
                  {analysisError && (
                    <Badge variant="outline" className="text-xs">
                      已启用离线兜底内容
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  支付功能接入中，现在免费体验
                </p>

                {!unlocked && !analysisLoading && (
                  <>
                    <div className="relative overflow-hidden rounded-lg border border-border/60 bg-muted/40">
                      <div
                        className="pointer-events-none select-none whitespace-pre-line p-4 text-sm leading-relaxed text-foreground/90 blur-[5px]"
                        aria-hidden
                      >
                        {AI_PREVIEW_LINES.join("\n")}
                      </div>
                      <div
                        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-background/10 to-background/55"
                        aria-hidden
                      />
                    </div>
                    <Button
                      type="button"
                      className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-900 shadow-md hover:from-amber-400 hover:to-yellow-300 sm:w-auto"
                      onClick={handleUnlockClick}
                    >
                      ¥9.9 解锁完整AI分析报告
                    </Button>
                  </>
                )}

                {unlocked && !analysisLoading && !fullReportText && !typedReport && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      你已解锁该功能（本设备已记录）。若更换了测试选项，可重新生成报告。
                    </p>
                    <Button type="button" variant="secondary" onClick={handleRegenerateClick}>
                      生成 / 更新 AI 深度报告
                    </Button>
                  </div>
                )}

                {analysisLoading && (
                  <div
                    className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 px-4 py-6 text-sm text-muted-foreground"
                    role="status"
                    aria-live="polite"
                  >
                    <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
                    <span>🤖 Claude AI 正在为你定制专属规划...</span>
                  </div>
                )}

                {(typedReport || fullReportText) && !analysisLoading && (
                  <div className="space-y-4">
                    <article className="whitespace-pre-wrap rounded-lg border border-border/60 bg-background/80 p-4 text-sm leading-relaxed">
                      {typedReport || fullReportText}
                    </article>
                    {typingDone && typedReport && (
                      <>
                        <p className="text-center text-xs text-muted-foreground">
                          ✅ 报告已生成 · 基于你的个人情况定制
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full sm:w-auto"
                          onClick={() => void handleSaveReport()}
                        >
                          保存报告
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      {/* 底部 CTA */}
      <section className="border-t border-border/60 bg-muted/20 py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <p className="text-balance text-xl font-semibold tracking-tight sm:text-2xl">
            看到市场需求了？现在开始学习
          </p>
          <Button size="lg" className="mt-6 gap-2" asChild>
            <Link to="/courses">
              进入课程列表
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
