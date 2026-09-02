"use client";

import { Badge, Button } from "@content-center/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

type AIAction = "ANALYZE_SOURCES" | "EXTRACT_EVIDENCE" | "GENERATE_ANGLES" | "GENERATE_BRIEF" | "GENERATE_MOTHER_CONTENT" | "REWRITE_SELECTION" | "SHORTEN" | "EXPAND" | "ADD_PERSONAL_VIEW" | "HUMANIZE";
type RewriteRequest = { id: number; action: AIAction; selectedText: string; selectionStart: number; selectionEnd: number };
type Run = { id: string; action: AIAction; status: string; output?: unknown; outputJson?: unknown; contextTruncated?: boolean };
type MotherContentSnapshot = { title: string; body: string; outline: string[]; version: number; origin: "HUMAN" | "KIMI" | "GPT_WEB"; originNote: string | null };
type UnifiedAnalysisView = { id: string; version: number; schemaVersion: string; status: string; inputFingerprint: string; output: unknown; errorCode: string | null; errorMessage: string | null; cached: boolean; isStale: boolean; createdAt: string; updatedAt: string };

const rewriteLabels: Partial<Record<AIAction, string>> = { REWRITE_SELECTION: "改写", SHORTEN: "缩短", EXPAND: "扩写", ADD_PERSONAL_VIEW: "增加个人观点", HUMANIZE: "表达自然化" };
function object(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function text(value: unknown) { return typeof value === "string" ? value : ""; }

export function AICreationPanel({ projectId, integrationStatus, hasCreatorProfile, editable, motherVersion, unifiedAnalysis, inputChanged, onAnalysisUpdated, rewriteRequest, onMotherContentApplied }: { projectId: string; integrationStatus: "CONFIGURED" | "UNCONFIGURED" | "NEEDS_RECONFIGURATION" | "DISABLED" | "ERROR" | "MOCK"; hasCreatorProfile: boolean; editable: boolean; motherVersion: number; unifiedAnalysis: UnifiedAnalysisView | null; inputChanged: boolean; onAnalysisUpdated: () => void; rewriteRequest: RewriteRequest | null; onMotherContentApplied: (content: MotherContentSnapshot) => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [analysis, setAnalysis] = useState(unifiedAnalysis);
  const [rewriteRun, setRewriteRun] = useState<Run | null>(null);
  const lastRewrite = useRef(0);
  const currentRewrite = useRef<RewriteRequest | null>(null);

  useEffect(() => { setAnalysis(unifiedAnalysis); }, [unifiedAnalysis]);

  async function call(path: string, body?: unknown) {
    const response = await fetch(path, { method: "POST", headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || result.error || "AI 操作失败");
    return result;
  }

  async function executeUnified() {
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await call(`/api/projects/${projectId}/ai/run`, { action: "UNIFIED_CREATIVE_ANALYSIS" }) as UnifiedAnalysisView;
      setAnalysis(result);
      onAnalysisUpdated();
      setMessage(result.cached ? "已复用相同输入的分析结果" : "AI 分析完成");
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "AI 分析暂时失败"); }
    finally { setBusy(false); }
  }

  async function executeRewrite(selection: RewriteRequest) {
    setBusy(true); setError(""); setMessage("");
    try {
      const run = await call(`/api/projects/${projectId}/ai/run`, { action: selection.action, selectedText: selection.selectedText });
      currentRewrite.current = selection;
      setRewriteRun(run);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "AI 操作失败"); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    if (!rewriteRequest || rewriteRequest.id === lastRewrite.current || (integrationStatus !== "CONFIGURED" && integrationStatus !== "MOCK")) return;
    lastRewrite.current = rewriteRequest.id;
    void executeRewrite(rewriteRequest);
  }, [rewriteRequest, integrationStatus]);

  async function applyRewrite(mode: "REPLACE" | "INSERT_AFTER") {
    if (!rewriteRun || !currentRewrite.current) return;
    setBusy(true); setError("");
    try {
      const result = object(await call(`/api/projects/${projectId}/ai/runs/${rewriteRun.id}/apply`, { expectedVersion: motherVersion, selectionStart: currentRewrite.current.selectionStart, selectionEnd: currentRewrite.current.selectionEnd, mode }));
      const mother = object(result.motherContent);
      onMotherContentApplied({ title: text(mother.title), body: text(mother.body), outline: array(mother.outline).filter((item): item is string => typeof item === "string"), version: typeof mother.version === "number" ? mother.version : motherVersion + 1, origin: mother.origin === "GPT_WEB" || mother.origin === "HUMAN" ? mother.origin : "KIMI", originNote: typeof mother.originNote === "string" ? mother.originNote : null });
      setRewriteRun(null); setMessage("AI 结果已应用"); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "应用失败"); }
    finally { setBusy(false); }
  }

  async function discardRewrite() {
    if (!rewriteRun) return;
    setBusy(true); setError("");
    try { await call(`/api/projects/${projectId}/ai/runs/${rewriteRun.id}/discard`); setRewriteRun(null); setMessage("已放弃本次 AI 结果"); router.refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "放弃失败"); }
    finally { setBusy(false); }
  }

  const configured = integrationStatus === "CONFIGURED" || integrationStatus === "MOCK";
  const stale = Boolean(analysis && (analysis.isStale || inputChanged));
  const output = object(analysis?.output);
  const rewriteOutput = object(rewriteRun?.output ?? rewriteRun?.outputJson);
  return <section data-testid="unified-creative-analysis"><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">AI 创作分析</h2><p className="mt-1 text-xs text-[var(--text-secondary)]">一次整理创作理解、可选角度、结构、素材依据与风险提醒。</p></div><Badge>{integrationStatus === "MOCK" ? "MOCK MODE" : integrationStatus}</Badge></div>
    {!configured ? <div className="mt-4 rounded-xl border border-dashed p-4 text-sm"><p>{integrationStatus === "DISABLED" ? "AI 模型已禁用" : "尚未配置 AI 模型"}</p><Link href="/settings/integrations" className="mt-2 inline-block font-medium text-[var(--accent)]">前往设置</Link></div> : null}
    {configured && !hasCreatorProfile ? <p className="mt-3 rounded-lg bg-[var(--surface-elevated)] p-3 text-xs text-[var(--text-secondary)]">尚未建立个人创作画像，分析将只使用项目上下文。 <Link href="/settings/creator-profile" className="text-[var(--accent)]">去建立</Link></p> : null}
    {stale ? <p className="mt-3 rounded-lg bg-[var(--surface-elevated)] p-3 text-xs text-[var(--warning)]">创作信息已更新，可更新 AI 分析。旧分析不会覆盖当前创作简报。</p> : null}
    {configured && editable && (!analysis || stale) ? <Button className="mt-4 w-full" disabled={busy} onClick={executeUnified}>{analysis ? "更新 AI 分析" : "AI 深度分析"}</Button> : null}
    {analysis && !stale ? <p className="mt-3 text-xs text-[var(--success)]">AI 分析已是最新 · v{analysis.version}</p> : null}
    {busy ? <p role="status" className="mt-4 text-sm text-[var(--text-secondary)]">AI 分析生成中…</p> : null}
    {error ? <p role="alert" className="mt-4 text-sm text-[var(--danger)]">AI 分析暂时失败：{error}</p> : null}
    {message ? <p role="status" className="mt-4 text-sm text-[var(--success)]">{message}</p> : null}
    {analysis?.output ? <UnifiedAnalysisResult output={output} /> : null}
    {rewriteRun ? <div className="mt-5 border-t pt-5"><h3 className="text-sm font-semibold">{rewriteLabels[rewriteRun.action] || "AI 编辑"}预览</h3><div className="mt-3 grid gap-3 text-xs"><div className="rounded-lg bg-[var(--surface-elevated)] p-3"><strong>原文</strong><p className="mt-2 whitespace-pre-wrap">{text(rewriteOutput.original)}</p></div><div className="rounded-lg border p-3"><strong>AI 建议版本</strong><p className="mt-2 whitespace-pre-wrap">{text(rewriteOutput.aiVersion)}</p></div></div><div className="mt-4 grid gap-2"><Button disabled={busy} onClick={() => applyRewrite("REPLACE")}>替换选中文字</Button><Button variant="secondary" disabled={busy} onClick={() => applyRewrite("INSERT_AFTER")}>插入下方</Button><Button variant="ghost" disabled={busy} onClick={discardRewrite}>放弃</Button></div></div> : null}
  </section>;
}

