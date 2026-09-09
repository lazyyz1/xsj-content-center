"use client";

import { Badge, Button, Card } from "@content-center/ui";
import { useState } from "react";
import { STUDIO_QUICK_ACTIONS, type StudioActionRecommendation, type StudioQuickAction } from "@/server/ai/schemas";
import type { StudioDefaultContentMethodDTO } from "@/server/default-content-method/service";
import { StudioDrawer } from "./studio-drawer";

const labels: Record<StudioQuickAction, string> = {
  TOPIC_IDEAS: "想选题", REWRITE_OPENING: "改开头", REWRITE_BODY: "重写正文", ADD_CASE: "补案例", STRENGTHEN_EVIDENCE: "加强证据",
  HUMANIZE_TEXT: "改得更像人话", SHORTEN_TEXT: "精简一点", ALTERNATIVE_EXPRESSION: "换个表达", FACT_CHECK: "检查事实风险", DEFAULT_METHOD_OPTIMIZE: "按鑫世界方法优化",
};
const sectionLabels = { AUDIENCE: "我们主要给谁做内容", TOPIC: "什么样的选题优先做", OPENING: "开头怎么进入", BODY: "正文怎么讲", EVIDENCE: "案例和数据怎么用", ENDING: "怎么收尾", BOUNDARY: "哪些事情不要做" } as const;

type QuickOutput = { original: string; summary: string; suggestions: Array<{ title: string; text: string; factState?: "CONFIRMED_OWN_FACT" | "EXTERNAL_FACT" | "HYPOTHETICAL" | "CREATIVE_EXPRESSION" | "UNVERIFIED_JUDGMENT" }>; replacement: string | null; risks: Array<{ text: string; handling: string }> };
type QuickRun = { id: string; studioAction: StudioQuickAction; output: QuickOutput; canApply: boolean };
type MotherSnapshot = { title: string; body: string; outline: string[]; version: number; origin: "HUMAN" | "KIMI" | "GPT_WEB"; originNote: string | null };

async function post(url: string, body: unknown) {
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || result.error || "AI 暂时无法处理这个动作。");
  return result;
}

