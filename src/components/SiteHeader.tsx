import { Link, NavLink } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "rounded-md px-2 py-2 text-sm font-medium transition-colors sm:px-3",
    isActive
      ? "bg-secondary text-foreground"
      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
  );

/** 与主导航结构一致，金色/橙色强调（与紫色会员入口区分） */
const navClassGold = ({ isActive }: { isActive: boolean }) =>
  cn(
    "rounded-md px-2 py-2 text-sm font-medium transition-colors sm:px-3",
    isActive
      ? "bg-amber-500/20 text-amber-900 ring-1 ring-amber-500/35 dark:bg-amber-400/15 dark:text-amber-100"
      : "text-amber-700 hover:bg-amber-500/15 hover:text-amber-900 dark:text-amber-400 dark:hover:bg-amber-400/10 dark:hover:text-amber-200",
  );

export function SiteHeader() {
  const { phone, setLoginOpen, logout } = useAuth();

  const avatarDigits =
    phone && phone.length >= 2 ? phone.slice(-2) : "—";

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 min-w-0 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
        <Link
          to="/"
          className="flex min-w-0 max-w-[42%] shrink-0 items-center gap-2 sm:max-w-none"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold tracking-tight">智学 AI</p>
            <p className="hidden truncate text-[11px] text-muted-foreground sm:block">
              专业 AI 课程平台
            </p>
          </div>
        </Link>
        <nav className="hidden min-w-0 max-w-full shrink flex-wrap items-center justify-center gap-1 sm:flex">
          <NavLink to="/" end className={navClass}>
            首页
          </NavLink>
          <NavLink to="/courses" end className={navClass}>
            全部课程
          </NavLink>
          <NavLink to="/jobs" className={navClass}>
            就业雷达
          </NavLink>
          <NavLink to="/vip" className={navClass}>
            开通会员
          </NavLink>
          <NavLink to="/services" className={navClassGold}>
            AI定制服务
          </NavLink>
          <NavLink to="/profile" end className={navClass}>
            个人中心
          </NavLink>
        </nav>
        <div className="flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-1 sm:gap-2">
          <Button variant="ghost" size="sm" className="px-2 sm:hidden" asChild>
            <NavLink to="/profile" end title="个人中心">
              我的
            </NavLink>
          </Button>
          <Button variant="ghost" size="sm" className="px-2 sm:hidden" asChild>
            <NavLink to="/vip" title="开通会员">
              会员
            </NavLink>
          </Button>
          <Button variant="ghost" size="sm" className="px-2 text-amber-700 dark:text-amber-400 sm:hidden" asChild>
            <NavLink to="/services" title="AI定制服务">
              定制
            </NavLink>
          </Button>
          <Button variant="ghost" size="sm" className="px-2 sm:hidden" asChild>
            <NavLink to="/jobs" title="就业雷达">
              雷达
            </NavLink>
          </Button>
          <Button variant="ghost" size="sm" className="px-2 sm:hidden" asChild>
            <NavLink to="/courses" end>
              课程
            </NavLink>
          </Button>
          <Button variant="ghost" size="sm" className="hidden px-3 sm:inline-flex" asChild>
            <NavLink to="/courses" end>
              浏览课程
            </NavLink>
          </Button>
          {phone ? (
            <>
              <Link
                to="/profile"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground ring-offset-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                title={phone}
                aria-label="进入个人中心"
              >
                {avatarDigits}
              </Link>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="px-2.5 text-xs sm:px-3 sm:text-sm"
                onClick={() => logout()}
              >
                退出
              </Button>
            </>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="px-2.5 text-xs sm:px-3 sm:text-sm"
              onClick={() => setLoginOpen(true)}
            >
              登录
            </Button>
          )}
          <Button size="sm" className="whitespace-nowrap px-2.5 sm:px-3">
            免费试听
          </Button>
        </div>
      </div>
    </header>
  );
}
