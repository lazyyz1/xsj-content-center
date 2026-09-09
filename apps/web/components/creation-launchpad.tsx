"use client";

import { ArrowUp, FilePenLine, Lightbulb, Search, Sparkles, UserRoundSearch, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const actions = [
  { label: "找选题", href: "/discovery", icon: Lightbulb },
  { label: "写口播稿", href: "/projects/new", icon: FilePenLine },
  { label: "从视频找题", href: "/library", icon: Video },
  { label: "分析博主", href: "/discovery", icon: UserRoundSearch },
  { label: "改稿", href: "/projects", icon: Sparkles },
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
      <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)]"><Sparkles size={16} />鑫世界 AI 创作工作台</span>
      <h1 className="mt-5 text-balance text-4xl font-bold tracking-[-0.045em] text-[var(--text-primary)] sm:text-5xl">从一个想法开始，把内容做得更清楚</h1>
      <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">描述你想讲的内容，或从视频、博主、资料和已有项目继续。</p>
    </div>
    <div className="creation-composer">
      <label className="sr-only" htmlFor="creation-idea">描述想创作的内容</label>
      <textarea id="creation-idea" value={idea} onChange={(event) => setIdea(event.target.value)} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") start(); }} rows={3} placeholder="描述你想创作的内容，例如：为什么员工用了 AI，老板反而更累了？" />
      <div className="creation-composer-footer">
        <div className="flex min-w-0 gap-2 overflow-x-auto pb-1 soft-scrollbar">{actions.map(({ label, href, icon: Icon }) => <button key={label} type="button" onClick={() => router.push(href)}><Icon size={15} />{label}</button>)}</div>
        <button type="button" aria-label="开始创作" className="creation-send" onClick={start}><ArrowUp size={20} /></button>
      </div>
    </div>
    <div className="creation-context-line"><span><Search size={15} />当前可使用真实项目、资料与默认方法</span><span>AI 建议会先预览，再由你决定是否应用</span></div>
  </section>;
}
