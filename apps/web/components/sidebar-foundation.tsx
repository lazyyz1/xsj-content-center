"use client";

import { ChevronDown, Compass, FileText, Folder, PanelLeftClose, PanelLeftOpen, Plus, Zap } from "lucide-react";
import Link from "next/link";
import { useState, type RefObject } from "react";
import type { ProjectListView } from "@/server/sidebar/view-model";
import { SidebarSearch } from "./sidebar/sidebar-search";
import { LogoutButton } from "./logout-button";
import { NewProjectDialog } from "./sidebar/new-project-dialog";
import { SidebarProjectSections } from "./sidebar/project-sections";
import type { SidebarInteractionLock, SidebarVisualState } from "./sidebar-state";

const navigation = [
  { label: "开始工作", href: "/dashboard", icon: Plus },
  { label: "项目", href: "/projects", icon: Folder },
  { label: "资料", href: "/library", icon: FileText },
  { label: "Skill", href: "/library/methods", icon: Zap },
  { label: "研究", href: "/discovery", icon: Compass },
] as const;

type SidebarProps = {
  visualState: SidebarVisualState;
  hoverCapable: boolean;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onTogglePinned: () => void;
  onToggleTouch: () => void;
  onCloseTouch: () => void;
  onInteractionLockChange: (lock: SidebarInteractionLock, active: boolean) => void;
  currentProjectId: string | null;
  activeNavigation: string | null;
  projectListView: ProjectListView;
  onProjectListViewChange: (view: ProjectListView) => void;
  onRefreshProjectList: () => Promise<void>;
  userName: string;
  workspaceName: string;
  isSystemAdmin: boolean;
  accountRef: RefObject<HTMLDetailsElement | null>;
};

export function SidebarFoundation({
  visualState,
  hoverCapable,
  onPointerEnter,
  onPointerLeave,
  onTogglePinned,
  onToggleTouch,
  onCloseTouch,
  onInteractionLockChange,
  currentProjectId,
  activeNavigation,
  projectListView,
  onProjectListViewChange,
  onRefreshProjectList,
  userName,
  workspaceName,
  isSystemAdmin,
  accountRef,
}: SidebarProps) {
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const collapsed = visualState === "COLLAPSED";
  const pinned = visualState === "PINNED_EXPANDED";
  const temporary = visualState === "TEMP_EXPANDED";
  const toggle = hoverCapable ? onTogglePinned : onToggleTouch;
  const controlLabel = hoverCapable
    ? pinned ? "取消固定侧栏" : "固定展开侧栏"
    : temporary ? "关闭侧栏" : "临时展开侧栏";

  return <aside
    className={`xsj-app-sidebar ${collapsed ? "is-collapsed" : ""} ${temporary ? "is-temporary" : ""} ${pinned ? "is-pinned" : ""}`}
    data-shell-part="sidebar"
    data-sidebar-state={visualState}
    aria-label="应用导航"
    onPointerEnter={onPointerEnter}
    onPointerLeave={onPointerLeave}
    onClickCapture={(event) => {
      if (!hoverCapable && (event.target as HTMLElement).closest("a")) onCloseTouch();
    }}
  >
    <header className="app-sidebar-header">
      <div className="app-sidebar-brand-row">
        <Link href="/dashboard" aria-label="鑫世界工作台" className="app-sidebar-brand">
          <span className="app-sidebar-icon-slot"><img src="/brand/brand-mark.png" alt="" /></span>
          <span className="app-sidebar-copy"><strong>鑫世界 Studio</strong></span>
        </Link>
        <button type="button" className="app-sidebar-pin app-sidebar-icon-slot" aria-label={controlLabel} aria-pressed={pinned} onClick={toggle}>
          {pinned ? <PanelLeftClose /> : <PanelLeftOpen />}
        </button>
        <div className="app-sidebar-search"><SidebarSearch onOpenChange={(open) => onInteractionLockChange("SEARCH", open)} /></div>
      </div>
    </header>

    <nav className="app-sidebar-navigation" aria-label="主导航">
      {navigation.map(({ label, href, icon: Icon }) => <Link key={label} href={href} aria-current={label === activeNavigation ? "page" : undefined} aria-label={label} title={collapsed ? label : undefined}>
        <span className="app-sidebar-icon-slot"><Icon strokeWidth={1.8} /></span>
        <span className="app-sidebar-copy">{label}</span>
      </Link>)}
    </nav>

    <SidebarProjectSections view={projectListView} currentProjectId={currentProjectId} onViewChange={onProjectListViewChange} onOpenNewProject={() => setNewProjectOpen(true)} onInteractionLockChange={onInteractionLockChange} />

    <div id="xsj-project-tree-slot" />

    <details
      ref={accountRef}
      className="app-sidebar-account"
      onToggle={(event) => onInteractionLockChange("MENU", event.currentTarget.open)}
    >
      <summary aria-label="账户菜单">
        <span className="app-sidebar-icon-slot"><span className="app-sidebar-account-avatar">{userName.slice(0, 1)}</span></span>
        <span className="app-sidebar-copy"><strong>{userName}</strong><small>{workspaceName}</small></span>
        <ChevronDown />
      </summary>
      <div className="app-sidebar-account-menu">
        <header><strong>{userName}</strong><small>{workspaceName}</small></header>
        <span className="app-sidebar-account-divider" />
        <Link href="/settings">个人设置</Link>
        <Link href="/settings/members">团队与权限</Link>
        {isSystemAdmin ? <><span className="app-sidebar-account-divider" /><Link href="/admin">系统管理</Link></> : null}
        <span className="app-sidebar-account-divider" />
        <LogoutButton />
      </div>
    </details>
    <NewProjectDialog open={newProjectOpen} onOpenChange={setNewProjectOpen} onInteractionLockChange={onInteractionLockChange} onCreated={onRefreshProjectList} />
  </aside>;
}
