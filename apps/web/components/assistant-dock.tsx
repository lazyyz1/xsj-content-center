"use client";

import { Bot, ExternalLink, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AssistantShell } from "./assistant-shell";

const hiddenPrefixes = ["/dashboard", "/projects/"];

function copy(pathname: string): { title: string; description: string; links: Array<[string, string]> } {
  if (pathname.startsWith("/discovery/benchmarks/")) return { title: "研究助手", description: "解释当前博主的内容方法，或从真实研究结果继续找题。", links: [["查看代表内容", pathname], ["返回灵感研究", "/discovery"]] };
  if (pathname.startsWith("/discovery")) return { title: "研究助手", description: "从真实内容和对标博主中找到值得继续研究的方向。", links: [["找值得看的内容", "/discovery"], ["从资料继续研究", "/library"]] };
  if (/^\/library\/[^/]+$/.test(pathname)) return { title: "研究助手", description: "从当前素材继续看懂、提炼，或进入创作。", links: [["查看研究结果", `${pathname}#material-research-results`], ["返回灵感研究", "/discovery"]] };
  if (pathname.startsWith("/library")) return { title: "资料助手", description: "从已有资料继续理解、提炼或进入创作。", links: [["收录新资料", "/library"], ["查看创作项目", "/projects"]] };
  if (pathname.startsWith("/calendar")) return { title: "发布助手", description: "这里坚持人工确认和人工发布，不会代替你自动发布。", links: [["查看创作项目", "/projects"], ["继续编辑稿件", "/projects"]] };
  if (pathname === "/projects") return { title: "项目助手", description: "帮你回到最近的创作，快速看清下一步。", links: [["查看全部项目", "/projects#all-projects"], ["新建项目", "/projects/new"]] };
  if (pathname.startsWith("/projects/methods") || pathname.startsWith("/library/methods")) return { title: "方法助手", description: "查看当前方法和真实依据。AI 建议不会自动发布。", links: [["打开默认方法", "/projects/methods"], ["去 Studio 使用", "/projects"]] };
  return { title: "鑫小助", description: "我会根据当前页面推荐下一步。", links: [["开始创作", "/dashboard"], ["查看项目", "/projects"]] };
}

export function AssistantDock() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  if (hiddenPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix)) && !pathname.startsWith("/projects/methods")) return null;
  const current = copy(pathname);
  const dockLabel = pathname === "/projects" ? "项目助手" : pathname.startsWith("/projects/methods") ? "方法助手" : pathname.startsWith("/discovery") || /^\/library\/[^/]+$/.test(pathname) ? "研究助手" : "";
  return <>
    <button type="button" aria-label={`打开${current.title}`} className={`assistant-dock-button ${dockLabel ? "is-labeled" : ""}`} onClick={() => setOpen(true)}><Bot size={21} />{dockLabel ? <span>{dockLabel}</span> : null}</button>
    {open ? <div className="assistant-dock-layer"><button type="button" aria-label="关闭鑫小助" className="assistant-dock-backdrop" onClick={() => setOpen(false)} /><aside role="dialog" aria-modal="true" aria-label={current.title} className="assistant-dock-panel"><AssistantShell title={current.title} description={current.description} onClose={() => setOpen(false)} context={<p>当前页面 · {pathname.startsWith("/library") ? "资料" : pathname.startsWith("/discovery") ? "灵感研究" : pathname.startsWith("/calendar") ? "发布" : pathname.startsWith("/projects/methods") ? "方法" : pathname.startsWith("/projects") ? "项目" : "方法"}</p>}><div className="assistant-actions">{current.links.map(([label, href]) => <Link key={`${label}-${href}`} href={href} onClick={() => setOpen(false)}><Sparkles size={15} /><span>{label}</span><ExternalLink size={14} /></Link>)}</div><div className="assistant-coming-soon"><strong>更多能力即将支持</strong><p>自由对话、联网搜索、附件和引用资料会在这里统一出现，不会假装已经完成。</p></div></AssistantShell></aside></div> : null}
  </>;
}
