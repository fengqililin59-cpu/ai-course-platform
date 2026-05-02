import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { LogOut, LayoutDashboard, BookOpen, PlusCircle } from "lucide-react";
import { adminLogout } from "@/admin/AdminAuth";
import { cn } from "@/lib/utils";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
    isActive
      ? "bg-white/10 text-white"
      : "text-slate-300 hover:bg-white/5 hover:text-white",
  );

export function AdminLayout() {
  const navigate = useNavigate();

  function handleLogout() {
    adminLogout();
    navigate("/admin/login", { replace: true });
  }

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-slate-800 bg-slate-900 text-slate-100 md:flex">
        <div className="border-b border-slate-800 px-4 py-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Admin
          </p>
          <p className="mt-1 text-sm font-semibold text-white">智学 AI 后台</p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-3" aria-label="后台导航">
          <NavLink to="/admin/dashboard" className={navLinkClass}>
            <LayoutDashboard className="h-4 w-4 shrink-0 opacity-80" />
            数据总览
          </NavLink>
          <NavLink to="/admin/courses" className={navLinkClass}>
            <BookOpen className="h-4 w-4 shrink-0 opacity-80" />
            课程管理
          </NavLink>
          <NavLink to="/admin/courses/new" className={navLinkClass}>
            <PlusCircle className="h-4 w-4 shrink-0 opacity-80" />
            添加课程
          </NavLink>
        </nav>
        <div className="border-t border-slate-800 p-3 text-xs text-slate-500">
          与前台样式隔离
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <nav
          className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50 px-2 py-2 md:hidden dark:border-slate-800 dark:bg-slate-900"
          aria-label="后台快捷导航"
        >
          <NavLink
            to="/admin/dashboard"
            className={({ isActive }) =>
              cn(
                "shrink-0 rounded-md px-3 py-2 text-xs font-medium",
                isActive ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white" : "text-slate-600 dark:text-slate-400",
              )
            }
          >
            总览
          </NavLink>
          <NavLink
            to="/admin/courses"
            className={({ isActive }) =>
              cn(
                "shrink-0 rounded-md px-3 py-2 text-xs font-medium",
                isActive ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white" : "text-slate-600 dark:text-slate-400",
              )
            }
          >
            课程
          </NavLink>
          <NavLink
            to="/admin/courses/new"
            className={({ isActive }) =>
              cn(
                "shrink-0 rounded-md px-3 py-2 text-xs font-medium",
                isActive ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white" : "text-slate-600 dark:text-slate-400",
              )
            }
          >
            添加
          </NavLink>
        </nav>
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/admin/dashboard"
              className="font-semibold text-slate-900 dark:text-white md:hidden"
            >
              后台
            </Link>
            <h1 className="truncate text-base font-semibold text-slate-900 dark:text-white">
              后台管理
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/"
              className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline"
            >
              查看前台
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              <LogOut className="h-4 w-4" />
              退出登录
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
