import {
  CalendarDays,
  Compass,
  FolderKanban,
  LayoutDashboard,
  Library,
  Settings,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { LogoutButton } from "./logout-button";

type NavItem = { label: string; icon: LucideIcon; href: string };

const links: NavItem[] = [
  { label: "工作台", href: "/dashboard", icon: LayoutDashboard },
  { label: "内容发现", href: "/discovery", icon: Compass },
  { label: "素材库", href: "/library", icon: Library },
  { label: "内容项目", href: "/projects", icon: FolderKanban },
  { label: "发布中心", href: "/calendar", icon: CalendarDays },
  { label: "设置", href: "/settings", icon: Settings },
];

export function Sidebar({ workspaceName, userName }: { workspaceName: string; userName: string }) {
  return (
    <aside className="border-b border-[var(--border)] bg-[var(--surface)] lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:border-b-0 lg:border-r">
      <div className="flex h-full flex-col p-4">
        <div className="mb-5 px-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">AI 内容生产中心</p>
          <p className="mt-2 truncate text-sm font-medium">{workspaceName}</p>
        </div>
        <nav aria-label="主导航" className="flex gap-1 overflow-x-auto lg:flex-1 lg:flex-col lg:overflow-visible">
          {links.map(({ label, icon: Icon, href }) => (
            <Link key={label} href={href} className="flex shrink-0 items-center gap-2 rounded-[var(--radius)] px-3 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]">
              <Icon size={17} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-4 hidden border-t border-[var(--border)] pt-4 lg:block">
          <p className="mb-2 truncate px-3 text-xs text-[var(--text-secondary)]">{userName}</p>
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}
