"use client";

import { Badge, Button, Card } from "@content-center/ui";
import { ArrowRight, BookOpenCheck, Lightbulb, MoreHorizontal, PenLine, X } from "lucide-react";
import { useState, type ReactNode } from "react";

type Tab = "研究成果" | "去创作" | "更多";
const tabs: Tab[] = ["研究成果", "去创作", "更多"];

export function MaterialWorkspace({ saved, transcribed, organized, inProject, organize, information, creation, processing }: {
  saved: boolean; transcribed: boolean; organized: boolean; inProject: boolean;
  organize: ReactNode; information: ReactNode; creation: ReactNode; processing: ReactNode;
}) {
  const [tab, setTab] = useState<Tab>("研究成果");
  const [mobileOpen, setMobileOpen] = useState(false);
  const content: Record<Tab, ReactNode> = {
    研究成果: organize,
    去创作: creation,
    更多: <div className="material-secondary-grid"><section><h3>素材信息</h3>{information}</section><section><h3>处理与排查</h3>{processing}</section></div>,
  };
  const completed = [saved, transcribed, organized, inProject].filter(Boolean).length;
  const decision = <div className="material-decision-panel">
    <section className="material-progress-summary" data-testid="material-workspace-header"><header><h2>当前已有成果</h2><span>{completed}/4</span></header><div className="material-result-status"><Status ok={saved} yes="素材已保存" no="素材未保存" /><Status ok={transcribed} yes="已有文字稿" no="还没有文字稿" /><Status ok={organized} yes="已有内容理解" no="还没看懂这条" /><Status ok={inProject} yes="已作为创作依据" no="尚未进入项目" /></div></section>
    <section className="material-next-actions" aria-labelledby="material-next-heading"><div><h3 id="material-next-heading">现在最值得做</h3><p>选择你此刻最需要的动作，不必按固定顺序完成。</p></div><div><button type="button" onClick={() => setTab("研究成果")}><BookOpenCheck size={19} /><span><strong>看懂与提炼 <Badge>推荐</Badge></strong><small>看看内容在讲什么，提炼值得学的东西</small></span><ArrowRight size={16} /></button><button type="button" onClick={() => setTab("去创作")}><Lightbulb size={19} /><span><strong>用这条找选题</strong><small>从真实内容出发找到我们的创作角度</small></span><ArrowRight size={16} /></button><button type="button" onClick={() => setTab("去创作")}><PenLine size={19} /><span><strong>作为创作依据</strong><small>加入项目或直接开始创作</small></span><ArrowRight size={16} /></button></div></section>
  </div>;
  const results = <div className="material-research-panel">
    <div data-testid="material-workspace-tabs" role="tablist" aria-label="素材工作栏" className="material-workspace-tabs">{tabs.map((item) => <button key={item} role="tab" aria-selected={tab === item} onClick={() => setTab(item)}>{item === "更多" ? <MoreHorizontal size={16} /> : null}{item}</button>)}</div>
    <div data-testid="material-workspace-scroll-body" role="tabpanel" data-active-tab={tab} className="material-workspace-content">{content[tab]}</div>
  </div>;
  return <>
    <aside className="material-decision-column hidden min-[901px]:block"><Card>{decision}</Card></aside>
    <section id="material-research-results" data-testid="material-workspace" className="material-workspace-section hidden min-[901px]:block"><Card className="material-workspace-card">{results}</Card></section>
    <div className="min-[901px]:hidden"><Button className="w-full" variant="secondary" onClick={() => setMobileOpen(true)}>素材工作栏</Button></div>
    {mobileOpen ? <div className="fixed inset-0 z-50 flex items-end bg-black/35 min-[901px]:hidden" role="dialog" aria-modal="true" aria-label="素材工作栏"><button aria-label="关闭素材工作栏" className="absolute inset-0" onClick={() => setMobileOpen(false)} /><div className="relative h-[88dvh] w-full overflow-y-auto rounded-t-2xl bg-[var(--surface)] p-4 shadow-2xl"><button className="absolute right-4 top-3 z-10 rounded-full p-2" aria-label="关闭" onClick={() => setMobileOpen(false)}><X size={18} /></button>{decision}{results}</div></div> : null}
  </>;
}

function Status({ ok, yes, no }: { ok: boolean; yes: string; no: string }) { return <div className={ok ? "is-ready" : ""}><Badge>{ok ? "✓" : "○"}</Badge><span>{ok ? yes : no}</span></div>; }
