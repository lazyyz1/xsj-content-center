"use client";

import { BookOpenCheck, ChevronDown, Files, FolderKanban, Home, Lightbulb, Menu, Send, Settings, ShieldCheck, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogoutButton } from "./logout-button";
import { GlobalSearch } from "./global-search";

const links = [
  { label: "开始创作", href: "/dashboard", icon: Home },
  { label: "项目", href: "/projects", icon: FolderKanban },
  { label: "灵感研究", href: "/discovery", icon: Lightbulb },
  { label: "资料", href: "/library", icon: Files },
  { label: "方法", href: "/projects/methods", icon: BookOpenCheck },
  { label: "发布", href: "/calendar", icon: Send },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  if (href === "/projects") return pathname === href || (pathname.startsWith("/projects/") && !pathname.startsWith("/projects/methods"));
  if (href === "/projects/methods") return pathname.startsWith("/projects/methods") || pathname.startsWith("/library/methods");
  return pathname.startsWith(href);
}

function Brand() {
  return <Link href="/dashboard" className="flex min-h-12 items-center gap-3 rounded-xl px-2 focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
    <span className="grid h-9 w-9 place-items-center rounded-xl bg-[linear-gradient(145deg,#67a6ff,#246bfd_58%,#5b55e7)] text-white shadow-[0_12px_28px_-16px_rgb(36_107_253/0.9)]"><Sparkles size={18} /></span>
    <span><strong className="block text-[15px] tracking-tight">鑫世界 Studio</strong><span className="block text-[11px] text-[var(--text-tertiary)]">AI 内容工作台</span></span>
  </Link>;
}

function Navigation({ pathname, mobile = false }: { pathname: string; mobile?: boolean }) {
  return <nav aria-label="主导航" className={mobile ? "grid gap-1" : "grid gap-1.5"}>
    {links.map(({ label, icon: Icon, href }) => {
      const active = isActive(pathname, href);
      return <Link key={label} href={href} aria-current={active ? "page" : undefined} className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${active ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--text-secondary)] hover:bg-white/70 hover:text-[var(--text-primary)]"}`}>
        <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
      </Link>;
    })}
  </nav>;
}

export function Sidebar({ workspaceName, userName, isSystemAdmin = false }: { workspaceName: string; userName: string; isSystemAdmin?: boolean }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  return <>
    <a href="#main-content" className="fixed left-3 top-3 z-[100] -translate-y-20 rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white focus:translate-y-0">跳到主要内容</a>
    <aside className="app-sidebar" aria-label="应用导航">
      <div className="flex h-full flex-col p-4">
        <Brand />
        <div className="mt-7"><Navigation pathname={pathname} /></div>
        <div className="mt-auto rounded-2xl border border-white/75 bg-white/55 p-2 shadow-[var(--shadow-xs)]">
          <details className="group">
            <summary className="flex min-h-12 list-none items-center gap-3 rounded-xl px-2 hover:bg-white/75">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[linear-gradient(145deg,#d7e8ff,#bdd7fb)] text-sm font-semibold text-[var(--accent)]">{userName.trim().slice(0, 1) || "我"}</span>
              <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{userName}</strong><span className="block truncate text-[11px] text-[var(--text-tertiary)]">{workspaceName}</span></span>
              <ChevronDown size={15} className="text-[var(--text-tertiary)] transition-transform group-open:rotate-180" />
            </summary>
            <div className="mt-1 grid gap-1 border-t border-[var(--border)] pt-2">
              <Link href="/settings" className="flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm text-[var(--text-secondary)] hover:bg-white"><Settings size={16} />设置</Link>
              <Link href="/settings/members" className="flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm text-[var(--text-secondary)] hover:bg-white"><Users size={16} />团队</Link>
              {isSystemAdmin ? <Link href="/admin/users" className="flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm text-[var(--text-secondary)] hover:bg-white"><ShieldCheck size={16} />系统管理</Link> : null}
              <LogoutButton />
            </div>
          </details>
        </div>
      </div>
    </aside>
    <header className="app-topbar">
      <div className="relative lg:hidden">
        <button type="button" aria-label={mobileOpen ? "关闭导航" : "打开导航"} aria-expanded={mobileOpen} onClick={() => setMobileOpen((current) => !current)} className="grid h-11 w-11 place-items-center rounded-xl border border-[var(--border)] bg-white/75"><Menu size={20} /></button>
        {mobileOpen ? <div className="absolute left-0 top-13 z-50 w-64 rounded-2xl border border-white/80 bg-[rgb(249_252_255/0.98)] p-3 shadow-[var(--shadow-panel)]">
          <Brand /><div className="mt-4" onClick={() => setMobileOpen(false)}><Navigation pathname={pathname} mobile /></div>
        </div> : null}
      </div>
      <GlobalSearch />
      <details className="relative">
        <summary className="flex min-h-11 list-none items-center gap-2 rounded-xl px-2 hover:bg-white/65"><span className="grid h-8 w-8 place-items-center rounded-full bg-[linear-gradient(145deg,#d7e8ff,#bdd7fb)] text-xs font-semibold text-[var(--accent)]">{userName.trim().slice(0, 1) || "我"}</span><ChevronDown size={14} className="hidden text-[var(--text-tertiary)] sm:block" /></summary>
        <div className="absolute right-0 top-12 z-50 w-56 rounded-2xl border border-white/80 bg-[rgb(249_252_255/0.98)] p-2 shadow-[var(--shadow-panel)]">
          <p className="px-2 py-2 text-xs text-[var(--text-tertiary)]">{workspaceName}</p>
          <Link href="/settings" className="flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm hover:bg-white"><Settings size={16} />设置</Link>
          <Link href="/settings/members" className="flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm hover:bg-white"><Users size={16} />团队</Link>
          {isSystemAdmin ? <Link href="/admin/users" className="flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm hover:bg-white"><ShieldCheck size={16} />系统管理</Link> : null}
          <LogoutButton />
        </div>
      </details>
    </header>
  </>;
}
