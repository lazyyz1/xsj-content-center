"use client";

import { Badge, Button } from "@content-center/ui";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type AIAction = "ANALYZE_SOURCES" | "EXTRACT_EVIDENCE" | "GENERATE_ANGLES" | "GENERATE_BRIEF" | "GENERATE_MOTHER_CONTENT" | "REWRITE_SELECTION" | "SHORTEN" | "EXPAND" | "ADD_PERSONAL_VIEW" | "HUMANIZE";
type RewriteRequest = { id: number; action: AIAction; selectedText: string; selectionStart: number; selectionEnd: number };
type Run = { id: string; action: AIAction; status: string; output?: unknown; outputJson?: unknown; contextTruncated?: boolean; errorCode?: string | null; appliedAt?: string | Date | null; discardedAt?: string | Date | null };
type MotherContentSnapshot = { title: string; body: string; outline: string[]; version: number; origin: "HUMAN" | "KIMI" | "GPT_WEB"; originNote: string | null };

const labels: Record<AIAction, string> = { ANALYZE_SOURCES: "分析素材", EXTRACT_EVIDENCE: "提取观点 / 证据", GENERATE_ANGLES: "生成创作角度", GENERATE_BRIEF: "生成创作简报", GENERATE_MOTHER_CONTENT: "生成核心母稿", REWRITE_SELECTION: "改写", SHORTEN: "缩短", EXPAND: "扩写", ADD_PERSONAL_VIEW: "增加个人观点", HUMANIZE: "表达自然化" };
const actions: AIAction[] = ["ANALYZE_SOURCES", "EXTRACT_EVIDENCE", "GENERATE_ANGLES", "GENERATE_BRIEF", "GENERATE_MOTHER_CONTENT"];

