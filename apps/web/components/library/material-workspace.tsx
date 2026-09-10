"use client";

import { Badge, Button, Card } from "@content-center/ui";
import { ArrowRight, BookOpenCheck, Lightbulb, MoreHorizontal, PenLine, X } from "lucide-react";
import { useState, type ReactNode } from "react";

type Tab = "研究成果" | "去创作" | "更多";
const tabs: Tab[] = ["研究成果", "去创作", "更多"];

export function MaterialWorkspace({ saved, transcribed, organized, inProject, distilled, topicCount, transcriptionState, organize, information, creation, processing }: {
  saved: boolean; transcribed: boolean; organized: boolean; inProject: boolean; distilled: boolean; topicCount: number; transcriptionState: "NOT_STARTED" | "PROCESSING" | "COMPLETED" | "FAILED" | "UNAVAILABLE";
  organize: ReactNode; information: ReactNode; creation: ReactNode; processing: ReactNode;
}) {
  const [tab, setTab] = useState<Tab>("研究成果");
  const [mobileOpen, setMobileOpen] = useState(false);
  const content: Record<Tab, ReactNode> = {
    研究成果: organize,
    去创作: creation,
    更多: <div className="material-secondary-grid"><section><h3>素材信息</h3>{information}</section><section><h3>处理与排查</h3>{processing}</section><section className="material-more-capabilities"><div><h3>更多研究能力</h3><Badge>即将支持</Badge></div><p>未来可以在这里扩展更多研究方式；当前不会创建假结果或假运行。</p></section></div>,
  };
  const completed = [saved, transcribed, organized, distilled, topicCount > 0, inProject].filter(Boolean).length;
  const transcriptState = transcriptionState === "COMPLETED" ? "DONE" : transcriptionState === "PROCESSING" ? "PROCESSING" : transcriptionState === "FAILED" ? "FAILED" : "MISSING";
  const actions = !transcribed
    ? [{ key: "transcript", icon: <BookOpenCheck size={19} />, title: transcriptionState === "PROCESSING" ? "查看文字稿进度" : transcriptionState === "FAILED" ? "重新生成文字稿" : "先生成文字稿", description: transcriptionState === "PROCESSING" ? "文字稿正在处理中，原始素材仍可查看" : "有了文字稿后，再继续看懂、提炼或找选题", run: () => document.getElementById("transcript-panel")?.scrollIntoView({ behavior: "smooth", block: "center" }) }]
    : [
        !distilled ? { key: "research", icon: <BookOpenCheck size={19} />, title: organized ? "提炼值得学的东西" : "看懂与提炼", description: organized ? "从已有理解继续判断哪些值得拿走" : "看看内容在讲什么，提炼值得学的东西", run: () => setTab("研究成果") } : null,
        { key: "topics", icon: <Lightbulb size={19} />, title: topicCount ? "查看选题" : "用这条找选题", description: topicCount ? `已经生成 ${topicCount} 个真实选题方向` : "从真实内容出发找到我们的创作角度", run: () => setTab("去创作") },
        { key: "create", icon: <PenLine size={19} />, title: inProject ? "去创作" : "作为创作依据", description: inProject ? "这条素材已经加入项目，可以继续写作" : "加入项目或直接开始创作", run: () => setTab("去创作") },
      ].filter((item): item is NonNullable<typeof item> => Boolean(item));
  const decision = <div className="material-decision-panel">
    <section className="material-progress-summary" data-testid="material-workspace-header"><header><h2>当前已有成果</h2><span>已有 {completed} 项</span></header><div className="material-result-status"><Status state={saved ? "DONE" : "MISSING"} yes="素材已保存" no="素材未保存" /><Status state={transcriptState} yes="已有文字稿" no={transcriptionState === "PROCESSING" ? "文字稿处理中" : transcriptionState === "FAILED" ? "文字稿处理失败" : "还没有文字稿"} /><Status state={organized ? "DONE" : "MISSING"} yes="已看懂这条" no="还没看懂这条" /><Status state={distilled ? "DONE" : "MISSING"} yes="已有提炼结果" no="还没有提炼结果" /><Status state={topicCount ? "DONE" : "MISSING"} yes={`已有 ${topicCount} 个选题`} no="还没有生成选题" /><Status state={inProject ? "DONE" : "MISSING"} yes="已作为创作依据" no="尚未进入项目" /></div></section>
    <section className="material-next-actions" aria-labelledby="material-next-heading"><div><h3 id="material-next-heading">现在最值得做</h3><p>选择你此刻最需要的动作，不必全部完成。</p></div><div>{actions.map((action, index) => <button key={action.key} type="button" onClick={action.run}>{action.icon}<span><strong>{action.title}{index === 0 ? <Badge>推荐</Badge> : null}</strong><small>{action.description}</small></span><ArrowRight size={16} /></button>)}</div></section>
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

function Status({ state, yes, no }: { state: "DONE" | "MISSING" | "PROCESSING" | "FAILED"; yes: string; no: string }) { return <div className={state === "DONE" ? "is-ready" : state === "PROCESSING" ? "is-processing" : state === "FAILED" ? "is-failed" : ""}><Badge>{state === "DONE" ? "✓" : state === "PROCESSING" ? "…" : state === "FAILED" ? "!" : "○"}</Badge><span>{state === "DONE" ? yes : no}</span></div>; }
