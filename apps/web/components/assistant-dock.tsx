"use client";

import { Bot, ExternalLink, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const hiddenPrefixes = ["/dashboard", "/discovery", "/projects/"];

function copy(pathname: string): { title: string; description: string; links: Array<[string, string]> } {
  if (pathname.startsWith("/library")) return { title: "资料助手", description: "从已有资料继续整理、提炼或进入创作。", links: [["收录新资料", "/library"], ["从视频找选题", "/discovery"]] };
  if (pathname.startsWith("/calendar")) return { title: "发布助手", description: "这里坚持人工确认和人工发布，不会代替你自动发布。", links: [["查看创作项目", "/projects"], ["继续编辑稿件", "/projects"]] };
  if (pathname.startsWith("/projects/methods") || pathname.startsWith("/library/methods")) return { title: "方法助手", description: "查看当前方法和真实依据。AI 建议不会自动发布。", links: [["打开默认方法", "/projects/methods"], ["去 Studio 使用", "/projects"]] };
  return { title: "鑫小助", description: "我会根据当前页面推荐下一步。", links: [["开始创作", "/dashboard"], ["查看项目", "/projects"]] };
}

export function AssistantDock() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  if (hiddenPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix)) && !pathname.startsWith("/projects/methods")) return null;
  const current = copy(pathname);
  return <>
    <button type="button" aria-label="打开鑫小助" className="assistant-dock-button" onClick={() => setOpen(true)}><Bot size={21} /></button>
    {open ? <div className="assistant-dock-layer"><button type="button" aria-label="关闭鑫小助" className="assistant-dock-backdrop" onClick={() => setOpen(false)} /><aside role="dialog" aria-modal="true" aria-labelledby="assistant-dock-title" className="assistant-dock-panel"><header><span className="assistant-avatar"><Bot size={22} /></span><div><p>鑫世界 AI 助手</p><h2 id="assistant-dock-title">{current.title}</h2></div><button type="button" aria-label="关闭" onClick={() => setOpen(false)}><X size={19} /></button></header><p className="assistant-dock-description">{current.description}</p><div className="assistant-actions">{current.links.map(([label, href]) => <Link key={`${label}-${href}`} href={href} onClick={() => setOpen(false)}><Sparkles size={15} /><span>{label}</span><ExternalLink size={14} /></Link>)}</div><div className="assistant-composer assistant-composer-disabled">自由对话即将支持</div><small>当前仅展示已经接入的真实入口。</small></aside></div> : null}
  </>;
}
