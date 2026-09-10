"use client";

import { Badge, Button } from "@content-center/ui";
import { ArrowRight, BookOpenCheck, Files, MessageSquareText, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { forwardRef, useImperativeHandle, useState } from "react";
import { STUDIO_QUICK_ACTIONS, type StudioActionRecommendation, type StudioQuickAction } from "@/server/ai/schemas";
import type { StudioDefaultContentMethodDTO } from "@/server/default-content-method/service";
import { AssistantShell } from "@/components/assistant-shell";
import { StudioDrawer } from "./studio-drawer";
import type { StudioSelectionAction } from "./mother-content-editor";

const labels: Record<StudioQuickAction, string> = {
  TOPIC_IDEAS: "想选题", REWRITE_OPENING: "改开头", REWRITE_BODY: "重写正文", ADD_CASE: "补案例", STRENGTHEN_EVIDENCE: "补依据",
  HUMANIZE_TEXT: "更口语", SHORTEN_TEXT: "精简", ALTERNATIVE_EXPRESSION: "换个表达", FACT_CHECK: "检查事实", DEFAULT_METHOD_OPTIMIZE: "按鑫世界方法优化",
};
const sectionLabels = { AUDIENCE: "我们主要给谁做内容", TOPIC: "什么样的选题优先做", OPENING: "开头怎么进入", BODY: "正文怎么讲", EVIDENCE: "案例和数据怎么用", ENDING: "怎么收尾", BOUNDARY: "哪些事情不要做" } as const;
const factLabels = { CONFIRMED_OWN_FACT: "可以直接使用", EXTERNAL_FACT: "外部参考", HYPOTHETICAL: "可以用示例场景", CREATIVE_EXPRESSION: "当前可直接使用", UNVERIFIED_JUDGMENT: "需要核实" } as const;

type QuickOutput = { original: string; summary: string; suggestions: Array<{ title: string; text: string; factState?: keyof typeof factLabels }>; replacement: string | null; risks: Array<{ text: string; handling: string }> };
type QuickRun = { id: string; studioAction: StudioQuickAction; output: QuickOutput; canApply: boolean };
type TextSelection = { text: string; start: number; end: number };
type MotherSnapshot = { title: string; body: string; outline: string[]; version: number; origin: "HUMAN" | "KIMI" | "GPT_WEB"; originNote: string | null };

export type StudioAssistantHandle = { executeSelection: (action: StudioSelectionAction) => void };
type Props = { projectId: string; method: StudioDefaultContentMethodDTO | null; recommendedActions: StudioActionRecommendation[]; editable: boolean; configured: boolean; motherVersion: number; selection?: TextSelection | null; contextStats: { sources: number; facts: number; methods: number }; onClose: () => void; onApplied: (mother: MotherSnapshot, warnings: Array<{ code: string; message: string; reason?: string; suggestion?: string }>) => void; onUseTopic: (text: string) => void; onSelectionApplied?: () => void };

async function post(url: string, body: unknown) {
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || result.error || "AI 暂时无法处理这个动作。");
  return result;
}

