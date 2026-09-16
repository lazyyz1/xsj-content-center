"use client";

import { ArrowRight, Clock3, FolderOpen, Layers3, Lightbulb, Loader2, Send, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type RecentProject = { id: string; title: string; updatedAt: string };

export function WorkbenchStart({ projects, canCreate }: { projects: RecentProject[]; canCreate: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const inFlight = useRef(false);
  const [idea, setIdea] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    const value = idea.trim();
    if (!value || !canCreate || inFlight.current) {
      inputRef.current?.focus();
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: value.slice(0, 200), description: value }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || result.error || "无法开始这项创作。");
      router.push(`/dashboard?project=${result.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "无法开始这项创作。");
      inFlight.current = false;
      setBusy(false);
    }
  }

  const starts = [
    { title: "从研究开始", description: "从真实内容里找到新的方向", href: "/discovery", icon: Lightbulb, tone: "research" },
    { title: "从资料开始", description: "使用已有资料快速开始创作", href: "/library", icon: Layers3, tone: "assets" },
    { title: "继续最近创作", description: "回到上一次的创作现场", href: projects.length ? "#recent-work" : "/projects", icon: Clock3, tone: "recent" },
  ] as const;

  return <div className="workbench-start">
    <section className="workbench-start-hero" aria-labelledby="workbench-start-title">
      <p className="workbench-start-eyebrow">用好内容，创造更大的世界</p>
      <h1 id="workbench-start-title">今天想做什么内容？</h1>
      <form className="workbench-start-composer" onSubmit={(event) => { event.preventDefault(); void start(); }}>
        <label className="sr-only" htmlFor="workbench-idea">描述这次想创作的内容</label>
        <textarea ref={inputRef} id="workbench-idea" value={idea} onChange={(event) => setIdea(event.target.value)} disabled={!canCreate || busy} maxLength={2000} rows={3} placeholder={canCreate ? "描述你的想法，比如：我想讲教培老板为什么必须真正学会 AI" : "当前权限可以查看和继续已有工作"} />
        <footer><span>{canCreate ? "输入想法后，会开始一项创作任务" : "当前为只读权限"}</span><button type="submit" aria-label="开始创作" disabled={!canCreate || busy || !idea.trim()}>{busy ? <Loader2 size={19} className="animate-spin" /> : <Send size={18} />}</button></footer>
        {error ? <p role="alert">{error}</p> : null}
      </form>
    </section>

    <nav className="workbench-start-actions" aria-label="开始创作的方式">
      <button type="button" data-tone="idea" disabled={!canCreate} onClick={() => inputRef.current?.focus()}><span><Sparkles size={22} /></span><div><strong>从一个想法开始</strong><small>把灵感变成一项完整内容工作</small></div><ArrowRight size={17} /></button>
      {starts.map(({ title, description, href, icon: Icon, tone }) => <Link key={title} href={href} data-tone={tone}><span><Icon size={22} /></span><div><strong>{title}</strong><small>{description}</small></div><ArrowRight size={17} /></Link>)}
    </nav>

    <section className="workbench-recent" id="recent-work" aria-labelledby="workbench-recent-title">
      <header><h2 id="workbench-recent-title">最近创作</h2><Link href="/projects">查看全部 <ArrowRight size={15} /></Link></header>
      {projects.length ? <div>{projects.slice(0, 3).map((project) => <article key={project.id}><span><FolderOpen size={20} /></span><div><h3>{project.title}</h3><p>最近更新 {project.updatedAt}</p></div><Link href={`/dashboard?project=${project.id}`}>继续创作 <ArrowRight size={14} /></Link></article>)}</div> : <div className="workbench-recent-empty"><p>还没有最近创作。输入一个想法，开始第一项创作。</p></div>}
    </section>
  </div>;
}
