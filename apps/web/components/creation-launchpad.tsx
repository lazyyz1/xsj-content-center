"use client";

import { ArrowUp, BookOpen, FilePenLine, FolderOpen, Globe2, ImageIcon, Lightbulb, Link2, Paperclip, ShieldCheck, Type, UserRound, UserRoundSearch, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const actions = [
  { label: "找选题", href: "/discovery", icon: Lightbulb },
  { label: "写内容", href: "/projects/new", icon: FilePenLine },
  { label: "从视频开始", href: "/library", icon: Video },
  { label: "研究博主", href: "/discovery", icon: UserRoundSearch },
  { label: "继续项目", href: "/projects", icon: FolderOpen },
] as const;

export function CreationLaunchpad() {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  function start() {
    const value = idea.trim();
    router.push(value ? `/projects/new?idea=${encodeURIComponent(value)}` : "/projects/new");
  }
  return <section className="creation-launchpad workspace-panel">
    <div className="creation-orbit creation-orbit-play" aria-hidden="true"><Video size={31} /></div>
    <div className="creation-orbit creation-orbit-image" aria-hidden="true"><ImageIcon size={21} /></div>
    <div className="creation-orbit creation-orbit-type" aria-hidden="true"><Type size={29} /></div>
    <div className="creation-orbit creation-orbit-note" aria-hidden="true"><FilePenLine size={22} /></div>
    <div className="creation-hero-copy">
      <h1>从一个想法开始，把内容做得<span>更清楚</span></h1>
      <p>用 AI，放大你的创作世界</p>
    </div>
    <div className="creation-composer">
      <label className="sr-only" htmlFor="creation-idea">描述想创作的内容</label>
      <textarea id="creation-idea" value={idea} onChange={(event) => setIdea(event.target.value)} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") start(); }} rows={3} placeholder="描述你想创作的内容，或粘贴一条素材链接…" />
      <div className="creation-composer-footer">
        <div className="creation-composer-tools soft-scrollbar"><div className="creation-primary-actions">{actions.map(({ label, href, icon: Icon }) => <button key={label} type="button" onClick={() => router.push(href)}><Icon size={16} />{label}</button>)}</div><span className="creation-toolbar-divider" aria-hidden="true" /><div className="creation-future-actions"><button type="button" disabled title="即将支持"><Globe2 size={16} />联网搜索<small>即将支持</small></button><button type="button" disabled title="即将支持"><Paperclip size={16} />上传附件<small>即将支持</small></button><button type="button" disabled title="即将支持"><Link2 size={16} />引用资料<small>即将支持</small></button></div></div>
        <button type="button" aria-label="开始创作" className="creation-send" onClick={start}><ArrowUp size={20} /></button>
      </div>
    </div>
    <div className="creation-context-line"><span><BookOpen size={15} />默认创作方法 · 已接入</span><i /><span><UserRound size={15} />创作上下文 · 已准备</span><i /><span><ShieldCheck size={15} />事实检查 · 已开启</span></div>
  </section>;
}