function object(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function text(value: unknown) { return typeof value === "string" ? value : ""; }

export function AICreationPanel({ projectId, integrationStatus, hasCreatorProfile, editable, briefVersion, motherVersion, motherHasContent, recentRuns, rewriteRequest, onMotherContentApplied }: { projectId: string; integrationStatus: "CONFIGURED" | "UNCONFIGURED" | "NEEDS_RECONFIGURATION" | "DISABLED" | "ERROR" | "MOCK"; hasCreatorProfile: boolean; editable: boolean; briefVersion: number; motherVersion: number; motherHasContent: boolean; recentRuns: Run[]; rewriteRequest: RewriteRequest | null; onMotherContentApplied: (content: MotherContentSnapshot) => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [current, setCurrent] = useState<Run | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<number[]>([]);
  const lastRewrite = useRef(0);
  const currentRewrite = useRef<RewriteRequest | null>(null);

  async function call(path: string, body?: unknown) {
    const response = await fetch(path, { method: "POST", headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || result.error || "AI 操作失败");
    return result;
  }
  async function execute(action: AIAction, selection?: RewriteRequest) {
    setBusy(true); setError(""); setMessage(""); setSelectedEvidence([]);
    try {
      const run = await call(`/api/projects/${projectId}/ai/run`, { action, ...(selection ? { selectedText: selection.selectedText } : {}) });
      currentRewrite.current = selection ?? null;
      setCurrent(run);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "AI 操作失败"); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    if (!rewriteRequest || rewriteRequest.id === lastRewrite.current || (integrationStatus !== "CONFIGURED" && integrationStatus !== "MOCK")) return;
    lastRewrite.current = rewriteRequest.id;
    void execute(rewriteRequest.action, rewriteRequest);
  }, [rewriteRequest, integrationStatus]);

  async function apply(body: Record<string, unknown>) {
    if (!current) return;
    setBusy(true); setError("");
    try {
      const result = object(await call(`/api/projects/${projectId}/ai/runs/${current.id}/apply`, body));
      const appliedMother = object(result.motherContent);
      if (result.target === "mother_content") onMotherContentApplied({ title: text(appliedMother.title), body: text(appliedMother.body), outline: array(appliedMother.outline).filter((item): item is string => typeof item === "string"), version: typeof appliedMother.version === "number" ? appliedMother.version : motherVersion + 1, origin: appliedMother.origin === "GPT_WEB" || appliedMother.origin === "HUMAN" ? appliedMother.origin : "KIMI", originNote: typeof appliedMother.originNote === "string" ? appliedMother.originNote : null });
      setMessage("AI 结果已应用"); setCurrent(null); router.refresh();
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : "应用失败"); }
    finally { setBusy(false); }
  }
  async function discard() {
    if (!current) return;
    setBusy(true); setError("");
    try { await call(`/api/projects/${projectId}/ai/runs/${current.id}/discard`); setCurrent(null); setMessage("已放弃本次 AI 结果"); router.refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "放弃失败"); }
    finally { setBusy(false); }
  }

  const configured = integrationStatus === "CONFIGURED" || integrationStatus === "MOCK";
  const output = current?.output ?? current?.outputJson;
  return <section><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">AI 创作辅助</h2><p className="mt-1 text-xs text-[var(--text-secondary)]">每次先生成预览，再由你决定是否应用。</p></div><Badge>{integrationStatus === "MOCK" ? "MOCK MODE" : integrationStatus}</Badge></div>
    {!configured ? <div className="mt-4 rounded-xl border border-dashed p-4 text-sm"><p>{integrationStatus === "DISABLED" ? "AI 模型已禁用" : "尚未配置 AI 模型"}</p><Link href="/settings/integrations" className="mt-2 inline-block font-medium text-[var(--accent)]">前往设置</Link></div> : null}
    {configured && !hasCreatorProfile ? <p className="mt-3 rounded-lg bg-[var(--surface-elevated)] p-3 text-xs text-[var(--text-secondary)]">尚未建立个人创作画像，AI 将只使用项目上下文。 <Link href="/settings/creator-profile" className="text-[var(--accent)]">去建立</Link></p> : null}
    {configured && editable ? <div className="mt-4 grid grid-cols-2 gap-2">{actions.map((action) => <Button key={action} variant="secondary" disabled={busy} onClick={() => execute(action)} className={action === "GENERATE_MOTHER_CONTENT" ? "col-span-2" : ""}>{labels[action]}</Button>)}</div> : null}
    {busy ? <p role="status" className="mt-4 text-sm text-[var(--text-secondary)]">AI 正在生成…</p> : null}
    {error ? <p role="alert" className="mt-4 text-sm text-[var(--danger)]">{error}</p> : null}
    {message ? <p role="status" className="mt-4 text-sm text-[var(--success)]">{message}</p> : null}
    {current && output ? <div className="mt-5 border-t pt-5"><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">{labels[current.action]}预览</h3>{current.contextTruncated ? <Badge className="text-[var(--warning)]">上下文已截断</Badge> : null}</div><Preview action={current.action} output={output} selectedEvidence={selectedEvidence} setSelectedEvidence={setSelectedEvidence} />
      <div className="mt-4 grid gap-2">
        {current.action === "EXTRACT_EVIDENCE" ? <Button disabled={busy || !selectedEvidence.length} onClick={() => apply({ selectedIndexes: selectedEvidence })}>添加选中的观点 / 证据</Button> : null}
        {current.action === "GENERATE_BRIEF" ? <Button disabled={busy} onClick={() => apply({ expectedVersion: briefVersion })}>应用到创作简报</Button> : null}
        {current.action === "GENERATE_MOTHER_CONTENT" ? <Button disabled={busy} onClick={() => { const confirmed = !motherHasContent || window.confirm("当前母稿已有内容，确定用 AI Draft 替换吗？"); if (confirmed) void apply({ expectedVersion: motherVersion, confirmReplace: motherHasContent }); }}>应用为母稿</Button> : null}
        {current.action === "GENERATE_ANGLES" ? array(object(output).angles).map((_, index) => <Button key={index} variant="secondary" disabled={busy} onClick={() => apply({ selectedIndex: index, expectedVersion: briefVersion })}>采用这个角度（{index + 1}）</Button>) : null}
        {["REWRITE_SELECTION", "SHORTEN", "EXPAND", "ADD_PERSONAL_VIEW", "HUMANIZE"].includes(current.action) && currentRewrite.current ? <><Button disabled={busy} onClick={() => apply({ expectedVersion: motherVersion, selectionStart: currentRewrite.current!.selectionStart, selectionEnd: currentRewrite.current!.selectionEnd, mode: "REPLACE" })}>替换选中文字</Button><Button variant="secondary" disabled={busy} onClick={() => apply({ expectedVersion: motherVersion, selectionStart: currentRewrite.current!.selectionStart, selectionEnd: currentRewrite.current!.selectionEnd, mode: "INSERT_AFTER" })}>插入下方</Button></> : null}
        <div className="flex gap-2"><Button variant="secondary" disabled={busy} onClick={() => execute(current.action, currentRewrite.current ?? undefined)}>重新生成</Button><Button variant="ghost" disabled={busy} onClick={discard}>放弃</Button></div>
      </div>
    </div> : null}
    <div className="mt-6 border-t pt-4"><h3 className="text-xs font-semibold text-[var(--text-secondary)]">最近 AI 结果</h3><div className="mt-2 grid gap-2">{recentRuns.length ? recentRuns.map((run) => <div key={run.id} className="flex items-center justify-between rounded-lg bg-[var(--surface-elevated)] px-3 py-2 text-xs"><span>{labels[run.action]}</span><span>{run.appliedAt ? "已应用" : run.discardedAt ? "已放弃" : run.status}</span></div>) : <p className="text-xs text-[var(--text-secondary)]">暂无 AI 运行记录</p>}</div></div>
  </section>;
}

