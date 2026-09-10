"use client";

import { ArrowUp, FilePenLine, FolderOpen, Globe2, Lightbulb, Link2, Paperclip, UserRoundSearch, Video } from "lucide-react";
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
    <div className="creation-orbit creation-orbit-left" aria-hidden="true"><Video size={28} /></div>
    <div className="creation-orbit creation-orbit-right" aria-hidden="true"><FilePenLine size={27} /></div>
    <div className="relative mx-auto max-w-3xl text-center">
      <h1 className="text-balance text-4xl font-bold tracking-[-0.045em] text-[var(--text-primary)] sm:text-5xl">从一个想法开始，把内容做得更清楚</h1>
      <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[var(--text-secondary)]">描述你想讲的内容，或从视频、博主、资料和已有项目继续。</p>
    </div>
    <div className="creation-composer">
      <label className="sr-only" htmlFor="creation-idea">描述想创作的内容</label>
      <textarea id="creation-idea" value={idea} onChange={(event) => setIdea(event.target.value)} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") start(); }} rows={3} placeholder="描述你想创作的内容，或粘贴一条素材链接…" />
      <div className="creation-composer-footer">
        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1 soft-scrollbar">{actions.map(({ label, href, icon: Icon }) => <button key={label} type="button" onClick={() => router.push(href)}><Icon size={16} />{label}</button>)}</div>
        <button type="button" aria-label="开始创作" className="creation-send" onClick={start}><ArrowUp size={20} /></button>
      </div>
    </div>
    <div className="creation-future-tools" aria-label="即将支持的创作入口"><span><Globe2 size={15} />联网搜索 · 即将支持</span><span><Paperclip size={15} />上传附件 · 即将支持</span><span><Link2 size={15} />引用已有资料 · 即将支持</span></div>
    <div className="creation-context-line"><span>默认创作方法已接入</span><span>外部参考只作启发</span><span>事实安全检查已启用</span><span>AI 建议先预览，再决定是否应用</span></div>
  </section>;
}