export const StudioDefaultMethod = forwardRef<StudioAssistantHandle, Props>(function StudioDefaultMethod({ projectId, method, recommendedActions, editable, configured, motherVersion, selection, contextStats, onClose, onApplied, onUseTopic, onSelectionApplied }, ref) {
  const [methodOpen, setMethodOpen] = useState(false);
  const [view, setView] = useState<"ACTIONS" | "CHAT" | "SOURCES">("ACTIONS");
  const [instruction, setInstruction] = useState("");
  const [moreAction, setMoreAction] = useState<StudioQuickAction | "">("");
  const [busy, setBusy] = useState(false);
  const [run, setRun] = useState<QuickRun | null>(null);
  const [selectionRun, setSelectionRun] = useState<QuickRun | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function execute(studioAction: StudioQuickAction, recommendedInstruction?: string) {
    setBusy(true); setError(""); setNotice(""); setRun(null); setSelectionRun(null); setPreviewIndex(0); setView("ACTIONS");
    const combinedInstruction = [recommendedInstruction, instruction.trim()].filter(Boolean).join("；");
    try { setRun(await post(`/api/projects/${projectId}/ai/run`, { studioAction, ...(combinedInstruction ? { instruction: combinedInstruction } : {}) }) as QuickRun); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "AI 暂时无法处理这个动作。"); }
    finally { setBusy(false); }
  }

  async function executeSelection(studioAction: StudioSelectionAction) {
    if (!selection || !method) return;
    setBusy(true); setError(""); setNotice(""); setRun(null); setSelectionRun(null); setView("ACTIONS");
    try { setSelectionRun(await post(`/api/projects/${projectId}/ai/run`, { studioAction, selectedText: selection.text, selectionStart: selection.start, selectionEnd: selection.end, ...(instruction.trim() ? { instruction: instruction.trim() } : {}) }) as QuickRun); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "AI 暂时无法处理选中的文字。"); }
    finally { setBusy(false); }
  }

  useImperativeHandle(ref, () => ({ executeSelection: (action) => { void executeSelection(action); } }));

  async function applySelection() {
    if (!selectionRun || !selection) return;
    setBusy(true); setError("");
    try { const result = await post(`/api/projects/${projectId}/ai/runs/${selectionRun.id}/apply`, { studioQuickAction: true, expectedVersion: motherVersion }); onApplied(result.motherContent as MotherSnapshot, result.warnings ?? []); setSelectionRun(null); onSelectionApplied?.(); setNotice("已应用到选中文字，并生成新的稿件版本。"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "应用失败，请重新选择文字后再试。"); }
    finally { setBusy(false); }
  }

  async function apply(suggestionIndex?: number) {
    if (!run) return;
    setBusy(true); setError("");
    try { const result = await post(`/api/projects/${projectId}/ai/runs/${run.id}/apply`, { studioQuickAction: true, expectedVersion: motherVersion, ...(suggestionIndex === undefined ? {} : { suggestionIndex }) }); onApplied(result.motherContent as MotherSnapshot, result.warnings ?? []); setRun(null); setNotice("建议已应用到正文，并生成新的稿件版本。"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "应用失败，请重新运行这个动作。"); }
    finally { setBusy(false); }
  }

  if (!method) return <div className="studio-assistant-panel" data-testid="studio-default-method"><AssistantShell title="鑫小助" description="当前项目还没有可用的默认方法。" context={<Badge>需要方法</Badge>} onClose={onClose}><div className="studio-context-empty"><Sparkles size={22} /><p>暂时不能运行创作建议</p><span>发布默认创作方法后，这里会显示与当前稿件相关的快捷动作。</span></div></AssistantShell></div>;

  const recommendedTypes = new Set(recommendedActions.map((item) => item.action));
  const additionalActions = STUDIO_QUICK_ACTIONS.filter((action) => !recommendedTypes.has(action));
  const suggestion = run?.output.suggestions[Math.min(previewIndex, Math.max(0, run.output.suggestions.length - 1))];
  return <div className="studio-assistant-panel" data-testid="studio-default-method"><AssistantShell title="鑫小助" description="基于当前稿件、资料和方法给你建议。" context={<span className="studio-assistant-context-note">稿件 V{motherVersion || 0} · 默认方法 V{method.version}</span>} onClose={onClose} composerPlaceholder="和鑫小助说……">
    <nav className="studio-ai-tabs" role="tablist" aria-label="AI 助手视图"><button role="tab" aria-selected={view === "ACTIONS"} onClick={() => setView("ACTIONS")}>当前建议</button><button role="tab" aria-selected={view === "CHAT"} onClick={() => setView("CHAT")}>对话</button><button role="tab" aria-selected={view === "SOURCES"} onClick={() => setView("SOURCES")}>当前参考</button></nav>
    {view === "CHAT" ? <section className="studio-assistant-ready"><MessageSquareText size={22} /><h3>即将支持自由对话</h3><p>未来可以基于当前稿件继续追问。当前不会创建假回复或假运行记录。</p></section> : null}
    {view === "SOURCES" ? <section className="studio-assistant-sources"><article><Files size={18} /><span><strong>{contextStats.sources} 条资料</strong><small>当前稿件正在使用</small></span></article><article><ShieldCheck size={18} /><span><strong>{contextStats.facts} 条我方依据</strong><small>可以安全用于当前创作</small></span></article><article><BookOpenCheck size={18} /><span><strong>{contextStats.methods} 个方法</strong><small>按当前动作裁剪使用</small></span></article><button type="button" onClick={() => setMethodOpen(true)}>查看默认方法<ArrowRight size={15} /></button></section> : null}
    {view === "ACTIONS" ? <div className="studio-ai-actions-view">
      {selection ? <div className="studio-selection-context"><span>正在处理选中的 {selection.text.trim().length} 个字</span><p>{selection.text}</p></div> : null}
      {!run && !selectionRun ? <section className="studio-recommended-actions"><div><h3>当前最适合做</h3><span>基于当前内容</span></div><div>{recommendedActions.slice(0, 4).map((item) => <button key={`${item.action}-${item.label}`} type="button" disabled={!editable || !configured || busy} onClick={() => void execute(item.action, item.instruction)}><Sparkles size={17} /><span><strong>{item.label}</strong><small>{labels[item.action]}</small></span><ArrowRight size={15} /></button>)}</div><div className="studio-more-action"><select aria-label="更多 AI 操作" value={moreAction} onChange={(event) => setMoreAction(event.target.value as StudioQuickAction | "")}><option value="">更多</option>{additionalActions.map((action) => <option key={action} value={action}>{labels[action]}</option>)}</select><Button variant="secondary" disabled={!moreAction || busy || !editable || !configured} onClick={() => { if (moreAction) void execute(moreAction); }}>执行</Button></div></section> : null}
      {selectionRun ? <section className="studio-ai-preview" data-testid="studio-selection-preview"><header><div><span>AI 预览结果</span><h3>{selectionRun.studioAction === "FACT_CHECK" ? "事实检查" : labels[selectionRun.studioAction]}</h3></div><Badge>应用前预览</Badge></header>{selectionRun.output.replacement ? <div className="studio-preview-compare"><article><strong>当前内容</strong><p>{selectionRun.output.original}</p></article><article><strong>AI 建议</strong><p>{selectionRun.output.replacement}</p></article></div> : null}{selectionRun.output.risks.length ? <div className="studio-preview-risks">{selectionRun.output.risks.map((risk, index) => <article key={index}><strong>需要核实</strong><p>{risk.text}</p><span>{risk.handling}</span></article>)}</div> : null}<footer>{selectionRun.canApply ? <Button disabled={busy} onClick={() => void applySelection()}>应用到选中文字</Button> : null}<Button variant="secondary" disabled={busy} onClick={() => setSelectionRun(null)}>保留原文</Button></footer></section> : null}
      {run ? <section className="studio-ai-preview" data-testid="studio-quick-preview"><header><div><span>AI 预览结果</span><h3>{labels[run.studioAction]}</h3></div><Badge>应用前预览</Badge></header><p className="studio-preview-summary">{run.output.summary}</p>{run.output.suggestions.length > 1 ? <div className="studio-preview-options">{run.output.suggestions.map((item, index) => <button type="button" key={`${item.title}-${index}`} aria-pressed={previewIndex === index} onClick={() => setPreviewIndex(index)}><span>方案 {index + 1}</span><strong>{item.title}</strong></button>)}</div> : null}{suggestion ? <article className="studio-preview-selected"><div><h4>{suggestion.title}</h4>{suggestion.factState ? <Badge>{factLabels[suggestion.factState]}</Badge> : null}</div><p>{suggestion.text}</p></article> : null}{run.output.replacement ? <div className="studio-preview-compare"><article><strong>当前内容</strong><p>{run.output.original}</p></article><article><strong>AI 建议</strong><p>{run.output.replacement}</p></article></div> : null}{run.output.risks.length ? <div className="studio-preview-risks">{run.output.risks.map((risk, index) => <article key={index}><strong>需要核实</strong><p>{risk.text}</p><span>{risk.handling}</span></article>)}</div> : null}<footer><Button variant="secondary" disabled={busy} onClick={() => void execute(run.studioAction)}><RefreshCw size={15} />重新生成</Button>{run.studioAction === "TOPIC_IDEAS" && suggestion ? <Button onClick={() => { onUseTopic(`${suggestion.title}\n${suggestion.text}`); setNotice("已放入我的补充，保存后生效。"); }}>放入我的补充</Button> : run.canApply ? <Button disabled={busy} onClick={() => void apply(run.output.suggestions.length ? previewIndex : undefined)}>应用到正文</Button> : null}</footer></section> : null}
      {busy ? <p role="status" className="studio-assistant-status">AI 正在准备建议…</p> : null}{error ? <p role="alert" className="studio-assistant-error">{error}</p> : null}{notice ? <p role="status" className="studio-assistant-success">{notice}</p> : null}
      <label className="studio-assistant-instruction"><span>补充要求（可选）</span><button type="button" onClick={() => setInstruction("")} disabled={!instruction}>清空</button><textarea value={instruction} onChange={(event) => setInstruction(event.target.value)} maxLength={200} disabled={!editable || busy} placeholder="比如：更像校长本人说话，更口语化一些…" /><small>{instruction.length}/200</small></label>
    </div> : null}
    <StudioDrawer title={`鑫世界默认创作方法 V${method.version}`} open={methodOpen} onClose={() => setMethodOpen(false)}>{method.sections.map((section) => <section key={section.code} className="mb-5"><h3 className="font-semibold">{sectionLabels[section.code]}</h3><ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-[var(--text-secondary)]">{section.items.map((item) => <li key={item.text}>{item.text}</li>)}</ul></section>)}</StudioDrawer>
  </AssistantShell></div>;
});
