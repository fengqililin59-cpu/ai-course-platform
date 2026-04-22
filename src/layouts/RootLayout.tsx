import { Outlet, Link } from "react-router-dom";
import { SiteHeader } from "@/components/SiteHeader";
import { ScrollToTop } from "@/components/ScrollToTop";

export function RootLayout() {
  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse at top, black 0%, transparent 65%)",
        }}
      />
      <ScrollToTop />
      <SiteHeader />
      <Outlet />
      <footer className="border-t border-border/60 py-10">
        <div className="mx-auto flex min-w-0 max-w-6xl flex-col items-center justify-between gap-4 px-4 text-center text-xs text-muted-foreground sm:flex-row sm:text-left sm:px-6">
          <p>© 2026 智学 AI · 专注AI变现，让普通人也能用AI赚到钱</p>
          <div className="flex max-w-full flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:justify-end">
            <Link to="/" className="shrink-0 hover:text-foreground">
              首页
            </Link>
            <Link to="/courses" className="shrink-0 hover:text-foreground">
              全部课程
            </Link>
            <Link to="/vip" className="shrink-0 hover:text-foreground">
              开通会员
            </Link>
            <Link to="/profile" className="shrink-0 hover:text-foreground">
              个人中心
            </Link>
            <a href="#" className="shrink-0 hover:text-foreground">
              服务条款
            </a>
            <a href="#" className="shrink-0 hover:text-foreground">
              隐私政策
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
