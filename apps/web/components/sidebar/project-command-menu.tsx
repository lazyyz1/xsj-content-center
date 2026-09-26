"use client";

import { ArrowDown, ArrowUp, ChevronsUp, FolderInput, MessageSquare, MoreHorizontal, PencilLine, Pin, PinOff } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { CommandSurface } from "./command-surface";
import type { ProjectFolderView, ProjectListItemView, ProjectListView } from "@/server/sidebar/view-model";
import type { ProjectPreferenceCommand } from "@/server/sidebar/service";
import type { SidebarInteractionLock } from "../sidebar-state";

export function SidebarProjectRow({ project, active, folders, canRename, onPreference, onRename, onInteractionLockChange }: {
  project: ProjectListItemView;
  active: boolean;
  folders: ProjectFolderView[];
  canRename: boolean;
  onPreference: (projectId: string, command: ProjectPreferenceCommand) => Promise<ProjectListView>;
  onRename: (project: ProjectListItemView) => Promise<void>;
  onInteractionLockChange: (lock: SidebarInteractionLock, active: boolean) => void;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  async function run(action: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await action();
      setOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "操作失败，请重试。");
    } finally {
      setBusy(false);
    }
  }

  function openContextMenu(event: React.MouseEvent) {
    event.preventDefault();
    setOpen(true);
  }

  return <article className={`app-sidebar-project-row ${open ? "has-menu" : ""}`} onContextMenu={openContextMenu}>
    <Link href={project.href} title={project.label} aria-current={active ? "page" : undefined}><MessageSquare size={14} /><span>{project.label}</span></Link>
    <button type="button" className={`sidebar-row-action ${project.pinned ? "is-pinned" : ""}`} aria-label={`${project.pinned ? "取消置顶" : "置顶"}：${project.label}`} disabled={busy} onClick={() => void run(() => onPreference(project.projectId, { action: project.pinned ? "UNPIN" : "PIN" }))}><Pin size={13} /></button>
    <button type="button" ref={triggerRef} className="sidebar-row-action" aria-label={`项目菜单：${project.label}`} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(!open)}><MoreHorizontal size={15} /></button>
    <CommandSurface open={open} anchor={triggerRef.current} label={`项目操作：${project.label}`} onClose={() => setOpen(false)} onInteractionLockChange={onInteractionLockChange}>
        <button type="button" disabled={busy} onClick={() => void run(() => onPreference(project.projectId, { action: project.pinned ? "UNPIN" : "PIN" }))}>{project.pinned ? <PinOff /> : <Pin />}{project.pinned ? "取消置顶" : "置顶"}</button>
        {canRename ? <button type="button" disabled={busy} onClick={() => { setOpen(false); void onRename(project); }}><PencilLine />重命名</button> : null}
        <fieldset><legend><FolderInput />移动到</legend>
          {project.folderId ? <button type="button" disabled={busy} onClick={() => void run(() => onPreference(project.projectId, { action: "MOVE", folderId: null }))}>未分组</button> : null}
          {folders.filter((folder) => folder.folderId !== project.folderId).map((folder) => <button type="button" key={folder.folderId} disabled={busy} onClick={() => void run(() => onPreference(project.projectId, { action: "MOVE", folderId: folder.folderId }))}>{folder.label}</button>)}
          {!folders.length && !project.folderId ? <small>还没有项目文件夹</small> : null}
        </fieldset>
        <button type="button" disabled={busy} onClick={() => void run(() => onPreference(project.projectId, { action: "MOVE_TOP" }))}><ChevronsUp />移到顶部</button>
        <button type="button" disabled={busy} onClick={() => void run(() => onPreference(project.projectId, { action: "MOVE_UP" }))}><ArrowUp />上移</button>
        <button type="button" disabled={busy} onClick={() => void run(() => onPreference(project.projectId, { action: "MOVE_DOWN" }))}><ArrowDown />下移</button>
        {error ? <p role="alert">{error}</p> : null}
    </CommandSurface>
  </article>;
}