function Preview({ action, output, selectedEvidence, setSelectedEvidence }: { action: AIAction; output: unknown; selectedEvidence: number[]; setSelectedEvidence: (value: number[]) => void }) {
  const data = object(output);
  if (action === "EXTRACT_EVIDENCE") return <div className="mt-3 grid gap-2">{array(data.items).map((value, index) => { const item = object(value); return <label key={index} className="flex gap-2 rounded-lg border p-3 text-xs"><input type="checkbox" checked={selectedEvidence.includes(index)} onChange={(event) => setSelectedEvidence(event.target.checked ? [...selectedEvidence, index] : selectedEvidence.filter((itemIndex) => itemIndex !== index))} /><span><strong>{text(item.type)}</strong><br />{text(item.claim) || text(item.excerpt)}</span></label>; })}</div>;
  if (action === "GENERATE_ANGLES") return <div className="mt-3 grid gap-2">{array(data.angles).map((value, index) => { const angle = object(value); return <article key={index} className="rounded-lg border p-3 text-xs"><p className="font-semibold">{index + 1}. {text(angle.title)}</p><p className="mt-2 leading-5">{text(angle.angle)}</p><p className="mt-2 text-[var(--text-secondary)]">{text(angle.whyItWorks)}</p></article>; })}</div>;
  if (action === "GENERATE_BRIEF") return <div className="mt-3 rounded-lg border p-3 text-xs"><p className="font-semibold">{text(data.topic)}</p><p className="mt-2">{text(data.angle)}</p><p className="mt-2 text-[var(--text-secondary)]">{text(data.coreMessage)}</p></div>;
  if (action === "GENERATE_MOTHER_CONTENT") return <div className="mt-3 max-h-80 overflow-auto rounded-lg border p-3 text-xs"><p className="font-semibold">{text(data.title)}</p><p className="mt-3 whitespace-pre-wrap leading-6">{text(data.body)}</p></div>;
  if (["REWRITE_SELECTION", "SHORTEN", "EXPAND", "ADD_PERSONAL_VIEW", "HUMANIZE"].includes(action)) return <div className="mt-3 grid gap-3 text-xs"><div className="rounded-lg bg-[var(--surface-elevated)] p-3"><strong>原文</strong><p className="mt-2 whitespace-pre-wrap">{text(data.original)}</p></div><div className="rounded-lg border p-3"><strong>AI 建议版本</strong><p className="mt-2 whitespace-pre-wrap">{text(data.aiVersion)}</p></div></div>;
  return <div className="mt-3 grid gap-3 text-xs">{["topics", "coreClaims", "facts", "cases", "questions", "hooks", "structures", "risks", "reusableInsights"].map((key) => <div key={key}><p className="font-semibold">{key}</p><ul className="mt-1 list-disc pl-4">{array(data[key]).map((value, index) => <li key={index}>{typeof value === "string" ? value : text(object(value).text)}</li>)}</ul></div>)}</div>;
}

export type { AIAction, RewriteRequest };
