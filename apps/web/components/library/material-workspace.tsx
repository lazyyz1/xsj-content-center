"use client";

import { Badge, Button, Card } from "@content-center/ui";
import { X } from "lucide-react";
import { useState, type ReactNode } from "react";

type Tab = "整理" | "信息" | "创作" | "处理";
const tabs: Tab[] = ["整理", "信息", "创作", "处理"];

export function MaterialWorkspace({ saved, transcribed, organized, inProject, organize, information, creation, processing }: {
  saved: boolean; transcribed: boolean; organized: boolean; inProject: boolean;
  organize: ReactNode; information: ReactNode; creation: ReactNode; processing: ReactNode;
}) {
  const [tab, setTab] = useState<Tab>("整理");
  const [mobileOpen, setMobileOpen] = useState(false);
  const content: Record<Tab, ReactNode> = { 整理: organize, 信息: information, 创作: creation, 处理: processing };
  const panel = <div className="flex min-h-0 flex-1 flex-col">
    <div data-testid="material-workspace-header" className="shrink-0 p-4 pb-3"><h2 className="font-semibold">当前素材</h2><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><Status ok={saved} yes="已保存" no="未保存" /><Status ok={transcribed} yes="已转写" no="未转写" /><Status ok={organized} yes="已整理" no="未整理" /><Status ok={inProject} yes="已进入创作" no="尚未进入创作" /></div></div>
    <div data-testid="material-workspace-tabs" role="tablist" aria-label="素材工作栏" className="mx-4 grid shrink-0 grid-cols-4 gap-1 rounded-xl bg-[var(--surface-elevated)] p-1">{tabs.map((item) => <button key={item} role="tab" aria-selected={tab === item} onClick={() => setTab(item)} className={`min-w-0 rounded-lg px-2 py-2 text-sm ${tab === item ? "bg-[var(--surface)] font-medium shadow-sm" : "text-[var(--text-secondary)]"}`}>{item}</button>)}</div>
    <div data-testid="material-workspace-scroll-body" role="tabpanel" data-active-tab={tab} className="my-3 min-h-0 min-w-0 flex-1 overflow-y-auto px-4">{content[tab]}</div>
    <div data-testid="material-workspace-footer" className="shrink-0 border-t px-4 py-3 text-xs text-[var(--text-secondary)]">{tab === "整理" ? "整理结果已保存，需要时可重新整理" : tab === "信息" ? "作品数据按需更新" : tab === "创作" ? "从这里继续进入创作" : "仅在需要排查时查看高级信息"}</div>
  </div>;
  return <>
    <aside data-testid="material-workspace" className="hidden min-w-0 min-[901px]:block"><Card className="min-[901px]:sticky min-[901px]:top-5 min-[901px]:flex min-[901px]:h-[calc(100dvh-2.5rem)] min-[901px]:max-h-[calc(100dvh-2.5rem)] min-[901px]:overflow-hidden">{panel}</Card></aside>
    <div className="min-[901px]:hidden"><Button className="w-full" variant="secondary" onClick={() => setMobileOpen(true)}>素材工作栏</Button></div>
    {mobileOpen ? <div className="fixed inset-0 z-50 flex items-end bg-black/35 min-[901px]:hidden" role="dialog" aria-modal="true" aria-label="素材工作栏"><button aria-label="关闭素材工作栏" className="absolute inset-0" onClick={() => setMobileOpen(false)} /><div className="relative flex h-[88dvh] w-full overflow-hidden rounded-t-2xl bg-[var(--surface)] shadow-2xl"><button className="absolute right-4 top-3 z-10 rounded-full p-2" aria-label="关闭" onClick={() => setMobileOpen(false)}><X size={18} /></button>{panel}</div></div> : null}
  </>;
}

function Status({ ok, yes, no }: { ok: boolean; yes: string; no: string }) { return <div className="flex items-center gap-2"><Badge>{ok ? "✓" : "○"}</Badge><span className={ok ? "" : "text-[var(--text-secondary)]"}>{ok ? yes : no}</span></div>; }