export function StudioDefaultMethod({ projectId, method, recommendedActions, editable, configured, motherVersion, onApplied, onUseTopic }: { projectId: string; method: StudioDefaultContentMethodDTO | null; recommendedActions: StudioActionRecommendation[]; editable: boolean; configured: boolean; motherVersion: number; onApplied: (mother: MotherSnapshot, warnings: Array<{ code: string; message: string; reason?: string; suggestion?: string }>) => void; onUseTopic: (text: string) => void }) {
  const [methodOpen, setMethodOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [run, setRun] = useState<QuickRun | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  if (!method) return null;

  async function execute(studioAction: StudioQuickAction, recommendedInstruction?: string) {
    setBusy(true); setError(""); setNotice(""); setRun(null);
    const combinedInstruction = [recommendedInstruction, instruction.trim()].filter(Boolean).join("；");
    try { setRun(await post(`/api/projects/${projectId}/ai/run`, { studioAction, ...(combinedInstruction ? { instruction: combinedInstruction } : {}) }) as QuickRun); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "AI 暂时无法处理这个动作。"); }
    finally { setBusy(false); }
  }

  async function apply(suggestionIndex?: number) {
    if (!run) return;
    setBusy(true); setError("");
    try {
      const result = await post(`/api/projects/${projectId}/ai/runs/${run.id}/apply`, { studioQuickAction: true, expectedVersion: motherVersion, ...(suggestionIndex === undefined ? {} : { suggestionIndex }) });
      onApplied(result.motherContent as MotherSnapshot, result.warnings ?? []); setRun(null); setNotice("AI 建议已应用到口播稿，你仍可以继续修改。");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "应用失败，请重新运行这个动作。"); }
    finally { setBusy(false); }
  }

  return <Card className="p-5" data-testid="studio-default-method"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs text-[var(--text-secondary)]">公司方法</p><div className="mt-1 flex flex-wrap items-center gap-2"><h2 className="font-semibold">鑫世界默认创作方法 · V{method.version}</h2><Badge>已自动应用</Badge></div><p className="mt-2 text-xs text-[var(--text-secondary)]">真实问题优先 · 一个内容一个核心问题 · 真实证据优先 · 不编事实、不夸结果</p></div><Button variant="secondary" onClick={() => setMethodOpen(true)}>查看完整方法</Button></div>
    <div className="mt-5 border-t pt-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">现在最适合做</h3><span className="text-xs text-[var(--text-secondary)]">根据当前内容状态推荐</span></div><div className="mt-3 flex flex-wrap gap-2">{recommendedActions.map((item) => <Button key={`${item.action}-${item.label}`} variant="secondary" disabled={!editable || !configured || busy} onClick={() => void execute(item.action, item.instruction)}>{item.label}</Button>)}</div><details className="mt-3"><summary className="cursor-pointer text-sm text-[var(--accent)]">更多基础动作</summary><div className="mt-3 flex flex-wrap gap-2">{STUDIO_QUICK_ACTIONS.map((action) => <Button key={action} variant="secondary" disabled={!editable || !configured || busy} onClick={() => void execute(action)}>{labels[action]}</Button>)}</div></details><label className="mt-4 grid gap-1.5 text-sm"><span className="text-xs text-[var(--text-secondary)]">还有特殊要求，可以补一句</span><input value={instruction} onChange={(event) => setInstruction(event.target.value)} disabled={!editable || busy} className="h-10 rounded-lg border bg-transparent px-3" placeholder="例如：更像校长本人说话" /></label></div>
    {busy ? <p role="status" className="mt-4 text-sm text-[var(--text-secondary)]">AI 正在准备建议…</p> : null}{error ? <p role="alert" className="mt-4 text-sm text-[var(--danger)]">{error}</p> : null}{notice ? <p role="status" className="mt-4 text-sm text-[var(--success)]">{notice}</p> : null}
    {run ? <section className="mt-5 border-t pt-4" data-testid="studio-quick-preview"><div className="flex items-center justify-between gap-2"><h3 className="font-semibold">{labels[run.studioAction]}建议</h3><Badge>应用前预览</Badge></div><p className="mt-2 text-sm text-[var(--text-secondary)]">{run.output.summary}</p>{run.output.suggestions.length ? <div className="mt-3 grid gap-3">{run.output.suggestions.map((item, index) => <article key={`${item.title}-${index}`} className="rounded-xl border p-3"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium">{item.title}</p>{item.factState === "HYPOTHETICAL" ? <Badge>示例场景</Badge> : item.factState === "UNVERIFIED_JUDGMENT" ? <Badge>待补证据</Badge> : null}</div><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{item.text}</p>{run.studioAction === "TOPIC_IDEAS" ? <Button className="mt-3" variant="secondary" onClick={() => { onUseTopic(`${item.title}\n${item.text}`); setNotice("已放入我的补充，保存后生效。"); }}>放入我的补充</Button> : run.canApply ? <Button className="mt-3" variant="secondary" disabled={busy} onClick={() => void apply(index)}>应用这条建议</Button> : null}</article>)}</div> : null}{run.output.replacement ? <div className="mt-3 rounded-xl border p-3"><p className="whitespace-pre-wrap text-sm leading-6">{run.output.replacement}</p>{run.canApply ? <Button className="mt-3" disabled={busy} onClick={() => void apply()}>应用到口播稿</Button> : null}</div> : null}{run.output.risks.length ? <div className="mt-3 grid gap-2">{run.output.risks.map((risk, index) => <article key={index} className="rounded-xl border border-[var(--warning)]/40 p-3 text-sm"><p className="font-medium">{risk.text}</p><p className="mt-1 text-[var(--text-secondary)]">建议：{risk.handling}</p></article>)}</div> : null}</section> : null}
    <StudioDrawer title={`鑫世界默认创作方法 V${method.version}`} open={methodOpen} onClose={() => setMethodOpen(false)}>{method.sections.map((section) => <section key={section.code} className="mb-5"><h3 className="font-semibold">{sectionLabels[section.code]}</h3><ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-[var(--text-secondary)]">{section.items.map((item) => <li key={item.text}>{item.text}</li>)}</ul></section>)}</StudioDrawer>
  </Card>;
}
