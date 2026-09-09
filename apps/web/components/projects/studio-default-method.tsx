"use client";

import { Badge, Button, Card } from "@content-center/ui";
import { Bot, Expand, MessageSquareText, Scissors, Sparkles, WandSparkles } from "lucide-react";
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
type SelectionRun = { id: string; action: "REWRITE_SELECTION" | "SHORTEN" | "EXPAND" | "HUMANIZE"; output?: { original?: string; aiVersion?: string }; outputJson?: { original?: string; aiVersion?: string } };
type TextSelection = { text: string; start: number; end: number };
type MotherSnapshot = { title: string; body: string; outline: string[]; version: number; origin: "HUMAN" | "KIMI" | "GPT_WEB"; originNote: string | null };

async function post(url: string, body: unknown) {
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || result.error || "AI 暂时无法处理这个动作。");
  return result;
}

export function StudioDefaultMethod({ projectId, method, recommendedActions, editable, configured, motherVersion, selection, onApplied, onUseTopic, onSelectionApplied }: { projectId: string; method: StudioDefaultContentMethodDTO | null; recommendedActions: StudioActionRecommendation[]; editable: boolean; configured: boolean; motherVersion: number; selection?: TextSelection | null; onApplied: (mother: MotherSnapshot, warnings: Array<{ code: string; message: string; reason?: string; suggestion?: string }>) => void; onUseTopic: (text: string) => void; onSelectionApplied?: () => void }) {
  const [methodOpen, setMethodOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [run, setRun] = useState<QuickRun | null>(null);
  const [selectionRun, setSelectionRun] = useState<SelectionRun | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  if (!method) return null;

  async function execute(studioAction: StudioQuickAction, recommendedInstruction?: string) {
    setBusy(true); setError(""); setNotice(""); setRun(null); setSelectionRun(null);
    const combinedInstruction = [recommendedInstruction, instruction.trim()].filter(Boolean).join("；");
    try { setRun(await post(`/api/projects/${projectId}/ai/run`, { studioAction, ...(combinedInstruction ? { instruction: combinedInstruction } : {}) }) as QuickRun); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "AI 暂时无法处理这个动作。"); }
    finally { setBusy(false); }
  }

  async function executeSelection(action: SelectionRun["action"]) {
    if (!selection) return;
    setBusy(true); setError(""); setNotice(""); setRun(null); setSelectionRun(null);
    try { setSelectionRun(await post(`/api/projects/${projectId}/ai/run`, { action, selectedText: selection.text, ...(instruction.trim() ? { instruction: instruction.trim() } : {}) }) as SelectionRun); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "AI 暂时无法处理选中的文字。"); }
    finally { setBusy(false); }
  }

  async function applySelection() {
    if (!selectionRun || !selection) return;
    setBusy(true); setError("");
    try {
      const result = await post(`/api/projects/${projectId}/ai/runs/${selectionRun.id}/apply`, { expectedVersion: motherVersion, selectionStart: selection.start, selectionEnd: selection.end, mode: "REPLACE" });
      onApplied(result.motherContent as MotherSnapshot, result.warnings ?? []); setSelectionRun(null); onSelectionApplied?.(); setNotice("已替换选中的文字，你仍可以继续修改。");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "应用失败，请重新选择文字后再试。"); }
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

  const selectionOutput = selectionRun?.output ?? selectionRun?.outputJson;
  return <Card className="studio-assistant-panel p-4" data-testid="studio-default-method"><div className="flex items-start gap-3"><span className="assistant-avatar shrink-0"><Bot size={21} /></span><div className="min-w-0 flex-1"><p className="text-xs text-[var(--text-secondary)]">AI 创作助手</p><div className="mt-1 flex flex-wrap items-center gap-2"><h2 className="font-semibold">鑫小助</h2><Badge>方法 V{method.version} 已自动应用</Badge></div><p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">结合当前稿件、真实资料和默认方法提供建议。</p></div></div>
    <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-[var(--surface-muted)] px-3 py-2"><span className="text-xs text-[var(--text-secondary)]">鑫世界默认创作方法 · V{method.version}</span><button type="button" onClick={() => setMethodOpen(true)} className="inline-flex min-h-10 shrink-0 items-center gap-2 text-xs font-medium text-[var(--accent)]"><Sparkles size={14} />查看完整方法</button></div>
    {selection ? <section className="mt-3 rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-soft)] p-3"><div className="flex items-center gap-2"><WandSparkles size={16} className="text-[var(--accent)]" /><h3 className="text-sm font-semibold">已选中一段文字</h3></div><p className="mt-2 line-clamp-3 text-xs leading-5 text-[var(--text-secondary)]">{selection.text}</p><div className="mt-3 grid grid-cols-2 gap-2"><Button variant="secondary" disabled={!editable || !configured || busy} onClick={() => void executeSelection("REWRITE_SELECTION")}><WandSparkles size={14} />换个表达</Button><Button variant="secondary" disabled={!editable || !configured || busy} onClick={() => void executeSelection("HUMANIZE")}><MessageSquareText size={14} />更口语</Button><Button variant="secondary" disabled={!editable || !configured || busy} onClick={() => void executeSelection("SHORTEN")}><Scissors size={14} />精简</Button><Button variant="secondary" disabled={!editable || !configured || busy} onClick={() => void executeSelection("EXPAND")}><Expand size={14} />继续写</Button></div></section> : <p className="mt-3 rounded-xl bg-[var(--surface-muted)] p-3 text-xs leading-5 text-[var(--text-secondary)]">在中间稿件里选中文字，我会自动切换到局部修改。</p>}
    <div className="mt-4 border-t pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">现在最适合做</h3><span className="text-xs text-[var(--text-secondary)]">根据当前内容状态推荐</span></div>
      <div className="mt-3 flex flex-wrap gap-2">{recommendedActions.map((item) => <Button key={`${item.action}-${item.label}`} variant="secondary" disabled={!editable || !configured || busy} onClick={() => void execute(item.action, item.instruction)}>{item.label}</Button>)}</div>
      <details className="mt-3"><summary className="min-h-10 text-sm text-[var(--accent)]">更多基础动作</summary><div className="mt-2 flex flex-wrap gap-2">{STUDIO_QUICK_ACTIONS.map((action) => <Button key={action} variant="secondary" disabled={!editable || !configured || busy} onClick={() => void execute(action)}>{labels[action]}</Button>)}</div></details>
      <label className="mt-4 grid gap-1.5 text-sm"><span className="text-xs text-[var(--text-secondary)]">告诉鑫小助这次怎么处理</span><input value={instruction} onChange={(event) => setInstruction(event.target.value)} disabled={!editable || busy} className="h-11 rounded-xl border bg-white/60 px-3 outline-none focus:border-[var(--accent)]" placeholder="例如：更像校长本人说话" /></label>
      <p className="mt-2 text-[11px] leading-4 text-[var(--text-tertiary)]">这句话会和你点击的动作一起进入同一条事实安全链。</p>
    </div>
    {busy ? <p role="status" className="mt-4 text-sm text-[var(--text-secondary)]">AI 正在准备建议…</p> : null}{error ? <p role="alert" className="mt-4 text-sm text-[var(--danger)]">{error}</p> : null}{notice ? <p role="status" className="mt-4 text-sm text-[var(--success)]">{notice}</p> : null}
    {selectionRun && selectionOutput ? <section className="mt-4 border-t pt-4"><div className="flex items-center justify-between gap-2"><h3 className="font-semibold">局部修改预览</h3><Badge>应用前预览</Badge></div><div className="mt-3 rounded-xl border bg-white/65 p-3"><p className="whitespace-pre-wrap text-sm leading-6">{selectionOutput.aiVersion || "这次没有生成可直接使用的结果。"}</p></div><div className="mt-3 flex gap-2"><Button disabled={busy} onClick={() => void applySelection()}>替换选中文字</Button><Button variant="ghost" disabled={busy} onClick={() => setSelectionRun(null)}>放弃</Button></div></section> : null}
    {run ? <section className="mt-5 border-t pt-4" data-testid="studio-quick-preview"><div className="flex items-center justify-between gap-2"><h3 className="font-semibold">{labels[run.studioAction]}建议</h3><Badge>应用前预览</Badge></div><p className="mt-2 text-sm text-[var(--text-secondary)]">{run.output.summary}</p>{run.output.suggestions.length ? <div className="mt-3 grid gap-3">{run.output.suggestions.map((item, index) => <article key={`${item.title}-${index}`} className="rounded-xl border p-3"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium">{item.title}</p>{item.factState === "HYPOTHETICAL" ? <Badge>示例场景</Badge> : item.factState === "UNVERIFIED_JUDGMENT" ? <Badge>待补证据</Badge> : null}</div><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{item.text}</p>{run.studioAction === "TOPIC_IDEAS" ? <Button className="mt-3" variant="secondary" onClick={() => { onUseTopic(`${item.title}\n${item.text}`); setNotice("已放入我的补充，保存后生效。"); }}>放入我的补充</Button> : run.canApply ? <Button className="mt-3" variant="secondary" disabled={busy} onClick={() => void apply(index)}>应用这条建议</Button> : null}</article>)}</div> : null}{run.output.replacement ? <div className="mt-3 rounded-xl border p-3"><p className="whitespace-pre-wrap text-sm leading-6">{run.output.replacement}</p>{run.canApply ? <Button className="mt-3" disabled={busy} onClick={() => void apply()}>应用到口播稿</Button> : null}</div> : null}{run.output.risks.length ? <div className="mt-3 grid gap-2">{run.output.risks.map((risk, index) => <article key={index} className="rounded-xl border border-[var(--warning)]/40 p-3 text-sm"><p className="font-medium">{risk.text}</p><p className="mt-1 text-[var(--text-secondary)]">建议：{risk.handling}</p></article>)}</div> : null}</section> : null}
    <StudioDrawer title={`鑫世界默认创作方法 V${method.version}`} open={methodOpen} onClose={() => setMethodOpen(false)}>{method.sections.map((section) => <section key={section.code} className="mb-5"><h3 className="font-semibold">{sectionLabels[section.code]}</h3><ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-[var(--text-secondary)]">{section.items.map((item) => <li key={item.text}>{item.text}</li>)}</ul></section>)}</StudioDrawer>
  </Card>;
}
