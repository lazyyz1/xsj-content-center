"use client";

import { ArrowRight, Bot, Lightbulb, Sparkles, Video } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AssistantShell } from "./assistant-shell";

const actions = [
  { label: "帮我找一组选题", href: "/discovery", icon: Lightbulb },
  { label: "从一条视频开始", href: "/library", icon: Video },
  { label: "继续已有项目", href: "/projects", icon: Sparkles },
] as const;

export function DashboardAssistant() {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className="dashboard-help-trigger" aria-label="打开鑫小助" onClick={() => setOpen(true)}><span>需要帮助？<strong>问问鑫小助</strong></span><i><Bot size={21} /></i></button>
    {open ? <div className="dashboard-help-layer"><button type="button" aria-label="关闭鑫小助" onClick={() => setOpen(false)} /><aside role="dialog" aria-modal="true" aria-label="鑫小助"><AssistantShell title="鑫小助" description="从一个想法、视频或已有项目开始。" context={<p>当前页面 · 开始创作</p>} onClose={() => setOpen(false)}><div className="assistant-actions">{actions.map(({ label, href, icon: Icon }) => <Link key={label} href={href} onClick={() => setOpen(false)}><Icon size={16} /><span>{label}</span><ArrowRight size={15} /></Link>)}</div><div className="assistant-coming-soon"><strong>自由对话即将支持</strong><p>当前只展示已经接入的真实入口，不会假装生成内容。</p></div></AssistantShell></aside></div> : null}
  </>;
}