function UnifiedAnalysisResult({ output }: { output: Record<string, unknown> }) {
  const interpretation = object(output.creativeInterpretation);
  const structure = object(output.structure);
  const expression = object(output.expressionDirection);
  return <div className="mt-5 grid gap-4 border-t pt-5 text-xs">
    <AnalysisSection title="创作理解" classification={text(interpretation.classification)}><p className="leading-5">{text(interpretation.text)}</p><SourceFacts output={output} /></AnalysisSection>
    <AnalysisSection title="可选切入角度" classification="AI_SUGGESTION"><div className="grid gap-2">{array(output.angles).map((value, index) => { const item = object(value); return <article key={index} className="rounded-lg border p-3"><p className="font-semibold">{text(item.title)}</p><p className="mt-1 leading-5">{text(item.angle)}</p><p className="mt-1 text-[var(--text-secondary)]">{text(item.rationale)}</p></article>; })}</div></AnalysisSection>
    <AnalysisSection title="结构建议" classification={text(structure.classification)}><p className="leading-5">{text(structure.overallApproach)}</p><ol className="mt-2 grid gap-2">{array(structure.sections).map((value, index) => { const item = object(value); return <li key={index} className="rounded-lg bg-[var(--surface-elevated)] p-3"><strong>{index + 1}. {text(item.title)}</strong><p className="mt-1">{text(item.purpose)}</p><p className="mt-1 text-[var(--text-secondary)]">{text(item.keyMessage)}</p></li>; })}</ol></AnalysisSection>
    <AnalysisSection title="素材依据" classification="SOURCE_FACT"><div className="grid gap-2">{array(output.sourceReferences).map((value, index) => { const item = object(value); return <p key={index} className="rounded-lg bg-[var(--surface-elevated)] p-2">{text(item.title) || text(item.sourceItemId)} · {text(item.role)}</p>; })}{array(output.groundingGaps).length ? <p className="text-[var(--warning)]">SOURCE_REFERENCE_GAP：部分建议缺少足够的素材引用，请人工核对。</p> : null}</div></AnalysisSection>
    <AnalysisSection title="表达方向" classification={text(expression.classification)}><p>{text(expression.description)}</p><p className="mt-1 text-[var(--text-secondary)]">{text(expression.rationale)}</p></AnalysisSection>
    <AnalysisSection title="风险提醒" classification="AI_INTERPRETATION"><ul className="list-disc space-y-1 pl-4">{array(output.riskNotes).map((value, index) => <li key={index}>{text(object(value).text)}</li>)}</ul></AnalysisSection>
    <AnalysisSection title="标题参考" classification="AI_SUGGESTION"><p className="mb-2 text-[var(--text-secondary)]">仅供参考，不是最终标题。</p><ul className="list-disc space-y-1 pl-4">{array(output.titleReferences).map((value, index) => <li key={index}>{text(object(value).title)}</li>)}</ul></AnalysisSection>
  </div>;
}

function SourceFacts({ output }: { output: Record<string, unknown> }) {
  const summary = object(output.summary); const question = object(output.coreQuestion); const viewpoint = object(output.coreViewpoint);
  return <dl className="mt-3 grid gap-2 rounded-lg bg-[var(--surface-elevated)] p-3"><div><dt className="font-medium">素材背景</dt><dd className="mt-1">{text(summary.text) || "未提供"}</dd></div><div><dt className="font-medium">核心问题</dt><dd className="mt-1">{text(question.text) || "未提供"}</dd></div><div><dt className="font-medium">素材核心观点</dt><dd className="mt-1">{text(viewpoint.text) || "未提供"}</dd></div></dl>;
}

function AnalysisSection({ title, classification, children }: { title: string; classification: string; children: ReactNode }) {
  const labels: Record<string, string> = { SOURCE_FACT: "素材事实", USER_INPUT: "用户输入", AI_INTERPRETATION: "AI 解读", AI_SUGGESTION: "AI 建议" };
  return <section><div className="mb-2 flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">{title}</h3>{classification ? <Badge>{labels[classification] || classification}</Badge> : null}</div>{children}</section>;
}

export type { AIAction, RewriteRequest, UnifiedAnalysisView };
